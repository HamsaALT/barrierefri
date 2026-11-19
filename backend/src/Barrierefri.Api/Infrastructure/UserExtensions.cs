using System.Security.Claims;

namespace Barrierefri.Api.Infrastructure;

public static class Roles
{
    public const string Staff = "staff";
    public const string Admin = "admin";
}

public static class Policies
{
    /// <summary>Municipal or operator staff who handle cases.</summary>
    public const string CaseWorker = "CaseWorker";
}

public static class UserExtensions
{
    /// <summary>The Keycloak user id ("sub"). Inbound claim mapping is off, so it keeps its JWT name.</summary>
    public static string UserId(this ClaimsPrincipal user) =>
        user.FindFirstValue("sub") ?? throw new InvalidOperationException("Token has no subject");

    public static string? UserIdOrNull(this ClaimsPrincipal user) => user.FindFirstValue("sub");

    public static string DisplayName(this ClaimsPrincipal user) =>
        user.FindFirstValue("preferred_username") ?? user.FindFirstValue("sub") ?? "unknown";
}
