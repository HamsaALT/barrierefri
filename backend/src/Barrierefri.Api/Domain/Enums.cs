namespace Barrierefri.Api.Domain;

public enum BarrierCategory
{
    BrokenElevator,
    BlockedSidewalk,
    MissingRamp,
    SteepCurb,
    MissingAudioSignal,
    InaccessibleEntrance,
    Other,
}

public enum ReportStatus
{
    Open,
    InProgress,
    Resolved,
    Rejected,
}

public enum VoteKind
{
    StillThere,
    Fixed,
}
