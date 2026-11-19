namespace Barrierefri.Api.Domain;

/// <summary>
/// How quickly each kind of barrier should be dealt with. A broken lift can cut
/// someone off from a whole station, so it gets days; a missing ramp usually needs
/// construction work, so it gets months.
/// </summary>
public static class SlaPolicy
{
    private static readonly Dictionary<BarrierCategory, TimeSpan> Targets = new()
    {
        [BarrierCategory.BrokenElevator] = TimeSpan.FromDays(2),
        [BarrierCategory.BlockedSidewalk] = TimeSpan.FromDays(3),
        [BarrierCategory.MissingAudioSignal] = TimeSpan.FromDays(7),
        [BarrierCategory.Other] = TimeSpan.FromDays(30),
        [BarrierCategory.InaccessibleEntrance] = TimeSpan.FromDays(60),
        [BarrierCategory.SteepCurb] = TimeSpan.FromDays(90),
        [BarrierCategory.MissingRamp] = TimeSpan.FromDays(90),
    };

    public static TimeSpan TargetFor(BarrierCategory category) => Targets[category];
}
