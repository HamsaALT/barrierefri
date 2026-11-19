using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;

namespace Barrierefri.Api.Infrastructure;

/// <summary>
/// Keycloak puts realm roles inside a JSON claim, <c>realm_access: { roles: [...] }</c>.
/// ASP.NET Core only understands flat role claims, so this unpacks them once per request.
/// </summary>
public class KeycloakRoleClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
        {
            return Task.FromResult(principal);
        }

        var realmAccess = identity.FindFirst("realm_access")?.Value;
        foreach (var role in ReadRoles(realmAccess))
        {
            if (!identity.HasClaim(ClaimTypes.Role, role))
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, role));
            }
        }
        return Task.FromResult(principal);
    }

    public static IEnumerable<string> ReadRoles(string? realmAccessJson)
    {
        if (string.IsNullOrEmpty(realmAccessJson))
        {
            return [];
        }
        try
        {
            using var doc = JsonDocument.Parse(realmAccessJson);
            if (doc.RootElement.TryGetProperty("roles", out var roles) && roles.ValueKind == JsonValueKind.Array)
            {
                return roles.EnumerateArray()
                    .Where(r => r.ValueKind == JsonValueKind.String)
                    .Select(r => r.GetString()!)
                    .ToList();
            }
        }
        catch (JsonException)
        {
            // A malformed claim just means no roles.
        }
        return [];
    }
}
