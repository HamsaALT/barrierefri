using Barrierefri.Api.Data;
using Barrierefri.Api.Domain;
using Barrierefri.Api.Features.Reports;
using Barrierefri.Api.Infrastructure;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Barrierefri.Api.Features.Cases;

/// <summary>The work queue for municipal and operator staff.</summary>
[ApiController]
[Route("api/cases")]
[Authorize(Policy = Policies.CaseWorker)]
public class CasesController(AppDbContext db, ReportService reports, TimeProvider clock) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<CaseRow>> Queue([FromQuery] ReportStatus? status = null,
        [FromQuery] bool overdueOnly = false, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow();
        var query = db.Reports.AsNoTracking();
        query = status is null
            ? query.Where(r => r.Status == ReportStatus.Open || r.Status == ReportStatus.InProgress)
            : query.Where(r => r.Status == status);
        if (overdueOnly)
        {
            query = query.Where(r => r.DueAt < now
                && (r.Status == ReportStatus.Open || r.Status == ReportStatus.InProgress));
        }

        var rows = await query.OrderBy(r => r.DueAt).Take(500).ToListAsync(ct);
        // Overdue first (most overdue at the top), then whatever is due soonest.
        return rows.Select(r => CaseRow.From(r, now));
    }

    [HttpPost("{id:int}/status")]
    public async Task<ReportDetail> ChangeStatus(int id, StatusChangeRequest request, CancellationToken ct)
    {
        var report = await reports.GetAsync(id, ct);
        report.ChangeStatus(request.Status, request.Note, User.DisplayName(), clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        return ReportDetail.From(report, User.UserId(), clock.GetUtcNow());
    }

    [HttpPut("{id:int}/responsible")]
    public async Task<ReportDetail> Assign(int id, AssignRequest request, CancellationToken ct)
    {
        var report = await reports.GetAsync(id, ct);
        report.AssignTo(request.Responsible);
        await db.SaveChangesAsync(ct);
        return ReportDetail.From(report, User.UserId(), clock.GetUtcNow());
    }
}

public record CaseRow(
    int Id,
    BarrierCategory Category,
    string Title,
    string? LocationHint,
    ReportStatus Status,
    string? Responsible,
    DateTimeOffset ReportedAt,
    DateTimeOffset DueAt,
    bool IsOverdue,
    int StillThereCount,
    int FixedCount,
    double Confidence,
    bool LikelyFixed)
{
    public static CaseRow From(Report r, DateTimeOffset now) => new(r.Id, r.Category, r.Title, r.LocationHint,
        r.Status, r.Responsible, r.ReportedAt, r.DueAt, r.IsOverdue(now), r.StillThereCount, r.FixedCount,
        Math.Round(r.Confidence, 2), r.LikelyFixed);
}

public record StatusChangeRequest(ReportStatus Status, string? Note);

public record AssignRequest(string? Responsible);

public class StatusChangeValidator : AbstractValidator<StatusChangeRequest>
{
    public StatusChangeValidator()
    {
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.Note).MaximumLength(500);
        // The person who reported it deserves to know why.
        RuleFor(r => r.Note)
            .NotEmpty()
            .When(r => r.Status == ReportStatus.Rejected)
            .WithMessage("Explain why the report is rejected.");
    }
}

public class AssignValidator : AbstractValidator<AssignRequest>
{
    public AssignValidator()
    {
        RuleFor(r => r.Responsible).MaximumLength(100);
    }
}
