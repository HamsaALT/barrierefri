using Barrierefri.Api.Domain;
using Barrierefri.Api.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Barrierefri.Api.Features.Reports;

[ApiController]
[Route("api/reports")]
public class ReportsController(ReportService reports, TimeProvider clock) : ControllerBase
{
    /// <summary>Reports inside the visible map area. Public, so anyone can check a route before leaving home.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ReportSummary>>> InArea(
        [FromQuery] double minLat, [FromQuery] double minLng, [FromQuery] double maxLat, [FromQuery] double maxLng,
        [FromQuery] bool includeClosed = false, [FromQuery] BarrierCategory? category = null,
        CancellationToken ct = default)
    {
        if (minLat >= maxLat || minLng >= maxLng)
        {
            return BadInput("AREA_INVALID", "The area must have a south-west corner below and left of its north-east corner.");
        }
        var found = await reports.InAreaAsync(minLat, minLng, maxLat, maxLng, includeClosed, category, ct);
        return Ok(found.Select(ReportSummary.From));
    }

    /// <summary>Used while filling in a new report, to suggest confirming an existing one instead.</summary>
    [HttpGet("nearby")]
    [AllowAnonymous]
    public async Task<IEnumerable<NearbyReport>> Nearby([FromQuery] double lat, [FromQuery] double lng,
        [FromQuery] BarrierCategory? category = null, CancellationToken ct = default) =>
        await reports.NearbyAsync(lat, lng, ReportService.DuplicateRadiusMeters, category, ct);

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ReportDetail> Get(int id, CancellationToken ct) =>
        ReportDetail.From(await reports.GetAsync(id, ct), User.UserIdOrNull(), clock.GetUtcNow());

    [HttpGet("mine")]
    [Authorize]
    public async Task<IEnumerable<ReportSummary>> Mine(CancellationToken ct) =>
        (await reports.ByReporterAsync(User.UserId(), ct)).Select(ReportSummary.From);

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create(CreateReportRequest request, CancellationToken ct)
    {
        var (created, nearby) = await reports.CreateAsync(User.UserId(), request, ct);
        if (created is null)
        {
            var problem = new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Possible duplicate",
                Type = "about:blank",
                Detail = "This barrier may already be reported. Confirm the existing report instead, or send yours anyway if it's a different one.",
            };
            problem.Extensions["code"] = "POSSIBLE_DUPLICATE";
            problem.Extensions["nearby"] = nearby;
            return Conflict(problem);
        }
        return CreatedAtAction(nameof(Get), new { id = created.Id },
            ReportDetail.From(created, User.UserId(), clock.GetUtcNow()));
    }

    [HttpPut("{id:int}/vote")]
    [Authorize]
    public async Task<ReportDetail> Vote(int id, VoteRequest request, CancellationToken ct)
    {
        var report = await reports.VoteAsync(id, User.UserId(), request.Kind, ct);
        return ReportDetail.From(report, User.UserId(), clock.GetUtcNow());
    }

    [HttpDelete("{id:int}/vote")]
    [Authorize]
    public async Task<ReportDetail> RemoveVote(int id, CancellationToken ct)
    {
        var report = await reports.RemoveVoteAsync(id, User.UserId(), ct);
        return ReportDetail.From(report, User.UserId(), clock.GetUtcNow());
    }

    [HttpPost("{id:int}/photo")]
    [Authorize]
    [RequestSizeLimit(PhotoInspector.MaxBytes + 64 * 1024)]
    public async Task<IActionResult> UploadPhoto(int id, IFormFile? photo, CancellationToken ct)
    {
        if (photo is null || photo.Length == 0)
        {
            return BadInput("PHOTO_MISSING", "Choose a photo to upload.");
        }
        if (photo.Length > PhotoInspector.MaxBytes)
        {
            return BadInput("PHOTO_TOO_LARGE", "The photo must be 5 MB or smaller.");
        }

        await using var stream = photo.OpenReadStream();
        var header = new byte[12];
        var read = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, ct);
        var contentType = PhotoInspector.DetectContentType(header.AsSpan(0, read));
        if (contentType is null)
        {
            return BadInput("PHOTO_TYPE", "Only JPEG, PNG and WebP photos are supported.");
        }
        stream.Position = 0;

        await reports.AttachPhotoAsync(id, User.UserId(), User.IsInRole(Roles.Staff) || User.IsInRole(Roles.Admin), stream, contentType, ct);
        return NoContent();
    }

    [HttpGet("{id:int}/photo")]
    [AllowAnonymous]
    public async Task<IActionResult> Photo(int id, CancellationToken ct)
    {
        var photo = await reports.OpenPhotoAsync(id, ct);
        return photo is null ? NotFound() : File(photo.Content, photo.ContentType);
    }

    private BadRequestObjectResult BadInput(string code, string message)
    {
        var problem = new ValidationProblemDetails(new Dictionary<string, string[]> { [""] = [message] })
        {
            Status = StatusCodes.Status400BadRequest,
            Detail = message,
        };
        problem.Extensions["code"] = code;
        return BadRequest(problem);
    }
}
