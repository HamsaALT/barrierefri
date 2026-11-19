namespace Barrierefri.Api.Domain;

/// <summary>
/// A request that breaks a business rule. Maps to 409 Conflict. The code (and params)
/// let the web app explain it in the user's language; the message is plain English
/// for API users and logs.
/// </summary>
public class DomainException(string code, string message, IReadOnlyDictionary<string, object>? parameters = null)
    : Exception(message)
{
    public string Code { get; } = code;
    public IReadOnlyDictionary<string, object> Parameters { get; } = parameters ?? new Dictionary<string, object>();
}

public class NotFoundException(string message) : Exception(message);

public class ForbiddenException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}
