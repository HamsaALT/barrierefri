using Barrierefri.Api.Domain;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Barrierefri.Api.Infrastructure;

/// <summary>
/// Turns domain exceptions into RFC 9457 problem responses. Each one carries a stable
/// "code" (and "params" where useful) next to the English detail, so the web app can
/// show its own text in Danish or English.
/// </summary>
public class ProblemExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        int? status = exception switch
        {
            NotFoundException => StatusCodes.Status404NotFound,
            ForbiddenException => StatusCodes.Status403Forbidden,
            DomainException => StatusCodes.Status409Conflict,
            _ => null,
        };
        if (status is null)
        {
            return false;
        }

        var problem = new ProblemDetails { Status = status, Detail = exception.Message };
        switch (exception)
        {
            case DomainException domain:
                problem.Extensions["code"] = domain.Code;
                if (domain.Parameters.Count > 0)
                {
                    problem.Extensions["params"] = domain.Parameters;
                }
                break;
            case ForbiddenException forbidden:
                problem.Extensions["code"] = forbidden.Code;
                break;
            case NotFoundException:
                problem.Extensions["code"] = "NOT_FOUND";
                break;
        }

        context.Response.StatusCode = status.Value;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            Exception = exception,
            ProblemDetails = problem,
        });
    }
}
