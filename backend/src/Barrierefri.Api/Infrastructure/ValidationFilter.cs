using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Barrierefri.Api.Infrastructure;

/// <summary>
/// Runs the FluentValidation validator for every action argument that has one, and
/// answers with a standard 400 validation problem before the action runs.
/// FluentValidation dropped its own MVC integration, so this replaces it.
/// </summary>
public class ValidationFilter(IServiceProvider services) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null)
            {
                continue;
            }
            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            if (services.GetService(validatorType) is not IValidator validator)
            {
                continue;
            }

            var result = await validator.ValidateAsync(new ValidationContext<object>(argument));
            if (!result.IsValid)
            {
                var errors = result.Errors
                    .GroupBy(e => JsonName(e.PropertyName))
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
                context.Result = new BadRequestObjectResult(new ValidationProblemDetails(errors)
                {
                    Status = StatusCodes.Status400BadRequest,
                });
                return;
            }
        }
        await next();
    }

    // Match the camelCase names the client sends, so the UI can map errors to fields.
    private static string JsonName(string property) =>
        string.IsNullOrEmpty(property) ? property : char.ToLowerInvariant(property[0]) + property[1..];
}
