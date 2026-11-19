using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Npgsql;

namespace Barrierefri.IntegrationTests;

[Collection(ApiCollection.Name)]
public class ReportsApiTests(ApiFactory api)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    // A quiet spot in Copenhagen with no demo reports nearby.
    private const double Lat = 55.6420;
    private const double Lng = 12.5300;

    [Fact]
    public async Task MapIsPublicAndShowsActiveDemoReports()
    {
        var reports = await api.ClientFor(null)
            .GetFromJsonAsync<List<JsonElement>>("/api/reports?minLat=55.6&minLng=12.4&maxLat=55.75&maxLng=12.7", Json);

        Assert.NotNull(reports);
        Assert.NotEmpty(reports);
        Assert.All(reports, r => Assert.Contains(r.GetProperty("status").GetString(), new[] { "Open", "InProgress" }));
    }

    [Fact]
    public async Task ReportingRequiresLogin()
    {
        var response = await api.ClientFor(null).PostAsJsonAsync("/api/reports", NewReport(Lat, Lng), Json);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SecondReportOfTheSameBarrierIsFlaggedAsADuplicate()
    {
        var maja = api.ClientFor("maja-it");
        var lat = Lat + 0.01;

        var first = await maja.PostAsJsonAsync("/api/reports", NewReport(lat, Lng), Json);
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        // 10 metres away, same category.
        var second = await maja.PostAsJsonAsync("/api/reports", NewReport(lat + 0.00009, Lng), Json);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        var problem = await second.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("POSSIBLE_DUPLICATE", problem.GetProperty("code").GetString());
        var nearby = problem.GetProperty("nearby");
        Assert.Equal(1, nearby.GetArrayLength());
        Assert.InRange(nearby[0].GetProperty("distanceMeters").GetInt32(), 5, 15);

        var anyway = await maja.PostAsJsonAsync("/api/reports", NewReport(lat + 0.00009, Lng) with { IgnoreNearby = true }, Json);
        Assert.Equal(HttpStatusCode.Created, anyway.StatusCode);
    }

    [Fact]
    public async Task RejectsLocationsOutsideDenmark()
    {
        var response = await api.ClientFor("maja-it").PostAsJsonAsync("/api/reports", NewReport(59.33, 18.07), Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(problem.GetProperty("errors").TryGetProperty("latitude", out _));
    }

    [Fact]
    public async Task VotesUpdateTheCountsAndCanBeChanged()
    {
        var id = await CreateReport(Lat + 0.02, Lng);
        var lars = api.ClientFor("lars-it");

        var afterFirst = await (await lars.PutAsJsonAsync($"/api/reports/{id}/vote", new { kind = "StillThere" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, afterFirst.GetProperty("stillThereCount").GetInt32());
        Assert.Equal("StillThere", afterFirst.GetProperty("myVote").GetString());

        var afterChange = await (await lars.PutAsJsonAsync($"/api/reports/{id}/vote", new { kind = "Fixed" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, afterChange.GetProperty("stillThereCount").GetInt32());
        Assert.Equal(1, afterChange.GetProperty("fixedCount").GetInt32());
    }

    [Fact]
    public async Task CitizensCannotOpenTheCaseQueue()
    {
        var response = await api.ClientFor("maja-it", "citizen").GetAsync("/api/cases");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task StaffSeeTheMostOverdueCasesFirst()
    {
        var cases = await api.ClientFor("sara-it", "staff").GetFromJsonAsync<List<JsonElement>>("/api/cases", Json);

        Assert.NotNull(cases);
        var due = cases.Select(c => c.GetProperty("dueAt").GetDateTimeOffset()).ToList();
        Assert.Equal(due.OrderBy(d => d), due);
        Assert.True(cases[0].GetProperty("isOverdue").GetBoolean());
    }

    [Fact]
    public async Task StaffCanWorkACaseThroughToResolvedAndReopenIt()
    {
        var id = await CreateReport(Lat + 0.03, Lng);
        var sara = api.ClientFor("sara-it", "staff");

        var rejectWithoutNote = await sara.PostAsJsonAsync($"/api/cases/{id}/status", new { status = "Rejected" });
        Assert.Equal(HttpStatusCode.BadRequest, rejectWithoutNote.StatusCode);

        Assert.True((await sara.PostAsJsonAsync($"/api/cases/{id}/status", new { status = "InProgress", note = "Sent to the municipality" })).IsSuccessStatusCode);
        var resolved = await (await sara.PostAsJsonAsync($"/api/cases/{id}/status", new { status = "Resolved" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Resolved", resolved.GetProperty("status").GetString());
        Assert.Equal(2, resolved.GetProperty("history").GetArrayLength());

        var invalid = await sara.PostAsJsonAsync($"/api/cases/{id}/status", new { status = "InProgress" });
        Assert.Equal(HttpStatusCode.Conflict, invalid.StatusCode);
        var invalidProblem = await invalid.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("STATUS_TRANSITION_INVALID", invalidProblem.GetProperty("code").GetString());
        Assert.Equal("Resolved", invalidProblem.GetProperty("params").GetProperty("from").GetString());

        var reopened = await sara.PostAsJsonAsync($"/api/cases/{id}/status", new { status = "Open", note = "Broken again" });
        Assert.True(reopened.IsSuccessStatusCode);
    }

    [Fact]
    public async Task PhotosAreCheckedStoredInBlobStorageAndServed()
    {
        var id = await CreateReport(Lat + 0.04, Lng, "maja-it");
        byte[] png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 1, 2, 3, 4];

        var notMine = await api.ClientFor("lars-it").PostAsync($"/api/reports/{id}/photo", Upload(png, "photo.png"));
        Assert.Equal(HttpStatusCode.Forbidden, notMine.StatusCode);

        var fake = await api.ClientFor("maja-it").PostAsync($"/api/reports/{id}/photo", Upload("<svg/>"u8.ToArray(), "photo.png"));
        Assert.Equal(HttpStatusCode.BadRequest, fake.StatusCode);

        var ok = await api.ClientFor("maja-it").PostAsync($"/api/reports/{id}/photo", Upload(png, "photo.png"));
        Assert.Equal(HttpStatusCode.NoContent, ok.StatusCode);

        var served = await api.ClientFor(null).GetAsync($"/api/reports/{id}/photo");
        Assert.Equal("image/png", served.Content.Headers.ContentType?.MediaType);
        Assert.Equal(png, await served.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task ReportersSeeTheirOwnReportsAndCanWithdrawAVote()
    {
        var id = await CreateReport(Lat + 0.05, Lng, "ole-it");
        var ole = api.ClientFor("ole-it");

        var mine = await ole.GetFromJsonAsync<List<JsonElement>>("/api/reports/mine");
        Assert.Contains(mine!, r => r.GetProperty("id").GetInt32() == id);

        // Reporters can't confirm their own report, but they can say it's been fixed.
        var ownConfirm = await ole.PutAsJsonAsync($"/api/reports/{id}/vote", new { kind = "StillThere" });
        Assert.Equal(HttpStatusCode.Conflict, ownConfirm.StatusCode);

        (await ole.PutAsJsonAsync($"/api/reports/{id}/vote", new { kind = "Fixed" })).EnsureSuccessStatusCode();
        var afterRemove = await (await ole.DeleteAsync($"/api/reports/{id}/vote")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, afterRemove.GetProperty("fixedCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, afterRemove.GetProperty("myVote").ValueKind);
    }

    [Fact]
    public async Task NearbyLookupFindsTheDemoReportAtNorreport()
    {
        var nearby = await api.ClientFor(null)
            .GetFromJsonAsync<List<JsonElement>>("/api/reports/nearby?lat=55.6833&lng=12.5716&category=BrokenElevator");

        Assert.Single(nearby!);
        Assert.Equal(0, nearby![0].GetProperty("distanceMeters").GetInt32());
    }

    [Fact]
    public async Task StaffCanAssignACase()
    {
        var id = await CreateReport(Lat + 0.06, Lng);

        var updated = await (await api.ClientFor("sara-it", "staff")
                .PutAsJsonAsync($"/api/cases/{id}/responsible", new { responsible = "Metroselskabet" }))
            .Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal("Metroselskabet", updated.GetProperty("responsible").GetString());
    }

    [Fact]
    public async Task UnknownReportIsAProblem404()
    {
        var response = await api.ClientFor(null).GetAsync("/api/reports/999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task PublicStatsAreAvailable()
    {
        var stats = await api.ClientFor(null).GetFromJsonAsync<JsonElement>("/api/stats");

        Assert.True(stats.GetProperty("activeReports").GetInt32() > 0);
        Assert.True(stats.GetProperty("resolvedLast90Days").GetInt32() > 0);
    }

    [Fact]
    public async Task PowerBiRoleCanOnlyReadTheViews()
    {
        await using var connection = new NpgsqlConnection(api.DatabaseConnectionString);
        await connection.OpenAsync();

        async Task<bool> CanRead(string table)
        {
            await using var cmd = new NpgsqlCommand($"select has_table_privilege('powerbi_reader', '{table}', 'select')", connection);
            return (bool)(await cmd.ExecuteScalarAsync())!;
        }

        Assert.True(await CanRead("report_cases"));
        Assert.True(await CanRead("report_hotspots"));
        Assert.False(await CanRead("reports"));
        Assert.False(await CanRead("votes"));

        await using var count = new NpgsqlCommand("select count(*) from report_cases where met_sla is not null", connection);
        Assert.True((long)(await count.ExecuteScalarAsync())! > 100);
    }

    private async Task<int> CreateReport(double lat, double lng, string user = "maja-it")
    {
        var response = await api.ClientFor(user).PostAsJsonAsync("/api/reports", NewReport(lat, lng) with { IgnoreNearby = true }, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private static NewReportBody NewReport(double lat, double lng) =>
        new("BrokenElevator", "Lift out of order", "Stuck on the ground floor", lat, lng, "Test station");

    private static MultipartFormDataContent Upload(byte[] bytes, string fileName)
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        return new MultipartFormDataContent { { file, "photo", fileName } };
    }

    private record NewReportBody(string Category, string Title, string Description, double Latitude, double Longitude,
        string LocationHint, bool IgnoreNearby = false);
}
