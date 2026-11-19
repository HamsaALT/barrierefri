using Barrierefri.Api.Data;
using Barrierefri.Api.Domain;
using Barrierefri.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace Barrierefri.Api.Features.Reports;

public class ReportService(AppDbContext db, IPhotoStore photos, TimeProvider clock)
{
    /// <summary>Two reports of the same kind closer than this are probably the same barrier.</summary>
    public const int DuplicateRadiusMeters = 30;

    private const int MapLimit = 500;

    public async Task<List<Report>> InAreaAsync(double minLat, double minLng, double maxLat, double maxLng,
        bool includeClosed, BarrierCategory? category, CancellationToken ct)
    {
        var query = db.Reports.AsNoTracking()
            .Where(r => r.Latitude >= minLat && r.Latitude <= maxLat && r.Longitude >= minLng && r.Longitude <= maxLng);
        if (!includeClosed)
        {
            query = query.Where(r => r.Status == ReportStatus.Open || r.Status == ReportStatus.InProgress);
        }
        if (category is not null)
        {
            query = query.Where(r => r.Category == category);
        }
        return await query.OrderByDescending(r => r.ReportedAt).Take(MapLimit).ToListAsync(ct);
    }

    /// <summary>
    /// Active reports within <paramref name="radiusMeters"/>. The bounding box lets
    /// PostgreSQL use the lat/lng index, then the haversine formula does the exact cut.
    /// </summary>
    public async Task<List<NearbyReport>> NearbyAsync(double lat, double lng, int radiusMeters,
        BarrierCategory? category, CancellationToken ct)
    {
        var (minLat, maxLat, minLng, maxLng) = GeoMath.BoundingBox(lat, lng, radiusMeters);
        var query = db.Reports.FromSql($"""
            SELECT * FROM reports
            WHERE latitude BETWEEN {minLat} AND {maxLat}
              AND longitude BETWEEN {minLng} AND {maxLng}
              AND status IN ('Open', 'InProgress')
              AND 2 * 6371000 * asin(sqrt(
                    power(sin(radians(latitude - {lat}) / 2), 2)
                  + cos(radians({lat})) * cos(radians(latitude)) * power(sin(radians(longitude - {lng}) / 2), 2)
                  )) <= {radiusMeters}
            """).AsNoTracking();
        if (category is not null)
        {
            query = query.Where(r => r.Category == category);
        }

        var reports = await query.ToListAsync(ct);
        return reports
            .Select(r => new NearbyReport(r.Id, r.Category, r.Title, r.Status,
                (int)Math.Round(GeoMath.DistanceMeters(lat, lng, r.Latitude, r.Longitude))))
            .OrderBy(r => r.DistanceMeters)
            .ToList();
    }

    public async Task<Report> GetAsync(int id, CancellationToken ct) =>
        await db.Reports.Include(r => r.History).Include(r => r.Votes).AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Id == id, ct)
        ?? throw new NotFoundException($"Report {id} not found.");

    public async Task<List<Report>> ByReporterAsync(string userId, CancellationToken ct) =>
        await db.Reports.AsNoTracking()
            .Where(r => r.ReportedBy == userId)
            .OrderByDescending(r => r.ReportedAt)
            .ToListAsync(ct);

    /// <summary>
    /// Returns the new report, or the existing ones nearby if it looks like a duplicate
    /// and the user hasn't said it's a different barrier.
    /// </summary>
    public async Task<(Report? Created, List<NearbyReport> Nearby)> CreateAsync(
        string userId, CreateReportRequest request, CancellationToken ct)
    {
        if (!request.IgnoreNearby)
        {
            var nearby = await NearbyAsync(request.Latitude, request.Longitude, DuplicateRadiusMeters,
                request.Category, ct);
            if (nearby.Count > 0)
            {
                return (null, nearby);
            }
        }

        var report = new Report(request.Category, request.Title, request.Description, request.Latitude,
            request.Longitude, request.LocationHint, userId, clock.GetUtcNow());
        db.Reports.Add(report);
        await db.SaveChangesAsync(ct);
        return (report, []);
    }

    public async Task<Report> VoteAsync(int id, string userId, VoteKind kind, CancellationToken ct)
    {
        var report = await GetAsync(id, ct);
        report.CastVote(userId, kind, clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
        return report;
    }

    public async Task<Report> RemoveVoteAsync(int id, string userId, CancellationToken ct)
    {
        var report = await GetAsync(id, ct);
        report.RemoveVote(userId);
        await db.SaveChangesAsync(ct);
        return report;
    }

    public async Task AttachPhotoAsync(int id, string userId, bool isCaseWorker, Stream content,
        string contentType, CancellationToken ct)
    {
        var report = await GetAsync(id, ct);
        if (report.ReportedBy != userId && !isCaseWorker)
        {
            throw new ForbiddenException("PHOTO_NOT_YOURS", "Only the person who reported this can add a photo.");
        }
        var blobName = await photos.SaveAsync(id, content, contentType, ct);
        report.AttachPhoto(blobName);
        await db.SaveChangesAsync(ct);
    }

    public async Task<StoredPhoto?> OpenPhotoAsync(int id, CancellationToken ct)
    {
        var blobName = await db.Reports.Where(r => r.Id == id).Select(r => r.PhotoBlobName).FirstOrDefaultAsync(ct);
        return blobName is null ? null : await photos.OpenAsync(blobName, ct);
    }
}
