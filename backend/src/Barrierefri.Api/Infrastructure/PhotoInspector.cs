namespace Barrierefri.Api.Infrastructure;

/// <summary>
/// Works out what an uploaded file really is from its first bytes. The browser's
/// Content-Type header is whatever the client says it is, so it can't be trusted.
/// </summary>
public static class PhotoInspector
{
    public const long MaxBytes = 5 * 1024 * 1024;

    public static string? DetectContentType(ReadOnlySpan<byte> header)
    {
        if (header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return "image/jpeg";
        }
        if (header.Length >= 8 && header[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
        {
            return "image/png";
        }
        if (header.Length >= 12 && header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8))
        {
            return "image/webp";
        }
        return null;
    }

    public static string ExtensionFor(string contentType) => contentType switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        _ => throw new ArgumentException($"Unsupported content type {contentType}", nameof(contentType)),
    };
}
