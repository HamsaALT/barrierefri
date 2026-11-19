FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore in its own layer so code changes don't re-download packages.
COPY src/Barrierefri.Api/Barrierefri.Api.csproj src/Barrierefri.Api/
RUN dotnet restore src/Barrierefri.Api/Barrierefri.Api.csproj

COPY src/ src/
RUN dotnet publish src/Barrierefri.Api/Barrierefri.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
# The aspnet image ships a non-root "app" user.
USER app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Barrierefri.Api.dll"]
