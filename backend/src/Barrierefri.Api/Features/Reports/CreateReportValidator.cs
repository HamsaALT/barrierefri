using FluentValidation;

namespace Barrierefri.Api.Features.Reports;

public class CreateReportValidator : AbstractValidator<CreateReportRequest>
{
    // Rough box around Denmark, Bornholm included. Stops reports landing in the sea
    // off Africa because someone's GPS returned 0,0.
    public const double MinLatitude = 54.4;
    public const double MaxLatitude = 57.9;
    public const double MinLongitude = 7.8;
    public const double MaxLongitude = 15.3;

    public CreateReportValidator()
    {
        RuleFor(r => r.Category).IsInEnum();
        RuleFor(r => r.Title)
            .NotEmpty().WithMessage("Give the report a short title.")
            .MaximumLength(100);
        RuleFor(r => r.Description).MaximumLength(1000);
        RuleFor(r => r.LocationHint).MaximumLength(200);
        RuleFor(r => r.Latitude)
            .InclusiveBetween(MinLatitude, MaxLatitude)
            .WithMessage("The location must be in Denmark.");
        RuleFor(r => r.Longitude)
            .InclusiveBetween(MinLongitude, MaxLongitude)
            .WithMessage("The location must be in Denmark.");
    }
}

public class VoteRequestValidator : AbstractValidator<VoteRequest>
{
    public VoteRequestValidator()
    {
        RuleFor(v => v.Kind).IsInEnum();
    }
}
