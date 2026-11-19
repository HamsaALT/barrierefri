using System.Security.Claims;
using Barrierefri.Api.Domain;
using Barrierefri.Api.Features.Cases;
using Barrierefri.Api.Features.Reports;
using Barrierefri.Api.Infrastructure;

namespace Barrierefri.UnitTests;

public class GeoMathTests
{
    [Fact]
    public void CopenhagenToAarhusIsAbout157Km()
    {
        var meters = GeoMath.DistanceMeters(55.6761, 12.5683, 56.1629, 10.2039);

        Assert.InRange(meters, 155_000, 159_000);
    }

    [Fact]
    public void SamePointIsZero()
    {
        Assert.Equal(0, GeoMath.DistanceMeters(55.68, 12.57, 55.68, 12.57), 6);
    }

    [Fact]
    public void BoundingBoxContainsPointsJustInsideTheRadius()
    {
        var (minLat, maxLat, minLng, maxLng) = GeoMath.BoundingBox(55.68, 12.57, 30);

        // 29 m north and 29 m east must both be inside the box.
        Assert.InRange(55.68 + 29 / 111_320.0, minLat, maxLat);
        Assert.InRange(12.57 + 29 / (111_320.0 * Math.Cos(55.68 * Math.PI / 180)), minLng, maxLng);
    }
}

public class SlaPolicyTests
{
    [Fact]
    public void EveryCategoryHasATarget()
    {
        foreach (var category in Enum.GetValues<BarrierCategory>())
        {
            Assert.True(SlaPolicy.TargetFor(category) > TimeSpan.Zero);
        }
    }

    [Fact]
    public void BrokenLiftsAreMoreUrgentThanMissingRamps()
    {
        Assert.True(SlaPolicy.TargetFor(BarrierCategory.BrokenElevator) < SlaPolicy.TargetFor(BarrierCategory.MissingRamp));
    }
}

public class PhotoInspectorTests
{
    [Fact]
    public void RecognisesJpegPngAndWebp()
    {
        Assert.Equal("image/jpeg", PhotoInspector.DetectContentType([0xFF, 0xD8, 0xFF, 0xE0]));
        Assert.Equal("image/png", PhotoInspector.DetectContentType([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0]));
        Assert.Equal("image/webp", PhotoInspector.DetectContentType("RIFF\0\0\0\0WEBPVP8 "u8));
    }

    [Fact]
    public void RejectsAnythingElseWhateverItsName()
    {
        Assert.Null(PhotoInspector.DetectContentType("<svg xmlns="u8));
        Assert.Null(PhotoInspector.DetectContentType("%PDF-1.7"u8));
        Assert.Null(PhotoInspector.DetectContentType([]));
    }
}

public class KeycloakRoleClaimsTransformationTests
{
    [Fact]
    public async Task UnpacksRealmRoles()
    {
        var identity = new ClaimsIdentity(
            [new Claim("sub", "u1"), new Claim("realm_access", """{"roles":["citizen","staff"]}""")],
            authenticationType: "Bearer");

        var principal = await new KeycloakRoleClaimsTransformation().TransformAsync(new ClaimsPrincipal(identity));

        Assert.True(principal.IsInRole("staff"));
        Assert.True(principal.IsInRole("citizen"));
        Assert.False(principal.IsInRole("admin"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("""{"roles":"staff"}""")]
    public void BadOrMissingClaimsGiveNoRoles(string? claim)
    {
        Assert.Empty(KeycloakRoleClaimsTransformation.ReadRoles(claim));
    }
}

public class ValidatorTests
{
    private static CreateReportRequest Request(double lat = 55.68, double lng = 12.57, string title = "Lift broken") =>
        new(BarrierCategory.BrokenElevator, title, null, lat, lng, null);

    [Fact]
    public void AcceptsAReportInCopenhagen()
    {
        Assert.True(new CreateReportValidator().Validate(Request()).IsValid);
    }

    [Theory]
    [InlineData(0, 0)]
    [InlineData(59.33, 18.07)] // Stockholm
    public void RejectsLocationsOutsideDenmark(double lat, double lng)
    {
        var result = new CreateReportValidator().Validate(Request(lat, lng));

        Assert.Contains(result.Errors, e => e.ErrorMessage == "The location must be in Denmark.");
    }

    [Fact]
    public void RequiresATitle()
    {
        Assert.False(new CreateReportValidator().Validate(Request(title: " ")).IsValid);
    }

    [Fact]
    public void RejectingNeedsAnExplanation()
    {
        var validator = new StatusChangeValidator();

        Assert.False(validator.Validate(new StatusChangeRequest(ReportStatus.Rejected, null)).IsValid);
        Assert.True(validator.Validate(new StatusChangeRequest(ReportStatus.Rejected, "Not a public area")).IsValid);
        Assert.True(validator.Validate(new StatusChangeRequest(ReportStatus.Resolved, null)).IsValid);
    }
}
