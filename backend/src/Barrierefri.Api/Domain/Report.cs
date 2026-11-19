namespace Barrierefri.Api.Domain;

public class Report
{
    // Which status changes make sense. Resolved and Rejected can be reopened,
    // because the people who live with the barrier are often the first to know
    // that a "fix" didn't work.
    private static readonly Dictionary<ReportStatus, ReportStatus[]> AllowedTransitions = new()
    {
        [ReportStatus.Open] = [ReportStatus.InProgress, ReportStatus.Resolved, ReportStatus.Rejected],
        [ReportStatus.InProgress] = [ReportStatus.Open, ReportStatus.Resolved, ReportStatus.Rejected],
        [ReportStatus.Resolved] = [ReportStatus.Open],
        [ReportStatus.Rejected] = [ReportStatus.Open],
    };

    private readonly List<StatusChange> _history = [];
    private readonly List<Vote> _votes = [];

    private Report()
    {
    }

    public Report(BarrierCategory category, string title, string? description, double latitude, double longitude,
        string? locationHint, string reportedBy, DateTimeOffset now)
    {
        Category = category;
        Title = title.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        Latitude = latitude;
        Longitude = longitude;
        LocationHint = string.IsNullOrWhiteSpace(locationHint) ? null : locationHint.Trim();
        ReportedBy = reportedBy;
        ReportedAt = now;
        DueAt = now + SlaPolicy.TargetFor(category);
        Status = ReportStatus.Open;
    }

    public int Id { get; private set; }
    public BarrierCategory Category { get; private set; }
    public string Title { get; private set; } = "";
    public string? Description { get; private set; }
    public double Latitude { get; private set; }
    public double Longitude { get; private set; }
    public string? LocationHint { get; private set; }
    public ReportStatus Status { get; private set; }
    public string ReportedBy { get; private set; } = "";
    public DateTimeOffset ReportedAt { get; private set; }
    public DateTimeOffset DueAt { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }
    public string? Responsible { get; private set; }
    public string? PhotoBlobName { get; private set; }
    public int StillThereCount { get; private set; }
    public int FixedCount { get; private set; }

    public IReadOnlyList<StatusChange> History => _history;
    public IReadOnlyList<Vote> Votes => _votes;

    public bool IsActive => Status is ReportStatus.Open or ReportStatus.InProgress;

    public bool IsOverdue(DateTimeOffset now) => IsActive && now > DueAt;

    /// <summary>
    /// How sure we are the barrier is still there, between 0 and 1. Starts at 2/3
    /// for a fresh report (the reporter counts as one "still there") and moves with
    /// every vote. The +1/+2 smoothing stops one vote from swinging it to 0 or 1.
    /// </summary>
    public double Confidence => (StillThereCount + 2.0) / (StillThereCount + FixedCount + 3.0);

    /// <summary>Several people say it's fixed and they outnumber those who say it isn't.</summary>
    public bool LikelyFixed => IsActive && FixedCount >= 3 && FixedCount > StillThereCount;

    public void ChangeStatus(ReportStatus next, string? note, string changedBy, DateTimeOffset now)
    {
        if (next == Status)
        {
            throw new DomainException("STATUS_UNCHANGED", $"The report is already {Describe(Status)}.",
                new Dictionary<string, object> { ["status"] = Status.ToString() });
        }
        if (!AllowedTransitions[Status].Contains(next))
        {
            throw new DomainException("STATUS_TRANSITION_INVALID",
                $"A report that is {Describe(Status)} can't be set to {Describe(next)}.",
                new Dictionary<string, object> { ["from"] = Status.ToString(), ["to"] = next.ToString() });
        }

        _history.Add(new StatusChange(Status, next, note, changedBy, now));
        Status = next;

        if (next == ReportStatus.Resolved)
        {
            ResolvedAt = now;
        }
        else if (next == ReportStatus.Open)
        {
            // Reopened: votes from before the "fix" no longer say anything useful.
            ResolvedAt = null;
            DueAt = now + SlaPolicy.TargetFor(Category);
            _votes.Clear();
            StillThereCount = 0;
            FixedCount = 0;
        }
    }

    public void AssignTo(string? responsible)
    {
        Responsible = string.IsNullOrWhiteSpace(responsible) ? null : responsible.Trim();
    }

    public void AttachPhoto(string blobName)
    {
        PhotoBlobName = blobName;
    }

    /// <summary>One vote per person; voting again replaces the earlier vote.</summary>
    public void CastVote(string userId, VoteKind kind, DateTimeOffset now)
    {
        if (!IsActive)
        {
            throw new DomainException("REPORT_CLOSED", "Only open reports can be confirmed.");
        }
        // The report itself is already counted as one "still there" in Confidence.
        if (userId == ReportedBy && kind == VoteKind.StillThere)
        {
            throw new DomainException("OWN_REPORT", "You reported this, so it already counts as confirmed.");
        }

        var existing = _votes.FirstOrDefault(v => v.UserId == userId);
        if (existing is null)
        {
            _votes.Add(new Vote(userId, kind, now));
        }
        else
        {
            existing.Change(kind, now);
        }
        Recount();
    }

    public void RemoveVote(string userId)
    {
        _votes.RemoveAll(v => v.UserId == userId);
        Recount();
    }

    private void Recount()
    {
        StillThereCount = _votes.Count(v => v.Kind == VoteKind.StillThere);
        FixedCount = _votes.Count(v => v.Kind == VoteKind.Fixed);
    }

    private static string Describe(ReportStatus status) => status switch
    {
        ReportStatus.InProgress => "in progress",
        _ => status.ToString().ToLowerInvariant(),
    };
}
