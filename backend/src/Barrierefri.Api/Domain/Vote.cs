namespace Barrierefri.Api.Domain;

public class Vote
{
    private Vote()
    {
    }

    public Vote(string userId, VoteKind kind, DateTimeOffset castAt)
    {
        UserId = userId;
        Kind = kind;
        CastAt = castAt;
    }

    public int Id { get; private set; }
    public int ReportId { get; private set; }
    public string UserId { get; private set; } = "";
    public VoteKind Kind { get; private set; }
    public DateTimeOffset CastAt { get; private set; }

    public void Change(VoteKind kind, DateTimeOffset now)
    {
        Kind = kind;
        CastAt = now;
    }
}
