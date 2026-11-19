using Barrierefri.Api.Domain;

namespace Barrierefri.Api.Features.Reports;

public record CreateReportRequest(
    BarrierCategory Category,
    string Title,
    string? Description,
    double Latitude,
    double Longitude,
    string? LocationHint,
    bool IgnoreNearby = false);

public record VoteRequest(VoteKind Kind);

public record ReportSummary(
    int Id,
    BarrierCategory Category,
    string Title,
    double Latitude,
    double Longitude,
    string? LocationHint,
    ReportStatus Status,
    DateTimeOffset ReportedAt,
    double Confidence,
    bool LikelyFixed,
    bool HasPhoto)
{
    public static ReportSummary From(Report r) => new(r.Id, r.Category, r.Title, r.Latitude, r.Longitude,
        r.LocationHint, r.Status, r.ReportedAt, Math.Round(r.Confidence, 2), r.LikelyFixed, r.PhotoBlobName is not null);
}

public record HistoryEntry(ReportStatus From, ReportStatus To, string? Note, DateTimeOffset ChangedAt);

/// <summary>Public view of a report. Who reported or changed it is deliberately left out.</summary>
public record ReportDetail(
    int Id,
    BarrierCategory Category,
    string Title,
    string? Description,
    double Latitude,
    double Longitude,
    string? LocationHint,
    ReportStatus Status,
    string? Responsible,
    DateTimeOffset ReportedAt,
    DateTimeOffset DueAt,
    DateTimeOffset? ResolvedAt,
    bool IsOverdue,
    int StillThereCount,
    int FixedCount,
    double Confidence,
    bool LikelyFixed,
    bool HasPhoto,
    bool IsMine,
    VoteKind? MyVote,
    IReadOnlyList<HistoryEntry> History)
{
    public static ReportDetail From(Report r, string? viewerId, DateTimeOffset now) => new(
        r.Id, r.Category, r.Title, r.Description, r.Latitude, r.Longitude, r.LocationHint, r.Status,
        r.Responsible, r.ReportedAt, r.DueAt, r.ResolvedAt, r.IsOverdue(now),
        r.StillThereCount, r.FixedCount, Math.Round(r.Confidence, 2), r.LikelyFixed,
        r.PhotoBlobName is not null,
        viewerId is not null && r.ReportedBy == viewerId,
        r.Votes.FirstOrDefault(v => v.UserId == viewerId)?.Kind,
        r.History.OrderBy(h => h.ChangedAt).Select(h => new HistoryEntry(h.From, h.To, h.Note, h.ChangedAt)).ToList());
}

public record NearbyReport(int Id, BarrierCategory Category, string Title, ReportStatus Status, int DistanceMeters);
