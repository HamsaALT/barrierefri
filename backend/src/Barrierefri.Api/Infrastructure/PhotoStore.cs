using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Barrierefri.Api.Infrastructure;

public interface IPhotoStore
{
    Task<string> SaveAsync(int reportId, Stream content, string contentType, CancellationToken ct);

    Task<StoredPhoto?> OpenAsync(string blobName, CancellationToken ct);
}

public record StoredPhoto(Stream Content, string ContentType);

/// <summary>
/// Photos go to Azure Blob Storage. Locally and in tests that's Azurite, the
/// official emulator, so the same code runs everywhere.
/// </summary>
public class BlobPhotoStore(BlobServiceClient blobService, IConfiguration config) : IPhotoStore
{
    private readonly BlobContainerClient _container =
        blobService.GetBlobContainerClient(config["Storage:PhotoContainer"] ?? "report-photos");

    private bool _containerReady;

    public async Task<string> SaveAsync(int reportId, Stream content, string contentType, CancellationToken ct)
    {
        await EnsureContainerAsync(ct);
        var extension = PhotoInspector.ExtensionFor(contentType);
        var blobName = $"reports/{reportId}/{Guid.NewGuid():N}{extension}";
        await _container.GetBlobClient(blobName).UploadAsync(content,
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } }, ct);
        return blobName;
    }

    public async Task<StoredPhoto?> OpenAsync(string blobName, CancellationToken ct)
    {
        try
        {
            var result = await _container.GetBlobClient(blobName).DownloadStreamingAsync(cancellationToken: ct);
            return new StoredPhoto(result.Value.Content, result.Value.Details.ContentType);
        }
        catch (RequestFailedException e) when (e.Status == 404)
        {
            return null;
        }
    }

    private async Task EnsureContainerAsync(CancellationToken ct)
    {
        if (_containerReady)
        {
            return;
        }
        // Private container: photos are only served through the API, never by direct URL.
        await _container.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);
        _containerReady = true;
    }
}
