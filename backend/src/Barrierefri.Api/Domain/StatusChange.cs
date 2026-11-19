namespace Barrierefri.Api.Domain;

/// <summary>Audit trail entry. Never updated or deleted once written.</summary>
public class StatusChange
{
    private StatusChange()
    {
    }

    public StatusChange(ReportStatus from, ReportStatus to, string? note, string changedBy, DateTimeOffset changedAt)
    {
        From = from;
        To = to;
        Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        ChangedBy = changedBy;
        ChangedAt = changedAt;
    }

    public int Id { get; private set; }
    public int ReportId { get; private set; }
    public ReportStatus From { get; private set; }
    public ReportStatus To { get; private set; }
    public string? Note { get; private set; }
    public string ChangedBy { get; private set; } = "";
    public DateTimeOffset ChangedAt { get; private set; }
}
