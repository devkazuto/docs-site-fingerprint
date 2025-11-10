---
sidebar_position: 9
title: .NET Integration
description: Complete guide for integrating the Fingerprint Service with .NET and C#
---

# .NET Integration

## Overview

This guide demonstrates how to integrate the Fingerprint Service API into .NET applications using C# and HttpClient. We'll create a robust API client with async/await patterns, proper error handling, dependency injection support, and strongly-typed models.

## Prerequisites

- .NET 6.0 or higher (.NET 8.0+ recommended)
- Visual Studio 2022 or Visual Studio Code
- NuGet Package Manager
- Fingerprint Service running and accessible

## Installation

### Create New Project

```bash
# Create a new console application
dotnet new console -n FingerprintClient

# Or create a class library
dotnet new classlib -n FingerprintClient
```

### Install Required Packages

```bash
# Navigate to project directory
cd FingerprintClient

# Install required NuGet packages
dotnet add package System.Net.Http.Json
dotnet add package Microsoft.Extensions.DependencyInjection
dotnet add package Microsoft.Extensions.Http
dotnet add package Microsoft.Extensions.Logging
```

## Implementation

### Models and DTOs

Create `Models/FingerprintModels.cs`:

```csharp
using System.Text.Json.Serialization;

namespace FingerprintClient.Models
{
    /// <summary>
    /// Device information
    /// </summary>
    public class DeviceInfo
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("serialNumber")]
        public string? SerialNumber { get; set; }
    }

    /// <summary>
    /// Enrollment request
    /// </summary>
    public class EnrollmentRequest
    {
        [JsonPropertyName("deviceId")]
        public string DeviceId { get; set; } = string.Empty;

        [JsonPropertyName("userId")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("metadata")]
        public Dictionary<string, object>? Metadata { get; set; }
    }

    /// <summary>
    /// Enrollment result
    /// </summary>
    public class EnrollmentResult
    {
        [JsonPropertyName("template")]
        public string Template { get; set; } = string.Empty;

        [JsonPropertyName("quality")]
        public int Quality { get; set; }

        [JsonPropertyName("deviceId")]
        public string DeviceId { get; set; } = string.Empty;
    }

    /// <summary>
    /// Verification request
    /// </summary>
    public class VerificationRequest
    {
        [JsonPropertyName("template")]
        public string Template { get; set; } = string.Empty;

        [JsonPropertyName("userId")]
        public string UserId { get; set; } = string.Empty;

        [JsonPropertyName("deviceId")]
        public string DeviceId { get; set; } = string.Empty;
    }

    /// <summary>
    /// Verification result
    /// </summary>
    public class VerificationResult
    {
        [JsonPropertyName("match")]
        public bool Match { get; set; }

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }

        [JsonPropertyName("userId")]
        public string? UserId { get; set; }
    }

    /// <summary>
    /// Identification request
    /// </summary>
    public class IdentificationRequest
    {
        [JsonPropertyName("template")]
        public string Template { get; set; } = string.Empty;

        [JsonPropertyName("deviceId")]
        public string DeviceId { get; set; } = string.Empty;
    }

    /// <summary>
    /// Scan session information
    /// </summary>
    public class ScanSession
    {
        [JsonPropertyName("scanId")]
        public string ScanId { get; set; } = string.Empty;

        [JsonPropertyName("deviceId")]
        public string DeviceId { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>
    /// Scan status
    /// </summary>
    public class ScanStatus
    {
        [JsonPropertyName("scanId")]
        public string ScanId { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("template")]
        public string? Template { get; set; }

        [JsonPropertyName("quality")]
        public int? Quality { get; set; }

        [JsonPropertyName("error")]
        public string? Error { get; set; }
    }

    /// <summary>
    /// Health status
    /// </summary>
    public class HealthStatus
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("version")]
        public string? Version { get; set; }

        [JsonPropertyName("uptime")]
        public long? Uptime { get; set; }
    }

    /// <summary>
    /// API error response
    /// </summary>
    public class ApiErrorResponse
    {
        [JsonPropertyName("error")]
        public ApiError? Error { get; set; }
    }

    /// <summary>
    /// API error details
    /// </summary>
    public class ApiError
    {
        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("code")]
        public string? Code { get; set; }
    }
}
```

### Custom Exceptions

Create `Exceptions/FingerprintException.cs`:

```csharp
namespace FingerprintClient.Exceptions
{
    /// <summary>
    /// Base exception for fingerprint operations
    /// </summary>
    public class FingerprintException : Exception
    {
        public string? ErrorCode { get; set; }

        public FingerprintException(string message) : base(message)
        {
        }

        public FingerprintException(string message, string errorCode) : base(message)
        {
            ErrorCode = errorCode;
        }

        public FingerprintException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }

    /// <summary>
    /// Device-related errors
    /// </summary>
    public class DeviceException : FingerprintException
    {
        public DeviceException(string message) : base(message)
        {
        }

        public DeviceException(string message, string errorCode) : base(message, errorCode)
        {
        }
    }

    /// <summary>
    /// Fingerprint quality or matching errors
    /// </summary>
    public class FingerprintQualityException : FingerprintException
    {
        public int Quality { get; set; }

        public FingerprintQualityException(string message, int quality) : base(message)
        {
            Quality = quality;
        }
    }

    /// <summary>
    /// Authentication errors
    /// </summary>
    public class AuthenticationException : FingerprintException
    {
        public AuthenticationException(string message) : base(message)
        {
        }
    }

    /// <summary>
    /// Rate limiting errors
    /// </summary>
    public class RateLimitException : FingerprintException
    {
        public RateLimitException(string message) : base(message)
        {
        }
    }
}
```

### API Client

Create `FingerprintApiClient.cs`:

```csharp
using System.Net.Http.Json;
using System.Text.Json;
using FingerprintClient.Models;
using FingerprintClient.Exceptions;
using Microsoft.Extensions.Logging;

namespace FingerprintClient
{
    /// <summary>
    /// API client for Fingerprint Service
    /// </summary>
    public class FingerprintApiClient : IDisposable
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<FingerprintApiClient>? _logger;
        private readonly JsonSerializerOptions _jsonOptions;

        public FingerprintApiClient(
            HttpClient httpClient,
            ILogger<FingerprintApiClient>? logger = null)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _logger = logger;

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
        }

        /// <summary>
        /// List all connected fingerprint devices
        /// </summary>
        public async Task<List<DeviceInfo>> ListDevicesAsync(
            CancellationToken cancellationToken = default)
        {
            _logger?.LogInformation("Listing devices");

            var response = await _httpClient.GetAsync("/api/devices", cancellationToken);
            await EnsureSuccessAsync(response);

            var devices = await response.Content.ReadFromJsonAsync<List<DeviceInfo>>(
                _jsonOptions,
                cancellationToken
            );

            return devices ?? new List<DeviceInfo>();
        }

        /// <summary>
        /// Get information about a specific device
        /// </summary>
        public async Task<DeviceInfo> GetDeviceInfoAsync(
            string deviceId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(deviceId))
                throw new ArgumentException("Device ID cannot be null or empty", nameof(deviceId));

            _logger?.LogInformation("Getting device info for {DeviceId}", deviceId);

            var response = await _httpClient.GetAsync(
                $"/api/devices/{deviceId}/info",
                cancellationToken
            );
            await EnsureSuccessAsync(response);

            var deviceInfo = await response.Content.ReadFromJsonAsync<DeviceInfo>(
                _jsonOptions,
                cancellationToken
            );

            return deviceInfo ?? throw new FingerprintException("Failed to deserialize device info");
        }

        /// <summary>
        /// Test device connection
        /// </summary>
        public async Task<bool> TestDeviceAsync(
            string deviceId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(deviceId))
                throw new ArgumentException("Device ID cannot be null or empty", nameof(deviceId));

            _logger?.LogInformation("Testing device {DeviceId}", deviceId);

            var response = await _httpClient.PostAsync(
                $"/api/devices/{deviceId}/test",
                null,
                cancellationToken
            );

            return response.IsSuccessStatusCode;
        }

        /// <summary>
        /// Enroll a new fingerprint
        /// </summary>
        public async Task<EnrollmentResult> EnrollFingerprintAsync(
            string deviceId,
            string userId,
            Dictionary<string, object>? metadata = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(deviceId))
                throw new ArgumentException("Device ID cannot be null or empty", nameof(deviceId));
            if (string.IsNullOrEmpty(userId))
                throw new ArgumentException("User ID cannot be null or empty", nameof(userId));

            _logger?.LogInformation("Enrolling fingerprint for user {UserId}", userId);

            var request = new EnrollmentRequest
            {
                DeviceId = deviceId,
                UserId = userId,
                Metadata = metadata
            };

            var response = await _httpClient.PostAsJsonAsync(
                "/api/fingerprint/enroll",
                request,
                cancellationToken
            );
            await EnsureSuccessAsync(response);

            var result = await response.Content.ReadFromJsonAsync<EnrollmentResult>(
                _jsonOptions,
                cancellationToken
            );

            return result ?? throw new FingerprintException("Failed to deserialize enrollment result");
        }

        /// <summary>
        /// Verify fingerprint (1:1 matching)
        /// </summary>
        public async Task<VerificationResult> VerifyFingerprintAsync(
            string template,
            string userId,
            string deviceId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(template))
                throw new ArgumentException("Template cannot be null or empty", nameof(template));
            if (string.IsNullOrEmpty(userId))
                throw new ArgumentException("User ID cannot be null or empty", nameof(userId));
            if (string.IsNullOrEmpty(deviceId))
                throw new ArgumentException("Device ID cannot be null or empty", nameof(deviceId));

            _logger?.LogInformation("Verifying fingerprint for user {UserId}", userId);

            var request = new VerificationRequest
            {
                Template = template,
                UserId = userId,
                DeviceId = deviceId
            };

            var response = await _httpClient.PostAsJsonAsync(
                "/api/fingerprint/verify",
                request,
                cancellationToken
            );
            await EnsureSuccessAsync(response);

            var result = await response.Content.ReadFromJsonAsync<VerificationResult>(
                _jsonOptions,
                cancellationToken
            );

            return result ?? throw new FingerprintException("Failed to deserialize verification result");
        }

        /// <summary>
        /// Identify fingerprint (1:N matching)
        /// </summary>
        public async Task<VerificationResult> IdentifyFingerprintAsync(
            string template,
            string deviceId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(template))
                throw new ArgumentException("Template cannot be null or empty", nameof(template));
            if (string.IsNullOrEmpty(deviceId))
                throw new ArgumentException("Device ID cannot be null or empty", nameof(deviceId));

            _logger?.LogInformation("Identifying fingerprint");

            var request = new IdentificationRequest
            {
                Template = template,
                DeviceId = deviceId
            };

            var response = await _httpClient.PostAsJsonAsync(
                "/api/fingerprint/identify",
                request,
                cancellationToken
            );
            await EnsureSuccessAsync(response);

            var result = await response.Content.ReadFromJsonAsync<VerificationResult>(
                _jsonOptions,
                cancellationToken
            );

            return result ?? throw new FingerprintException("Failed to deserialize identification result");
        }

        /// <summary>
        /// Start a fingerprint scan session
        /// </summary>
        public async Task<ScanSession> StartScanAsync(
            string? deviceId = null,
            CancellationToken cancellationToken = default)
        {
            _logger?.LogInformation("Starting scan session");

            var url = "/api/fingerprint/scan/start";
            if (!string.IsNullOrEmpty(deviceId))
            {
                url += $"?deviceId={Uri.EscapeDataString(deviceId)}";
            }

            var response = await _httpClient.GetAsync(url, cancellationToken);
            await EnsureSuccessAsync(response);

            var session = await response.Content.ReadFromJsonAsync<ScanSession>(
                _jsonOptions,
                cancellationToken
            );

            return session ?? throw new FingerprintException("Failed to deserialize scan session");
        }

        /// <summary>
        /// Get the status of a scan session
        /// </summary>
        public async Task<ScanStatus> GetScanStatusAsync(
            string scanId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(scanId))
                throw new ArgumentException("Scan ID cannot be null or empty", nameof(scanId));

            var response = await _httpClient.GetAsync(
                $"/api/fingerprint/scan/status/{scanId}",
                cancellationToken
            );
            await EnsureSuccessAsync(response);

            var status = await response.Content.ReadFromJsonAsync<ScanStatus>(
                _jsonOptions,
                cancellationToken
            );

            return status ?? throw new FingerprintException("Failed to deserialize scan status");
        }

        /// <summary>
        /// Wait for scan completion with polling
        /// </summary>
        public async Task<ScanStatus> WaitForScanAsync(
            string scanId,
            int maxWaitSeconds = 30,
            int pollIntervalMs = 500,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(scanId))
                throw new ArgumentException("Scan ID cannot be null or empty", nameof(scanId));

            _logger?.LogInformation("Waiting for scan {ScanId} to complete", scanId);

            var startTime = DateTime.UtcNow;
            var maxWait = TimeSpan.FromSeconds(maxWaitSeconds);

            while (DateTime.UtcNow - startTime < maxWait)
            {
                var status = await GetScanStatusAsync(scanId, cancellationToken);

                if (status.Status == "complete")
                {
                    _logger?.LogInformation("Scan {ScanId} completed", scanId);
                    return status;
                }

                if (status.Status == "error")
                {
                    var errorMsg = status.Error ?? "Unknown error";
                    _logger?.LogError("Scan {ScanId} failed: {Error}", scanId, errorMsg);
                    throw new FingerprintException($"Scan failed: {errorMsg}");
                }

                await Task.Delay(pollIntervalMs, cancellationToken);
            }

            _logger?.LogError("Scan {ScanId} timed out", scanId);
            throw new FingerprintException("Scan timeout");
        }

        /// <summary>
        /// Get service health status
        /// </summary>
        public async Task<HealthStatus> GetHealthAsync(
            CancellationToken cancellationToken = default)
        {
            _logger?.LogInformation("Checking service health");

            var response = await _httpClient.GetAsync("/api/health", cancellationToken);
            await EnsureSuccessAsync(response);

            var health = await response.Content.ReadFromJsonAsync<HealthStatus>(
                _jsonOptions,
                cancellationToken
            );

            return health ?? throw new FingerprintException("Failed to deserialize health status");
        }

        /// <summary>
        /// Ensure HTTP response is successful
        /// </summary>
        private async Task EnsureSuccessAsync(HttpResponseMessage response)
        {
            if (response.IsSuccessStatusCode)
                return;

            var errorContent = await response.Content.ReadAsStringAsync();
            ApiErrorResponse? errorResponse = null;

            try
            {
                errorResponse = JsonSerializer.Deserialize<ApiErrorResponse>(
                    errorContent,
                    _jsonOptions
                );
            }
            catch
            {
                // Ignore deserialization errors
            }

            var message = errorResponse?.Error?.Message ?? $"HTTP {(int)response.StatusCode}";
            var code = errorResponse?.Error?.Code;

            _logger?.LogError("API request failed: {Message} (Code: {Code})", message, code);

            throw new FingerprintException(message, code ?? response.StatusCode.ToString());
        }

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }
}
```

### Configuration

Create `FingerprintClientOptions.cs`:

```csharp
namespace FingerprintClient
{
    /// <summary>
    /// Configuration options for Fingerprint API client
    /// </summary>
    public class FingerprintClientOptions
    {
        public const string SectionName = "FingerprintClient";

        /// <summary>
        /// Base URL of the fingerprint service
        /// </summary>
        public string BaseUrl { get; set; } = "http://localhost:8080";

        /// <summary>
        /// API key for authentication
        /// </summary>
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Request timeout in seconds
        /// </summary>
        public int TimeoutSeconds { get; set; } = 30;

        /// <summary>
        /// Maximum number of retry attempts
        /// </summary>
        public int MaxRetries { get; set; } = 3;

        /// <summary>
        /// Minimum quality for enrollment
        /// </summary>
        public int MinEnrollmentQuality { get; set; } = 60;

        /// <summary>
        /// Minimum quality for verification
        /// </summary>
        public int MinVerificationQuality { get; set; } = 50;

        /// <summary>
        /// Minimum confidence percentage
        /// </summary>
        public double MinConfidence { get; set; } = 80.0;

        /// <summary>
        /// Scan timeout in seconds
        /// </summary>
        public int ScanTimeoutSeconds { get; set; } = 30;
    }
}
```

### Dependency Injection Setup

Create `ServiceCollectionExtensions.cs`:

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Polly;
using Polly.Extensions.Http;

namespace FingerprintClient.Extensions
{
    /// <summary>
    /// Extension methods for IServiceCollection
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Add Fingerprint API client to service collection
        /// </summary>
        public static IServiceCollection AddFingerprintClient(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            // Bind configuration
            services.Configure<FingerprintClientOptions>(
                configuration.GetSection(FingerprintClientOptions.SectionName)
            );

            var options = configuration
                .GetSection(FingerprintClientOptions.SectionName)
                .Get<FingerprintClientOptions>() ?? new FingerprintClientOptions();

            // Register HttpClient with retry policy
            services.AddHttpClient<FingerprintApiClient>(client =>
            {
                client.BaseAddress = new Uri(options.BaseUrl);
                client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
                client.DefaultRequestHeaders.Add("X-API-Key", options.ApiKey);
                client.DefaultRequestHeaders.Add("Accept", "application/json");
            })
            .AddPolicyHandler(GetRetryPolicy(options.MaxRetries))
            .AddPolicyHandler(GetCircuitBreakerPolicy());

            return services;
        }

        /// <summary>
        /// Get retry policy with exponential backoff
        /// </summary>
        private static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy(int maxRetries)
        {
            return HttpPolicyExtensions
                .HandleTransientHttpError()
                .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                .WaitAndRetryAsync(
                    maxRetries,
                    retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))
                );
        }

        /// <summary>
        /// Get circuit breaker policy
        /// </summary>
        private static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
        {
            return HttpPolicyExtensions
                .HandleTransientHttpError()
                .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));
        }
    }
}
```


### Configuration File

Create `appsettings.json`:

```json
{
  "FingerprintClient": {
    "BaseUrl": "http://localhost:8080",
    "ApiKey": "your-api-key-here",
    "TimeoutSeconds": 30,
    "MaxRetries": 3,
    "MinEnrollmentQuality": 60,
    "MinVerificationQuality": 50,
    "MinConfidence": 80.0,
    "ScanTimeoutSeconds": 30
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "FingerprintClient": "Debug"
    }
  }
}
```

## Usage Examples

### Console Application

Create `Program.cs`:

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using FingerprintClient;
using FingerprintClient.Extensions;
using FingerprintClient.Exceptions;

class Program
{
    static async Task Main(string[] args)
    {
        // Build configuration
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false)
            .AddEnvironmentVariables()
            .Build();

        // Setup dependency injection
        var services = new ServiceCollection();
        services.AddLogging(builder =>
        {
            builder.AddConsole();
            builder.AddConfiguration(configuration.GetSection("Logging"));
        });
        services.AddFingerprintClient(configuration);

        var serviceProvider = services.BuildServiceProvider();

        // Get client from DI container
        var client = serviceProvider.GetRequiredService<FingerprintApiClient>();
        var logger = serviceProvider.GetRequiredService<ILogger<Program>>();

        try
        {
            // List devices
            logger.LogInformation("Listing devices...");
            var devices = await client.ListDevicesAsync();

            if (devices.Count == 0)
            {
                logger.LogWarning("No devices connected");
                return;
            }

            var deviceId = devices[0].Id;
            logger.LogInformation("Using device: {DeviceId}", deviceId);

            // Enroll fingerprint
            logger.LogInformation("Starting enrollment...");
            var metadata = new Dictionary<string, object>
            {
                { "name", "John Doe" },
                { "department", "Engineering" }
            };

            var enrollmentResult = await client.EnrollFingerprintAsync(
                deviceId,
                "user-12345",
                metadata
            );

            logger.LogInformation(
                "Enrollment successful! Quality: {Quality}",
                enrollmentResult.Quality
            );

            // Verify fingerprint
            logger.LogInformation("Starting verification...");
            var scan = await client.StartScanAsync(deviceId);
            logger.LogInformation("Place finger on scanner...");

            var scanResult = await client.WaitForScanAsync(scan.ScanId);
            logger.LogInformation("Scan complete. Quality: {Quality}", scanResult.Quality);

            var verification = await client.VerifyFingerprintAsync(
                scanResult.Template!,
                "user-12345",
                deviceId
            );

            if (verification.Match)
            {
                logger.LogInformation(
                    "✓ Verification successful! Confidence: {Confidence}%",
                    verification.Confidence
                );
            }
            else
            {
                logger.LogWarning("✗ Verification failed");
            }
        }
        catch (FingerprintException ex)
        {
            logger.LogError(ex, "Fingerprint operation failed: {Message}", ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error: {Message}", ex.Message);
        }
    }
}
```

### ASP.NET Core Integration

#### Startup Configuration

```csharp
using FingerprintClient.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddFingerprintClient(builder.Configuration);

var app = builder.Build();

app.MapControllers();
app.Run();
```

#### Controller Example

Create `Controllers/FingerprintController.cs`:

```csharp
using Microsoft.AspNetCore.Mvc;
using FingerprintClient;
using FingerprintClient.Models;
using FingerprintClient.Exceptions;

namespace FingerprintApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FingerprintController : ControllerBase
    {
        private readonly FingerprintApiClient _client;
        private readonly ILogger<FingerprintController> _logger;

        public FingerprintController(
            FingerprintApiClient client,
            ILogger<FingerprintController> logger)
        {
            _client = client;
            _logger = logger;
        }

        /// <summary>
        /// List all connected devices
        /// </summary>
        [HttpGet("devices")]
        public async Task<ActionResult<List<DeviceInfo>>> ListDevices(
            CancellationToken cancellationToken)
        {
            try
            {
                var devices = await _client.ListDevicesAsync(cancellationToken);
                return Ok(devices);
            }
            catch (FingerprintException ex)
            {
                _logger.LogError(ex, "Failed to list devices");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Enroll a new fingerprint
        /// </summary>
        [HttpPost("enroll")]
        public async Task<ActionResult<EnrollmentResult>> Enroll(
            [FromBody] EnrollmentRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _client.EnrollFingerprintAsync(
                    request.DeviceId,
                    request.UserId,
                    request.Metadata,
                    cancellationToken
                );

                _logger.LogInformation(
                    "Fingerprint enrolled for user {UserId} with quality {Quality}",
                    request.UserId,
                    result.Quality
                );

                return Ok(result);
            }
            catch (FingerprintQualityException ex)
            {
                _logger.LogWarning(ex, "Enrollment quality too low");
                return BadRequest(new { error = ex.Message, quality = ex.Quality });
            }
            catch (FingerprintException ex)
            {
                _logger.LogError(ex, "Enrollment failed");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Authenticate user with fingerprint
        /// </summary>
        [HttpPost("authenticate")]
        public async Task<ActionResult<AuthenticationResponse>> Authenticate(
            [FromBody] AuthenticationRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                // Start scan
                var scan = await _client.StartScanAsync(request.DeviceId, cancellationToken);

                // Wait for scan completion
                var scanResult = await _client.WaitForScanAsync(
                    scan.ScanId,
                    cancellationToken: cancellationToken
                );

                // Identify user
                var identification = await _client.IdentifyFingerprintAsync(
                    scanResult.Template!,
                    request.DeviceId,
                    cancellationToken
                );

                if (!identification.Match)
                {
                    _logger.LogWarning("User not found");
                    return NotFound(new { message = "User not found" });
                }

                _logger.LogInformation(
                    "User {UserId} authenticated with confidence {Confidence}%",
                    identification.UserId,
                    identification.Confidence
                );

                return Ok(new AuthenticationResponse
                {
                    Success = true,
                    UserId = identification.UserId!,
                    Confidence = identification.Confidence
                });
            }
            catch (FingerprintException ex)
            {
                _logger.LogError(ex, "Authentication failed");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Verify fingerprint for specific user
        /// </summary>
        [HttpPost("verify")]
        public async Task<ActionResult<VerificationResult>> Verify(
            [FromBody] VerificationRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = await _client.VerifyFingerprintAsync(
                    request.Template,
                    request.UserId,
                    request.DeviceId,
                    cancellationToken
                );

                _logger.LogInformation(
                    "Verification for user {UserId}: {Match} (Confidence: {Confidence}%)",
                    request.UserId,
                    result.Match,
                    result.Confidence
                );

                return Ok(result);
            }
            catch (FingerprintException ex)
            {
                _logger.LogError(ex, "Verification failed");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Get service health
        /// </summary>
        [HttpGet("health")]
        public async Task<ActionResult<HealthStatus>> GetHealth(
            CancellationToken cancellationToken)
        {
            try
            {
                var health = await _client.GetHealthAsync(cancellationToken);
                return Ok(health);
            }
            catch (FingerprintException ex)
            {
                _logger.LogError(ex, "Health check failed");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class AuthenticationRequest
    {
        public string DeviceId { get; set; } = string.Empty;
    }

    public class AuthenticationResponse
    {
        public bool Success { get; set; }
        public string UserId { get; set; } = string.Empty;
        public double Confidence { get; set; }
    }
}
```

## Advanced Features

### Quality Validator

Create `Validators/FingerprintValidator.cs`:

```csharp
using FingerprintClient.Models;
using FingerprintClient.Exceptions;
using Microsoft.Extensions.Options;

namespace FingerprintClient.Validators
{
    /// <summary>
    /// Validator for fingerprint quality and confidence
    /// </summary>
    public class FingerprintValidator
    {
        private readonly FingerprintClientOptions _options;

        public FingerprintValidator(IOptions<FingerprintClientOptions> options)
        {
            _options = options.Value;
        }

        /// <summary>
        /// Validate enrollment quality
        /// </summary>
        public void ValidateEnrollmentQuality(EnrollmentResult result)
        {
            if (result.Quality < _options.MinEnrollmentQuality)
            {
                throw new FingerprintQualityException(
                    $"Quality too low for enrollment: {result.Quality} " +
                    $"(minimum: {_options.MinEnrollmentQuality})",
                    result.Quality
                );
            }
        }

        /// <summary>
        /// Validate verification quality
        /// </summary>
        public void ValidateVerificationQuality(ScanStatus scanResult)
        {
            if (scanResult.Quality < _options.MinVerificationQuality)
            {
                throw new FingerprintQualityException(
                    $"Quality too low for verification: {scanResult.Quality} " +
                    $"(minimum: {_options.MinVerificationQuality})",
                    scanResult.Quality.Value
                );
            }
        }

        /// <summary>
        /// Validate confidence score
        /// </summary>
        public void ValidateConfidence(VerificationResult result, double? minConfidence = null)
        {
            var threshold = minConfidence ?? _options.MinConfidence;

            if (result.Confidence < threshold)
            {
                throw new FingerprintQualityException(
                    $"Confidence too low: {result.Confidence}% (minimum: {threshold}%)",
                    (int)result.Confidence
                );
            }
        }
    }
}
```

### Retry Helper

Create `Helpers/RetryHelper.cs`:

```csharp
using FingerprintClient.Exceptions;
using Microsoft.Extensions.Logging;

namespace FingerprintClient.Helpers
{
    /// <summary>
    /// Helper for retry logic with exponential backoff
    /// </summary>
    public static class RetryHelper
    {
        /// <summary>
        /// Execute function with retry logic
        /// </summary>
        public static async Task<T> ExecuteWithRetryAsync<T>(
            Func<Task<T>> operation,
            int maxRetries = 3,
            int initialDelayMs = 1000,
            double backoffMultiplier = 2.0,
            ILogger? logger = null,
            CancellationToken cancellationToken = default)
        {
            var delay = initialDelayMs;
            Exception? lastException = null;

            for (int attempt = 0; attempt < maxRetries; attempt++)
            {
                try
                {
                    return await operation();
                }
                catch (FingerprintQualityException ex)
                {
                    logger?.LogWarning(
                        "Low quality scan (attempt {Attempt}/{MaxRetries}). Please try again.",
                        attempt + 1,
                        maxRetries
                    );

                    lastException = ex;

                    if (attempt < maxRetries - 1)
                    {
                        await Task.Delay(delay, cancellationToken);
                        delay = (int)(delay * backoffMultiplier);
                    }
                }
                catch (RateLimitException ex)
                {
                    logger?.LogWarning(
                        "Rate limit exceeded. Waiting {Delay}ms...",
                        delay
                    );

                    lastException = ex;

                    if (attempt < maxRetries - 1)
                    {
                        await Task.Delay(delay, cancellationToken);
                        delay = (int)(delay * backoffMultiplier);
                    }
                }
                catch (DeviceException)
                {
                    // Don't retry device errors
                    throw;
                }
            }

            throw lastException ?? new FingerprintException("Max retries exceeded");
        }
    }
}
```

## Complete Example: Authentication System

### Database Context

```csharp
using Microsoft.EntityFrameworkCore;

namespace FingerprintAuth.Data
{
    public class FingerprintDbContext : DbContext
    {
        public FingerprintDbContext(DbContextOptions<FingerprintDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<FingerprintTemplate> FingerprintTemplates { get; set; }
        public DbSet<AuthLog> AuthLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.HasIndex(e => e.Username).IsUnique();
            });

            modelBuilder.Entity<FingerprintTemplate>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Template).IsRequired();
                entity.Property(e => e.Quality).IsRequired();

                entity.HasOne(e => e.User)
                    .WithOne(u => u.FingerprintTemplate)
                    .HasForeignKey<FingerprintTemplate>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<AuthLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Success).IsRequired();
                entity.Property(e => e.Timestamp).IsRequired();

                entity.HasOne(e => e.User)
                    .WithMany(u => u.AuthLogs)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.Timestamp);
            });
        }
    }

    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public FingerprintTemplate? FingerprintTemplate { get; set; }
        public ICollection<AuthLog> AuthLogs { get; set; } = new List<AuthLog>();
    }

    public class FingerprintTemplate
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Template { get; set; } = string.Empty;
        public int Quality { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User User { get; set; } = null!;
    }

    public class AuthLog
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public double? Confidence { get; set; }
        public bool Success { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}
```

### Authentication Service

```csharp
using FingerprintClient;
using FingerprintClient.Exceptions;
using FingerprintAuth.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FingerprintAuth.Services
{
    public class FingerprintAuthService
    {
        private readonly FingerprintApiClient _client;
        private readonly FingerprintDbContext _dbContext;
        private readonly ILogger<FingerprintAuthService> _logger;

        public FingerprintAuthService(
            FingerprintApiClient client,
            FingerprintDbContext dbContext,
            ILogger<FingerprintAuthService> logger)
        {
            _client = client;
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Register new user with fingerprint
        /// </summary>
        public async Task<User> RegisterUserAsync(
            string username,
            string email,
            string deviceId,
            CancellationToken cancellationToken = default)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // Create user
                var user = new User
                {
                    Username = username,
                    Email = email
                };

                _dbContext.Users.Add(user);
                await _dbContext.SaveChangesAsync(cancellationToken);

                // Enroll fingerprint
                _logger.LogInformation("Enrolling fingerprint for user {Username}", username);

                var result = await _client.EnrollFingerprintAsync(
                    deviceId,
                    $"user-{user.Id}",
                    new Dictionary<string, object>
                    {
                        { "username", username },
                        { "email", email }
                    },
                    cancellationToken
                );

                // Store template
                var template = new FingerprintTemplate
                {
                    UserId = user.Id,
                    Template = result.Template,
                    Quality = result.Quality
                };

                _dbContext.FingerprintTemplates.Add(template);
                await _dbContext.SaveChangesAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                _logger.LogInformation(
                    "User {Username} registered with quality {Quality}",
                    username,
                    result.Quality
                );

                return user;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }

        /// <summary>
        /// Authenticate user with fingerprint
        /// </summary>
        public async Task<User?> AuthenticateUserAsync(
            string deviceId,
            CancellationToken cancellationToken = default)
        {
            try
            {
                // Start scan
                _logger.LogInformation("Starting fingerprint scan");
                var scan = await _client.StartScanAsync(deviceId, cancellationToken);

                // Wait for scan completion
                var scanResult = await _client.WaitForScanAsync(
                    scan.ScanId,
                    cancellationToken: cancellationToken
                );

                _logger.LogInformation("Scan complete. Quality: {Quality}", scanResult.Quality);

                // Identify user
                var identification = await _client.IdentifyFingerprintAsync(
                    scanResult.Template!,
                    deviceId,
                    cancellationToken
                );

                if (!identification.Match)
                {
                    await LogAuthAttemptAsync(null, false, null, cancellationToken);
                    return null;
                }

                // Extract user ID
                var serviceUserId = identification.UserId!;
                var userId = int.Parse(serviceUserId.Replace("user-", ""));

                // Load user
                var user = await _dbContext.Users
                    .Include(u => u.FingerprintTemplate)
                    .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

                if (user == null)
                {
                    return null;
                }

                // Log successful authentication
                await LogAuthAttemptAsync(
                    userId,
                    true,
                    identification.Confidence,
                    cancellationToken
                );

                _logger.LogInformation(
                    "User {Username} authenticated with confidence {Confidence}%",
                    user.Username,
                    identification.Confidence
                );

                return user;
            }
            catch (FingerprintException ex)
            {
                _logger.LogError(ex, "Authentication failed");
                return null;
            }
        }

        /// <summary>
        /// Log authentication attempt
        /// </summary>
        private async Task LogAuthAttemptAsync(
            int? userId,
            bool success,
            double? confidence,
            CancellationToken cancellationToken)
        {
            var log = new AuthLog
            {
                UserId = userId,
                Success = success,
                Confidence = confidence
            };

            _dbContext.AuthLogs.Add(log);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
```

## Testing

### Unit Tests with xUnit

```csharp
using Xunit;
using Moq;
using Moq.Protected;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using FingerprintClient;
using FingerprintClient.Models;
using FingerprintClient.Exceptions;
using Microsoft.Extensions.Logging;

namespace FingerprintClient.Tests
{
    public class FingerprintApiClientTests
    {
        private readonly Mock<ILogger<FingerprintApiClient>> _loggerMock;

        public FingerprintApiClientTests()
        {
            _loggerMock = new Mock<ILogger<FingerprintApiClient>>();
        }

        [Fact]
        public async Task ListDevicesAsync_ReturnsDevices()
        {
            // Arrange
            var mockHandler = new Mock<HttpMessageHandler>();
            mockHandler.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(@"[{""id"":""device-001"",""name"":""Test Device""}]")
                });

            var httpClient = new HttpClient(mockHandler.Object)
            {
                BaseAddress = new Uri("http://localhost:8080")
            };

            var client = new FingerprintApiClient(httpClient, _loggerMock.Object);

            // Act
            var devices = await client.ListDevicesAsync();

            // Assert
            Assert.Single(devices);
            Assert.Equal("device-001", devices[0].Id);
        }

        [Fact]
        public async Task EnrollFingerprintAsync_ThrowsException_WhenQualityLow()
        {
            // Arrange
            var mockHandler = new Mock<HttpMessageHandler>();
            mockHandler.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.BadRequest,
                    Content = new StringContent(@"{""error"":{""message"":""Quality too low"",""code"":""LOW_QUALITY""}}")
                });

            var httpClient = new HttpClient(mockHandler.Object)
            {
                BaseAddress = new Uri("http://localhost:8080")
            };

            var client = new FingerprintApiClient(httpClient, _loggerMock.Object);

            // Act & Assert
            await Assert.ThrowsAsync<FingerprintException>(
                () => client.EnrollFingerprintAsync("device-001", "user-123")
            );
        }
    }
}
```

## Best Practices

1. **Use dependency injection** for better testability and maintainability
2. **Implement async/await** throughout for better performance
3. **Use strongly-typed models** for type safety
4. **Validate quality scores** before storing templates
5. **Implement retry logic** with Polly for transient errors
6. **Log all operations** for debugging and auditing
7. **Store API keys securely** using configuration and secrets
8. **Use HTTPS** in production environments
9. **Implement proper error handling** with custom exceptions
10. **Write comprehensive unit tests** for all operations

## Troubleshooting

### SSL Certificate Errors

```csharp
// Development only - bypass SSL validation
var handler = new HttpClientHandler
{
    ServerCertificateCustomValidationCallback = 
        HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
};

var httpClient = new HttpClient(handler);
```

### Timeout Issues

```csharp
// Increase timeout
httpClient.Timeout = TimeSpan.FromSeconds(60);
```

### Serialization Issues

```csharp
// Configure JSON options
var options = new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};
```

## Next Steps

- [Java Integration](java.md) - Java implementation
- [API Reference](../api-reference/rest-api.md) - Complete API documentation
- [Best Practices](../guides/best-practices.md) - Security and optimization tips
- [Error Codes](../api-reference/error-codes.md) - Complete error code reference
