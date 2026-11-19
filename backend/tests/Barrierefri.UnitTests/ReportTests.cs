using Barrierefri.Api.Domain;

namespace Barrierefri.UnitTests;

public class ReportTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 18, 12, 0, 0, TimeSpan.Zero);

    private static Report NewReport(BarrierCategory category = BarrierCategory.BrokenElevator) =>
        new(category, "  Lift broken  ", "", 55.68, 12.57, null, "reporter", Now);

    [Fact]
    public void NewReportIsOpenAndDueAccordingToItsCategory()
    {
        var report = NewReport(BarrierCategory.BrokenElevator);

        Assert.Equal(ReportStatus.Open, report.Status);
        Assert.Equal(Now.AddDays(2), report.DueAt);
        Assert.Equal("Lift broken", report.Title);
        Assert.Null(report.Description);
    }

    [Fact]
    public void BecomesOverdueOnlyWhileActive()
    {
        var report = NewReport();

        Assert.False(report.IsOverdue(Now.AddDays(1)));
        Assert.True(report.IsOverdue(Now.AddDays(3)));

        report.ChangeStatus(ReportStatus.Resolved, null, "staff", Now.AddDays(3));
        Assert.False(report.IsOverdue(Now.AddDays(10)));
    }

    [Fact]
    public void ResolvingRecordsTimeAndHistory()
    {
        var report = NewReport();

        report.ChangeStatus(ReportStatus.InProgress, "Sent to DSB", "sara", Now.AddHours(1));
        report.ChangeStatus(ReportStatus.Resolved, "Fixed", "sara", Now.AddHours(20));

        Assert.Equal(Now.AddHours(20), report.ResolvedAt);
        Assert.Collection(report.History,
            h => Assert.Equal((ReportStatus.Open, ReportStatus.InProgress), (h.From, h.To)),
            h => Assert.Equal((ReportStatus.InProgress, ReportStatus.Resolved), (h.From, h.To)));
    }

    [Theory]
    [InlineData(ReportStatus.Resolved, ReportStatus.InProgress)]
    [InlineData(ReportStatus.Rejected, ReportStatus.Resolved)]
    public void RejectsTransitionsThatSkipReopening(ReportStatus closedAs, ReportStatus next)
    {
        var report = NewReport();
        report.ChangeStatus(closedAs, "note", "sara", Now);

        var error = Assert.Throws<DomainException>(() => report.ChangeStatus(next, null, "sara", Now));
        Assert.Contains("can't be set to", error.Message);
    }

    [Fact]
    public void RejectsSettingTheSameStatus()
    {
        var report = NewReport();

        Assert.Throws<DomainException>(() => report.ChangeStatus(ReportStatus.Open, null, "sara", Now));
    }

    [Fact]
    public void ReopeningResetsVotesAndTheDeadline()
    {
        var report = NewReport();
        report.CastVote("a", VoteKind.Fixed, Now);
        report.ChangeStatus(ReportStatus.Resolved, null, "sara", Now.AddDays(1));

        report.ChangeStatus(ReportStatus.Open, "Broken again", "sara", Now.AddDays(5));

        Assert.Null(report.ResolvedAt);
        Assert.Equal(Now.AddDays(7), report.DueAt);
        Assert.Empty(report.Votes);
        Assert.Equal(0, report.FixedCount);
    }

    [Fact]
    public void VotingAgainReplacesTheEarlierVote()
    {
        var report = NewReport();

        report.CastVote("user-1", VoteKind.StillThere, Now);
        report.CastVote("user-1", VoteKind.Fixed, Now.AddHours(2));

        Assert.Single(report.Votes);
        Assert.Equal(0, report.StillThereCount);
        Assert.Equal(1, report.FixedCount);
    }

    [Fact]
    public void RemovingAVoteUpdatesTheCounts()
    {
        var report = NewReport();
        report.CastVote("user-1", VoteKind.StillThere, Now);

        report.RemoveVote("user-1");

        Assert.Equal(0, report.StillThereCount);
    }

    [Fact]
    public void ReporterCanSayItIsFixedButNotConfirmTheirOwnReport()
    {
        var report = NewReport();

        Assert.Throws<DomainException>(() => report.CastVote("reporter", VoteKind.StillThere, Now));
        report.CastVote("reporter", VoteKind.Fixed, Now);
        Assert.Equal(1, report.FixedCount);
    }

    [Fact]
    public void ClosedReportsCannotBeVotedOn()
    {
        var report = NewReport();
        report.ChangeStatus(ReportStatus.Resolved, null, "sara", Now);

        Assert.Throws<DomainException>(() => report.CastVote("user-1", VoteKind.Fixed, Now));
    }

    [Fact]
    public void ConfidenceStartsAtTwoThirdsAndFollowsTheVotes()
    {
        var report = NewReport();
        Assert.Equal(2.0 / 3, report.Confidence, 3);

        report.CastVote("a", VoteKind.StillThere, Now);
        report.CastVote("b", VoteKind.StillThere, Now);
        Assert.Equal(0.8, report.Confidence, 3);

        report.CastVote("c", VoteKind.Fixed, Now);
        report.CastVote("d", VoteKind.Fixed, Now);
        report.CastVote("e", VoteKind.Fixed, Now);
        Assert.Equal(0.5, report.Confidence, 3);
    }

    [Fact]
    public void LikelyFixedNeedsSeveralFixedVotesThatOutnumberTheRest()
    {
        var report = NewReport();
        report.CastVote("a", VoteKind.Fixed, Now);
        report.CastVote("b", VoteKind.Fixed, Now);
        Assert.False(report.LikelyFixed);

        report.CastVote("c", VoteKind.Fixed, Now);
        Assert.True(report.LikelyFixed);

        report.CastVote("d", VoteKind.StillThere, Now);
        report.CastVote("e", VoteKind.StillThere, Now);
        report.CastVote("f", VoteKind.StillThere, Now);
        Assert.False(report.LikelyFixed);
    }

    [Fact]
    public void AssigningBlankClearsTheResponsible()
    {
        var report = NewReport();
        report.AssignTo(" DSB ");
        Assert.Equal("DSB", report.Responsible);

        report.AssignTo("  ");
        Assert.Null(report.Responsible);
    }
}
