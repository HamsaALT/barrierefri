using System.Security.Claims;
using System.Text.Json.Serialization;
using Azure.Storage.Blobs;
using Barrierefri.Api.Data;
using Barrierefri.Api.Features.Reports;
using Barrierefri.Api.Infrastructure;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

builder.Services.AddDbContext<AppDbContext>(options => options
    .UseNpgsql(config.GetConnectionString("Database"))
    .UseSnakeCaseNamingConvention());

builder.Services.AddSingleton(_ => new BlobServiceClient(config.GetConnectionString("Storage")));
builder.Services.AddSingleton<IPhotoStore, BlobPhotoStore>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<ReportService>();

builder.Services.AddValidatorsFromAssemblyContaining<CreateReportValidator>();
builder.Services.AddControllers(options => options.Filters.Add<ValidationFilter>())
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ProblemExceptionHandler>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Authority is the issuer the browser sees (localhost). Inside Docker the API
        // fetches signing keys over the internal network instead, via MetadataAddress.
        options.Authority = config["Auth:Authority"];
        if (config["Auth:MetadataAddress"] is { Length: > 0 } metadata)
        {
            options.MetadataAddress = metadata;
        }
        options.RequireHttpsMetadata = config.GetValue("Auth:RequireHttpsMetadata", true);
        options.MapInboundClaims = false;
        options.TokenValidationParameters.ValidateAudience = false;
        options.TokenValidationParameters.RoleClaimType = ClaimTypes.Role;
        options.TokenValidationParameters.NameClaimType = "preferred_username";
    });
builder.Services.AddTransient<IClaimsTransformation, KeycloakRoleClaimsTransformation>();
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Policies.CaseWorker, p => p.RequireRole(Roles.Staff, Roles.Admin));

builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(config.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");
builder.Services.AddOpenApi();

var app = builder.Build();

if (config.GetValue("Database:MigrateOnStartup", false))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapOpenApi();
app.MapScalarApiReference("/docs", options => options.WithTitle("Barrierefri API"));
app.MapHealthChecks("/health");
app.MapControllers();

app.Run();

// Lets the integration tests start the app with WebApplicationFactory<Program>.
public partial class Program;
