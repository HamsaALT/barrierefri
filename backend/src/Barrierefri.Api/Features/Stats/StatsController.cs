using Barrierefri.Api.Data;
using Barrierefri.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Barrierefri.Api.Features.Stats;

[ApiController]
[Route("api/stats")]
[AllowAnonymous]
public class StatsController(AppDbContext db, TimeProvider clock) : ControllerBase
{
    /// <summary>Headline numbers for the front page. Public on purpose: transparency is part of the point.</summary>
    [HttpGet]
    public async Task<PublicStats> Get(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var since = now.AddDays(-90);

        int active = await db.Reports.CountAsync(
            r => r.Status == ReportStatus.Open || r.Status == ReportStatus.InProgress, ct);
        int overdue = await db.Reports.CountAsync(
            r => (r.Status == ReportStatus.Open || r.Status == ReportStatus.InProgress) && r.DueAt < now, ct);

        var resolved = await db.Reports
            .Where(r => r.Status == ReportStatus.Resolved && r.ResolvedAt >= since)
            .Select(r => new { r.ReportedAt, r.ResolvedAt })
            .ToListAsync(ct);

        double? medianDays = Median(resolved.Select(r => (r.ResolvedAt!.Value - r.ReportedAt).TotalDays).ToList());
        return new PublicStats(active, overdue, resolved.Count,
            medianDays is null ? null : Math.Round(medianDays.Value, 1));
    }

    private static double? Median(List<double> values)
    {
        if (values.Count == 0)
        {
            return null;
        }
        values.Sort();
        int mid = values.Count / 2;
        return values.Count % 2 == 1 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    }
}

public record PublicStats(int ActiveReports, int OverdueReports, int ResolvedLast90Days, double? MedianDaysToResolve);
