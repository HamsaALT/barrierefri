namespace Barrierefri.Api.Domain;

public static class GeoMath
{
    private const double EarthRadiusMeters = 6_371_000;

    /// <summary>Great-circle distance. Accurate to well under a metre at city scale.</summary>
    public static double DistanceMeters(double lat1, double lng1, double lat2, double lng2)
    {
        double dLat = ToRadians(lat2 - lat1);
        double dLng = ToRadians(lng2 - lng1);
        double a = Math.Pow(Math.Sin(dLat / 2), 2)
                 + Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) * Math.Pow(Math.Sin(dLng / 2), 2);
        return 2 * EarthRadiusMeters * Math.Asin(Math.Sqrt(a));
    }

    /// <summary>
    /// A lat/lng box that contains the circle. Used to let the database index do
    /// the rough filtering before the exact distance check.
    /// </summary>
    public static (double MinLat, double MaxLat, double MinLng, double MaxLng) BoundingBox(
        double lat, double lng, double radiusMeters)
    {
        double dLat = radiusMeters / EarthRadiusMeters * (180 / Math.PI);
        double dLng = dLat / Math.Cos(ToRadians(lat));
        return (lat - dLat, lat + dLat, lng - dLng, lng + dLng);
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180;
}
