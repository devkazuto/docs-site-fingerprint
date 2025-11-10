---
sidebar_position: 7
title: Laravel Integration
description: Complete guide for integrating the Fingerprint Service with Laravel
---

# Laravel Integration

## Overview

This guide demonstrates how to integrate the Fingerprint Service API into Laravel applications using service providers, facades, and middleware. We'll create a Laravel package-style integration that follows Laravel best practices.

## Prerequisites

- Laravel 9.x or higher (Laravel 10+ recommended)
- PHP 8.0 or higher
- Composer
- Fingerprint Service running and accessible

## Installation

### Install Guzzle HTTP Client

```bash
composer require guzzlehttp/guzzle:^7.0
```

## Configuration

### Create Configuration File

Create `config/fingerprint.php`:

```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Fingerprint Service Base URL
    |--------------------------------------------------------------------------
    |
    | The base URL where your fingerprint service is running.
    |
    */
    'base_url' => env('FINGERPRINT_BASE_URL', 'http://localhost:8080'),

    /*
    |--------------------------------------------------------------------------
    | API Key
    |--------------------------------------------------------------------------
    |
    | Your API key for authenticating with the fingerprint service.
    |
    */
    'api_key' => env('FINGERPRINT_API_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Request Timeout
    |--------------------------------------------------------------------------
    |
    | Maximum time in seconds to wait for API responses.
    |
    */
    'timeout' => env('FINGERPRINT_TIMEOUT', 30),

    /*
    |--------------------------------------------------------------------------
    | Quality Thresholds
    |--------------------------------------------------------------------------
    |
    | Minimum quality scores for fingerprint operations.
    |
    */
    'quality' => [
        'enrollment' => env('FINGERPRINT_MIN_ENROLLMENT_QUALITY', 60),
        'verification' => env('FINGERPRINT_MIN_VERIFICATION_QUALITY', 50),
    ],

    /*
    |--------------------------------------------------------------------------
    | Confidence Threshold
    |--------------------------------------------------------------------------
    |
    | Minimum confidence percentage for successful verification.
    |
    */
    'min_confidence' => env('FINGERPRINT_MIN_CONFIDENCE', 80.0),

    /*
    |--------------------------------------------------------------------------
    | Retry Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for automatic retry logic.
    |
    */
    'retry' => [
        'max_attempts' => env('FINGERPRINT_MAX_RETRIES', 3),
        'initial_delay' => env('FINGERPRINT_RETRY_DELAY', 1),
    ],

    /*
    |--------------------------------------------------------------------------
    | Scan Timeout
    |--------------------------------------------------------------------------
    |
    | Maximum time in seconds to wait for fingerprint scan completion.
    |
    */
    'scan_timeout' => env('FINGERPRINT_SCAN_TIMEOUT', 30),
];
```

### Update Environment Variables

Add to your `.env` file:

```env
FINGERPRINT_BASE_URL=http://localhost:8080
FINGERPRINT_API_KEY=your-api-key-here
FINGERPRINT_TIMEOUT=30
FINGERPRINT_MIN_ENROLLMENT_QUALITY=60
FINGERPRINT_MIN_VERIFICATION_QUALITY=50
FINGERPRINT_MIN_CONFIDENCE=80.0
FINGERPRINT_MAX_RETRIES=3
FINGERPRINT_SCAN_TIMEOUT=30
```

## Service Implementation

### Create Fingerprint Service

Create `app/Services/FingerprintService.php`:

```php
<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;
use App\Exceptions\FingerprintException;

class FingerprintService
{
    protected Client $client;
    protected array $config;

    public function __construct()
    {
        $this->config = config('fingerprint');
        
        $this->client = new Client([
            'base_uri' => $this->config['base_url'],
            'timeout' => $this->config['timeout'],
            'headers' => [
                'X-API-Key' => $this->config['api_key'],
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ],
        ]);
    }

    /**
     * Make HTTP request to the API
     */
    protected function request(string $method, string $uri, array $options = []): array
    {
        try {
            $response = $this->client->request($method, $uri, $options);
            $body = (string) $response->getBody();
            return json_decode($body, true) ?? [];
        } catch (RequestException $e) {
            $this->handleException($e);
        }
    }

    /**
     * Handle request exceptions
     */
    protected function handleException(RequestException $e): void
    {
        if ($e->hasResponse()) {
            $response = $e->getResponse();
            $body = json_decode((string) $response->getBody(), true);
            $message = $body['error']['message'] ?? $e->getMessage();
            $code = $body['error']['code'] ?? $response->getStatusCode();
            
            Log::error('Fingerprint API Error', [
                'message' => $message,
                'code' => $code,
                'uri' => $e->getRequest()->getUri(),
            ]);
            
            throw new FingerprintException($message, $code, $e);
        }

        Log::error('Fingerprint Request Failed', ['message' => $e->getMessage()]);
        throw new FingerprintException($e->getMessage(), 0, $e);
    }

    /**
     * List all connected devices
     */
    public function listDevices(): array
    {
        return $this->request('GET', '/api/devices');
    }

    /**
     * Get device information
     */
    public function getDeviceInfo(string $deviceId): array
    {
        return $this->request('GET', "/api/devices/{$deviceId}/info");
    }

    /**
     * Test device connection
     */
    public function testDevice(string $deviceId): array
    {
        return $this->request('POST', "/api/devices/{$deviceId}/test");
    }

    /**
     * Enroll a new fingerprint
     */
    public function enrollFingerprint(string $deviceId, string $userId, ?array $metadata = null): array
    {
        $data = [
            'deviceId' => $deviceId,
            'userId' => $userId,
        ];

        if ($metadata !== null) {
            $data['metadata'] = $metadata;
        }

        $result = $this->request('POST', '/api/fingerprint/enroll', ['json' => $data]);
        
        // Validate quality
        $this->validateEnrollmentQuality($result);
        
        return $result;
    }

    /**
     * Verify fingerprint (1:1 matching)
     */
    public function verifyFingerprint(string $template, string $userId, string $deviceId): array
    {
        $result = $this->request('POST', '/api/fingerprint/verify', [
            'json' => [
                'template' => $template,
                'userId' => $userId,
                'deviceId' => $deviceId,
            ],
        ]);

        // Validate confidence
        if ($result['match'] && $result['confidence'] < $this->config['min_confidence']) {
            Log::warning('Low confidence verification', [
                'userId' => $userId,
                'confidence' => $result['confidence'],
            ]);
        }

        return $result;
    }

    /**
     * Identify fingerprint (1:N matching)
     */
    public function identifyFingerprint(string $template, string $deviceId): array
    {
        return $this->request('POST', '/api/fingerprint/identify', [
            'json' => [
                'template' => $template,
                'deviceId' => $deviceId,
            ],
        ]);
    }

    /**
     * Start a scan session
     */
    public function startScan(?string $deviceId = null): array
    {
        $options = [];
        if ($deviceId !== null) {
            $options['query'] = ['deviceId' => $deviceId];
        }

        return $this->request('GET', '/api/fingerprint/scan/start', $options);
    }

    /**
     * Get scan status
     */
    public function getScanStatus(string $scanId): array
    {
        return $this->request('GET', "/api/fingerprint/scan/status/{$scanId}");
    }

    /**
     * Wait for scan completion with polling
     */
    public function waitForScan(string $scanId, ?int $maxWaitSeconds = null): array
    {
        $maxWaitSeconds = $maxWaitSeconds ?? $this->config['scan_timeout'];
        $startTime = time();

        while (time() - $startTime < $maxWaitSeconds) {
            $status = $this->getScanStatus($scanId);

            if ($status['status'] === 'complete') {
                return $status;
            }

            if ($status['status'] === 'error') {
                throw new FingerprintException('Scan failed: ' . ($status['error'] ?? 'Unknown error'));
            }

            usleep(500000); // Wait 500ms
        }

        throw new FingerprintException('Scan timeout');
    }

    /**
     * Get service health status
     */
    public function getHealth(): array
    {
        return $this->request('GET', '/api/health');
    }

    /**
     * Validate enrollment quality
     */
    protected function validateEnrollmentQuality(array $result): void
    {
        $minQuality = $this->config['quality']['enrollment'];
        
        if ($result['quality'] < $minQuality) {
            throw new FingerprintException(
                "Quality too low for enrollment: {$result['quality']} (minimum: {$minQuality})"
            );
        }
    }
}
```

### Create Custom Exception

Create `app/Exceptions/FingerprintException.php`:

```php
<?php

namespace App\Exceptions;

use Exception;

class FingerprintException extends Exception
{
    public function report(): void
    {
        // Log the exception
        \Log::error('Fingerprint Exception', [
            'message' => $this->getMessage(),
            'code' => $this->getCode(),
        ]);
    }

    public function render($request)
    {
        if ($request->expectsJson()) {
            return response()->json([
                'error' => [
                    'message' => $this->getMessage(),
                    'code' => $this->getCode(),
                ],
            ], $this->getCode() >= 400 && $this->getCode() < 600 ? $this->getCode() : 500);
        }

        return redirect()->back()->withErrors([
            'fingerprint' => $this->getMessage(),
        ]);
    }
}
```

## Service Provider

### Create Fingerprint Service Provider

Create `app/Providers/FingerprintServiceProvider.php`:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\FingerprintService;

class FingerprintServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(FingerprintService::class, function ($app) {
            return new FingerprintService();
        });

        $this->app->alias(FingerprintService::class, 'fingerprint');
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Publish configuration
        $this->publishes([
            __DIR__.'/../../config/fingerprint.php' => config_path('fingerprint.php'),
        ], 'fingerprint-config');
    }
}
```

### Register Service Provider

Add to `config/app.php` in the `providers` array:

```php
'providers' => [
    // Other providers...
    App\Providers\FingerprintServiceProvider::class,
],
```

Or in Laravel 11+, add to `bootstrap/providers.php`:

```php
return [
    App\Providers\FingerprintServiceProvider::class,
];
```

## Facade

### Create Fingerprint Facade

Create `app/Facades/Fingerprint.php`:

```php
<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static array listDevices()
 * @method static array getDeviceInfo(string $deviceId)
 * @method static array testDevice(string $deviceId)
 * @method static array enrollFingerprint(string $deviceId, string $userId, ?array $metadata = null)
 * @method static array verifyFingerprint(string $template, string $userId, string $deviceId)
 * @method static array identifyFingerprint(string $template, string $deviceId)
 * @method static array startScan(?string $deviceId = null)
 * @method static array getScanStatus(string $scanId)
 * @method static array waitForScan(string $scanId, ?int $maxWaitSeconds = null)
 * @method static array getHealth()
 *
 * @see \App\Services\FingerprintService
 */
class Fingerprint extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'fingerprint';
    }
}
```

### Register Facade Alias

Add to `config/app.php` in the `aliases` array:

```php
'aliases' => [
    // Other aliases...
    'Fingerprint' => App\Facades\Fingerprint::class,
],
```

## Middleware

### Create API Authentication Middleware

Create `app/Http/Middleware/FingerprintAuth.php`:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class FingerprintAuth
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-Fingerprint-API-Key');

        if (!$apiKey || $apiKey !== config('fingerprint.api_key')) {
            return response()->json([
                'error' => [
                    'message' => 'Invalid or missing API key',
                    'code' => 401,
                ],
            ], 401);
        }

        return $next($request);
    }
}
```

### Register Middleware

Add to `app/Http/Kernel.php`:

```php
protected $middlewareAliases = [
    // Other middleware...
    'fingerprint.auth' => \App\Http\Middleware\FingerprintAuth::class,
];
```

Or in Laravel 11+, add to `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'fingerprint.auth' => \App\Http\Middleware\FingerprintAuth::class,
    ]);
})
```

## Database Migration

### Create Fingerprint Templates Table

```bash
php artisan make:migration create_fingerprint_templates_table
```

Edit the migration file:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fingerprint_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->text('template');
            $table->integer('quality');
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            $table->index('user_id');
        });

        Schema::create('fingerprint_auth_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->decimal('confidence', 5, 2)->nullable();
            $table->boolean('success')->default(false);
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
            
            $table->index('user_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fingerprint_auth_logs');
        Schema::dropIfExists('fingerprint_templates');
    }
};
```

Run the migration:

```bash
php artisan migrate
```

## Models

### Create FingerprintTemplate Model

```bash
php artisan make:model FingerprintTemplate
```

Edit `app/Models/FingerprintTemplate.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FingerprintTemplate extends Model
{
    protected $fillable = [
        'user_id',
        'template',
        'quality',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'quality' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

### Update User Model

Add to `app/Models/User.php`:

```php
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

public function fingerprintTemplate(): HasOne
{
    return $this->hasOne(FingerprintTemplate::class);
}

public function fingerprintAuthLogs(): HasMany
{
    return $this->hasMany(FingerprintAuthLog::class);
}
```

## Controllers

### Create Fingerprint Controller

```bash
php artisan make:controller FingerprintController
```

Edit `app/Http/Controllers/FingerprintController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Facades\Fingerprint;
use App\Models\FingerprintTemplate;
use App\Models\User;
use App\Exceptions\FingerprintException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FingerprintController extends Controller
{
    /**
     * List all connected devices
     */
    public function listDevices(): JsonResponse
    {
        try {
            $devices = Fingerprint::listDevices();
            return response()->json($devices);
        } catch (FingerprintException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enroll a new fingerprint for a user
     */
    public function enroll(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'device_id' => 'required|string',
            'metadata' => 'nullable|array',
        ]);

        try {
            $user = User::findOrFail($request->user_id);

            // Check if user already has a fingerprint
            if ($user->fingerprintTemplate) {
                return response()->json([
                    'error' => 'User already has a fingerprint enrolled',
                ], 400);
            }

            // Enroll fingerprint
            $result = Fingerprint::enrollFingerprint(
                $request->device_id,
                "user-{$user->id}",
                $request->metadata
            );

            // Store template in database
            $template = FingerprintTemplate::create([
                'user_id' => $user->id,
                'template' => $result['template'],
                'quality' => $result['quality'],
                'metadata' => $request->metadata,
            ]);

            Log::info('Fingerprint enrolled', [
                'user_id' => $user->id,
                'quality' => $result['quality'],
            ]);

            return response()->json([
                'message' => 'Fingerprint enrolled successfully',
                'quality' => $result['quality'],
                'template_id' => $template->id,
            ], 201);

        } catch (FingerprintException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Authenticate user with fingerprint
     */
    public function authenticate(Request $request): JsonResponse
    {
        $request->validate([
            'device_id' => 'required|string',
        ]);

        try {
            // Start scan
            $scan = Fingerprint::startScan($request->device_id);
            
            // Wait for scan completion
            $scanResult = Fingerprint::waitForScan($scan['scanId']);

            // Identify user
            $identification = Fingerprint::identifyFingerprint(
                $scanResult['template'],
                $request->device_id
            );

            if (!$identification['match']) {
                // Log failed attempt
                DB::table('fingerprint_auth_logs')->insert([
                    'user_id' => null,
                    'success' => false,
                    'ip_address' => $request->ip(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                return response()->json([
                    'message' => 'User not found',
                    'match' => false,
                ], 404);
            }

            // Extract user ID
            $serviceUserId = $identification['userId'];
            $userId = (int) str_replace('user-', '', $serviceUserId);
            $user = User::find($userId);

            if (!$user) {
                return response()->json([
                    'message' => 'User not found in database',
                    'match' => false,
                ], 404);
            }

            // Log successful authentication
            DB::table('fingerprint_auth_logs')->insert([
                'user_id' => $user->id,
                'confidence' => $identification['confidence'],
                'success' => true,
                'ip_address' => $request->ip(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info('Fingerprint authentication successful', [
                'user_id' => $user->id,
                'confidence' => $identification['confidence'],
            ]);

            return response()->json([
                'message' => 'Authentication successful',
                'match' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'confidence' => $identification['confidence'],
            ]);

        } catch (FingerprintException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Verify fingerprint for a specific user
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'device_id' => 'required|string',
        ]);

        try {
            $user = User::findOrFail($request->user_id);
            $template = $user->fingerprintTemplate;

            if (!$template) {
                return response()->json([
                    'error' => 'User does not have a fingerprint enrolled',
                ], 404);
            }

            // Start scan
            $scan = Fingerprint::startScan($request->device_id);
            $scanResult = Fingerprint::waitForScan($scan['scanId']);

            // Verify fingerprint
            $verification = Fingerprint::verifyFingerprint(
                $scanResult['template'],
                "user-{$user->id}",
                $request->device_id
            );

            // Log verification attempt
            DB::table('fingerprint_auth_logs')->insert([
                'user_id' => $user->id,
                'confidence' => $verification['confidence'] ?? null,
                'success' => $verification['match'],
                'ip_address' => $request->ip(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'match' => $verification['match'],
                'confidence' => $verification['confidence'] ?? null,
            ]);

        } catch (FingerprintException $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Delete user's fingerprint template
     */
    public function delete(Request $request, int $userId): JsonResponse
    {
        try {
            $user = User::findOrFail($userId);
            $template = $user->fingerprintTemplate;

            if (!$template) {
                return response()->json([
                    'error' => 'User does not have a fingerprint enrolled',
                ], 404);
            }

            $template->delete();

            Log::info('Fingerprint template deleted', ['user_id' => $user->id]);

            return response()->json([
                'message' => 'Fingerprint template deleted successfully',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
```

## Routes

### Define API Routes

Add to `routes/api.php`:

```php
<?php

use App\Http\Controllers\FingerprintController;
use Illuminate\Support\Facades\Route;

Route::prefix('fingerprint')->middleware('fingerprint.auth')->group(function () {
    Route::get('/devices', [FingerprintController::class, 'listDevices']);
    Route::post('/enroll', [FingerprintController::class, 'enroll']);
    Route::post('/authenticate', [FingerprintController::class, 'authenticate']);
    Route::post('/verify', [FingerprintController::class, 'verify']);
    Route::delete('/users/{userId}', [FingerprintController::class, 'delete']);
});
```

## Usage Examples

### Using Dependency Injection

```php
<?php

namespace App\Http\Controllers;

use App\Services\FingerprintService;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        protected FingerprintService $fingerprint
    ) {}

    public function enrollFingerprint(Request $request)
    {
        $result = $this->fingerprint->enrollFingerprint(
            $request->device_id,
            "user-{$request->user()->id}",
            ['name' => $request->user()->name]
        );

        return response()->json($result);
    }
}
```

### Using Facade

```php
<?php

use App\Facades\Fingerprint;

// List devices
$devices = Fingerprint::listDevices();

// Enroll fingerprint
$result = Fingerprint::enrollFingerprint(
    'device-001',
    'user-123',
    ['name' => 'John Doe']
);

// Verify fingerprint
$verification = Fingerprint::verifyFingerprint(
    $template,
    'user-123',
    'device-001'
);
```

### Using Service Container

```php
<?php

$fingerprint = app(FingerprintService::class);
$devices = $fingerprint->listDevices();
```

## Advanced Features

### Create Fingerprint Repository

Create `app/Repositories/FingerprintRepository.php`:

```php
<?php

namespace App\Repositories;

use App\Models\User;
use App\Models\FingerprintTemplate;
use App\Facades\Fingerprint;
use App\Exceptions\FingerprintException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FingerprintRepository
{
    /**
     * Enroll user with fingerprint
     */
    public function enrollUser(User $user, string $deviceId, ?array $metadata = null): FingerprintTemplate
    {
        if ($user->fingerprintTemplate) {
            throw new FingerprintException('User already has a fingerprint enrolled');
        }

        return DB::transaction(function () use ($user, $deviceId, $metadata) {
            $result = Fingerprint::enrollFingerprint(
                $deviceId,
                "user-{$user->id}",
                $metadata
            );

            $template = FingerprintTemplate::create([
                'user_id' => $user->id,
                'template' => $result['template'],
                'quality' => $result['quality'],
                'metadata' => $metadata,
            ]);

            Log::info('User enrolled with fingerprint', [
                'user_id' => $user->id,
                'quality' => $result['quality'],
            ]);

            return $template;
        });
    }

    /**
     * Authenticate user with fingerprint scan
     */
    public function authenticateWithScan(string $deviceId, string $ipAddress): ?array
    {
        try {
            // Start scan
            $scan = Fingerprint::startScan($deviceId);
            $scanResult = Fingerprint::waitForScan($scan['scanId']);

            // Identify user
            $identification = Fingerprint::identifyFingerprint(
                $scanResult['template'],
                $deviceId
            );

            if (!$identification['match']) {
                $this->logAuthAttempt(null, false, $ipAddress);
                return null;
            }

            // Extract user ID
            $userId = (int) str_replace('user-', '', $identification['userId']);
            $user = User::find($userId);

            if (!$user) {
                return null;
            }

            $this->logAuthAttempt($user->id, true, $ipAddress, $identification['confidence']);

            return [
                'user' => $user,
                'confidence' => $identification['confidence'],
            ];

        } catch (FingerprintException $e) {
            Log::error('Fingerprint authentication failed', [
                'error' => $e->getMessage(),
                'device_id' => $deviceId,
            ]);
            throw $e;
        }
    }

    /**
     * Verify user's fingerprint
     */
    public function verifyUser(User $user, string $deviceId, string $ipAddress): bool
    {
        $template = $user->fingerprintTemplate;

        if (!$template) {
            throw new FingerprintException('User does not have a fingerprint enrolled');
        }

        try {
            $scan = Fingerprint::startScan($deviceId);
            $scanResult = Fingerprint::waitForScan($scan['scanId']);

            $verification = Fingerprint::verifyFingerprint(
                $scanResult['template'],
                "user-{$user->id}",
                $deviceId
            );

            $this->logAuthAttempt(
                $user->id,
                $verification['match'],
                $ipAddress,
                $verification['confidence'] ?? null
            );

            return $verification['match'];

        } catch (FingerprintException $e) {
            Log::error('Fingerprint verification failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Delete user's fingerprint template
     */
    public function deleteUserTemplate(User $user): bool
    {
        $template = $user->fingerprintTemplate;

        if (!$template) {
            return false;
        }

        $template->delete();

        Log::info('Fingerprint template deleted', ['user_id' => $user->id]);

        return true;
    }

    /**
     * Log authentication attempt
     */
    protected function logAuthAttempt(?int $userId, bool $success, string $ipAddress, ?float $confidence = null): void
    {
        DB::table('fingerprint_auth_logs')->insert([
            'user_id' => $userId,
            'success' => $success,
            'confidence' => $confidence,
            'ip_address' => $ipAddress,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
```

### Create Form Requests

Create `app/Http/Requests/EnrollFingerprintRequest.php`:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EnrollFingerprintRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => 'required|exists:users,id',
            'device_id' => 'required|string|max:255',
            'metadata' => 'nullable|array',
            'metadata.name' => 'nullable|string|max:255',
            'metadata.department' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => 'User ID is required',
            'user_id.exists' => 'User not found',
            'device_id.required' => 'Device ID is required',
        ];
    }
}
```

### Create Events

Create `app/Events/FingerprintEnrolled.php`:

```php
<?php

namespace App\Events;

use App\Models\User;
use App\Models\FingerprintTemplate;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FingerprintEnrolled
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public User $user,
        public FingerprintTemplate $template
    ) {}
}
```

Create `app/Events/FingerprintAuthenticated.php`:

```php
<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FingerprintAuthenticated
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public User $user,
        public float $confidence,
        public string $ipAddress
    ) {}
}
```

### Create Listeners

Create `app/Listeners/SendEnrollmentNotification.php`:

```php
<?php

namespace App\Listeners;

use App\Events\FingerprintEnrolled;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendEnrollmentNotification
{
    public function handle(FingerprintEnrolled $event): void
    {
        Log::info('Fingerprint enrolled', [
            'user_id' => $event->user->id,
            'quality' => $event->template->quality,
        ]);

        // Send email notification
        // Mail::to($event->user->email)->send(new FingerprintEnrolledMail($event->user));
    }
}
```

### Register Events and Listeners

Add to `app/Providers/EventServiceProvider.php`:

```php
protected $listen = [
    FingerprintEnrolled::class => [
        SendEnrollmentNotification::class,
    ],
    FingerprintAuthenticated::class => [
        LogAuthenticationAttempt::class,
    ],
];
```

## Testing

### Feature Test Example

Create `tests/Feature/FingerprintTest.php`:

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Facades\Fingerprint;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FingerprintTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_devices(): void
    {
        Fingerprint::shouldReceive('listDevices')
            ->once()
            ->andReturn([
                ['id' => 'device-001', 'name' => 'Test Device'],
            ]);

        $response = $this->getJson('/api/fingerprint/devices', [
            'X-Fingerprint-API-Key' => config('fingerprint.api_key'),
        ]);

        $response->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_can_enroll_fingerprint(): void
    {
        $user = User::factory()->create();

        Fingerprint::shouldReceive('enrollFingerprint')
            ->once()
            ->with('device-001', "user-{$user->id}", ['name' => 'Test User'])
            ->andReturn([
                'template' => 'base64-encoded-template',
                'quality' => 85,
            ]);

        $response = $this->postJson('/api/fingerprint/enroll', [
            'user_id' => $user->id,
            'device_id' => 'device-001',
            'metadata' => ['name' => 'Test User'],
        ], [
            'X-Fingerprint-API-Key' => config('fingerprint.api_key'),
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Fingerprint enrolled successfully',
                'quality' => 85,
            ]);

        $this->assertDatabaseHas('fingerprint_templates', [
            'user_id' => $user->id,
            'quality' => 85,
        ]);
    }

    public function test_cannot_enroll_duplicate_fingerprint(): void
    {
        $user = User::factory()->create();
        $user->fingerprintTemplate()->create([
            'template' => 'existing-template',
            'quality' => 80,
        ]);

        $response = $this->postJson('/api/fingerprint/enroll', [
            'user_id' => $user->id,
            'device_id' => 'device-001',
        ], [
            'X-Fingerprint-API-Key' => config('fingerprint.api_key'),
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'error' => 'User already has a fingerprint enrolled',
            ]);
    }

    public function test_requires_api_key(): void
    {
        $response = $this->getJson('/api/fingerprint/devices');

        $response->assertStatus(401)
            ->assertJson([
                'error' => [
                    'message' => 'Invalid or missing API key',
                ],
            ]);
    }
}
```

### Unit Test Example

Create `tests/Unit/FingerprintServiceTest.php`:

```php
<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\FingerprintService;
use App\Exceptions\FingerprintException;

class FingerprintServiceTest extends TestCase
{
    protected FingerprintService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new FingerprintService();
    }

    public function test_validates_enrollment_quality(): void
    {
        $this->expectException(FingerprintException::class);
        $this->expectExceptionMessage('Quality too low for enrollment');

        // This would need to be tested with a mock
        // or by calling the protected method via reflection
    }
}
```

## Complete Example: Authentication System

### Create Authentication Controller

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Repositories\FingerprintRepository;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FingerprintAuthController extends Controller
{
    public function __construct(
        protected FingerprintRepository $fingerprintRepo
    ) {}

    /**
     * Show fingerprint enrollment page
     */
    public function showEnrollment()
    {
        return view('auth.fingerprint-enroll');
    }

    /**
     * Enroll user's fingerprint
     */
    public function enroll(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string',
        ]);

        try {
            $user = Auth::user();
            
            $template = $this->fingerprintRepo->enrollUser(
                $user,
                $request->device_id,
                ['name' => $user->name]
            );

            return response()->json([
                'message' => 'Fingerprint enrolled successfully',
                'quality' => $template->quality,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Show fingerprint login page
     */
    public function showLogin()
    {
        return view('auth.fingerprint-login');
    }

    /**
     * Login with fingerprint
     */
    public function login(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string',
        ]);

        try {
            $result = $this->fingerprintRepo->authenticateWithScan(
                $request->device_id,
                $request->ip()
            );

            if (!$result) {
                return response()->json([
                    'message' => 'Authentication failed',
                ], 401);
            }

            Auth::login($result['user']);

            return response()->json([
                'message' => 'Login successful',
                'user' => $result['user'],
                'confidence' => $result['confidence'],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}
```

### Create Blade Views

Create `resources/views/auth/fingerprint-login.blade.php`:

```blade
@extends('layouts.app')

@section('content')
<div class="container">
    <div class="row justify-content-center">
        <div class="col-md-8">
            <div class="card">
                <div class="card-header">Fingerprint Login</div>

                <div class="card-body">
                    <div id="status" class="alert alert-info">
                        Place your finger on the scanner...
                    </div>

                    <div class="text-center">
                        <button id="loginBtn" class="btn btn-primary btn-lg">
                            Start Fingerprint Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.getElementById('loginBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const btn = document.getElementById('loginBtn');
    
    btn.disabled = true;
    statusDiv.className = 'alert alert-info';
    statusDiv.textContent = 'Scanning fingerprint...';

    try {
        const response = await fetch('/api/auth/fingerprint/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            },
            body: JSON.stringify({
                device_id: 'device-001' // Get from device selection
            })
        });

        const data = await response.json();

        if (response.ok) {
            statusDiv.className = 'alert alert-success';
            statusDiv.textContent = `Welcome! Confidence: ${data.confidence}%`;
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            statusDiv.className = 'alert alert-danger';
            statusDiv.textContent = data.error || 'Authentication failed';
            btn.disabled = false;
        }
    } catch (error) {
        statusDiv.className = 'alert alert-danger';
        statusDiv.textContent = 'Error: ' + error.message;
        btn.disabled = false;
    }
});
</script>
@endsection
```

### Add Authentication Routes

Add to `routes/web.php`:

```php
use App\Http\Controllers\Auth\FingerprintAuthController;

Route::middleware('guest')->group(function () {
    Route::get('/login/fingerprint', [FingerprintAuthController::class, 'showLogin'])
        ->name('fingerprint.login');
});

Route::middleware('auth')->group(function () {
    Route::get('/fingerprint/enroll', [FingerprintAuthController::class, 'showEnrollment'])
        ->name('fingerprint.enroll');
});
```

Add to `routes/api.php`:

```php
use App\Http\Controllers\Auth\FingerprintAuthController;

Route::prefix('auth/fingerprint')->group(function () {
    Route::post('/login', [FingerprintAuthController::class, 'login']);
    Route::post('/enroll', [FingerprintAuthController::class, 'enroll'])
        ->middleware('auth:sanctum');
});
```

## Artisan Commands

### Create Fingerprint Management Command

```bash
php artisan make:command FingerprintManage
```

Edit `app/Console/Commands/FingerprintManage.php`:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Facades\Fingerprint;
use App\Models\User;
use App\Repositories\FingerprintRepository;

class FingerprintManage extends Command
{
    protected $signature = 'fingerprint:manage 
                            {action : Action to perform (list-devices, enroll, delete)}
                            {--user= : User ID for enroll/delete actions}
                            {--device= : Device ID for enrollment}';

    protected $description = 'Manage fingerprint operations';

    public function __construct(
        protected FingerprintRepository $fingerprintRepo
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $action = $this->argument('action');

        return match($action) {
            'list-devices' => $this->listDevices(),
            'enroll' => $this->enrollUser(),
            'delete' => $this->deleteTemplate(),
            default => $this->error("Unknown action: {$action}"),
        };
    }

    protected function listDevices(): int
    {
        try {
            $devices = Fingerprint::listDevices();

            if (empty($devices)) {
                $this->warn('No devices connected');
                return 0;
            }

            $this->info('Connected Devices:');
            foreach ($devices as $device) {
                $this->line("  - {$device['id']}: {$device['name']}");
            }

            return 0;
        } catch (\Exception $e) {
            $this->error("Error: {$e->getMessage()}");
            return 1;
        }
    }

    protected function enrollUser(): int
    {
        $userId = $this->option('user');
        $deviceId = $this->option('device');

        if (!$userId || !$deviceId) {
            $this->error('Both --user and --device options are required');
            return 1;
        }

        try {
            $user = User::findOrFail($userId);

            $this->info("Enrolling fingerprint for user: {$user->name}");
            $this->info('Place finger on scanner...');

            $template = $this->fingerprintRepo->enrollUser(
                $user,
                $deviceId,
                ['name' => $user->name]
            );

            $this->info("✓ Enrollment successful! Quality: {$template->quality}");
            return 0;

        } catch (\Exception $e) {
            $this->error("Error: {$e->getMessage()}");
            return 1;
        }
    }

    protected function deleteTemplate(): int
    {
        $userId = $this->option('user');

        if (!$userId) {
            $this->error('--user option is required');
            return 1;
        }

        try {
            $user = User::findOrFail($userId);

            if ($this->fingerprintRepo->deleteUserTemplate($user)) {
                $this->info("✓ Fingerprint template deleted for user: {$user->name}");
                return 0;
            }

            $this->warn('User does not have a fingerprint enrolled');
            return 0;

        } catch (\Exception $e) {
            $this->error("Error: {$e->getMessage()}");
            return 1;
        }
    }
}
```

### Usage

```bash
# List connected devices
php artisan fingerprint:manage list-devices

# Enroll user fingerprint
php artisan fingerprint:manage enroll --user=1 --device=device-001

# Delete user fingerprint
php artisan fingerprint:manage delete --user=1
```

## Queue Jobs

### Create Fingerprint Enrollment Job

```bash
php artisan make:job ProcessFingerprintEnrollment
```

Edit `app/Jobs/ProcessFingerprintEnrollment.php`:

```php
<?php

namespace App\Jobs;

use App\Models\User;
use App\Repositories\FingerprintRepository;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessFingerprintEnrollment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $deviceId,
        public ?array $metadata = null
    ) {}

    public function handle(FingerprintRepository $fingerprintRepo): void
    {
        try {
            $template = $fingerprintRepo->enrollUser(
                $this->user,
                $this->deviceId,
                $this->metadata
            );

            Log::info('Fingerprint enrollment job completed', [
                'user_id' => $this->user->id,
                'quality' => $template->quality,
            ]);

        } catch (\Exception $e) {
            Log::error('Fingerprint enrollment job failed', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Fingerprint enrollment job failed permanently', [
            'user_id' => $this->user->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

### Dispatch Job

```php
use App\Jobs\ProcessFingerprintEnrollment;

ProcessFingerprintEnrollment::dispatch($user, 'device-001', ['name' => $user->name]);
```

## Caching

### Cache Device Information

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class CachedFingerprintService extends FingerprintService
{
    /**
     * List devices with caching
     */
    public function listDevices(): array
    {
        return Cache::remember('fingerprint:devices', 300, function () {
            return parent::listDevices();
        });
    }

    /**
     * Get device info with caching
     */
    public function getDeviceInfo(string $deviceId): array
    {
        return Cache::remember("fingerprint:device:{$deviceId}", 300, function () use ($deviceId) {
            return parent::getDeviceInfo($deviceId);
        });
    }

    /**
     * Clear device cache
     */
    public function clearDeviceCache(?string $deviceId = null): void
    {
        if ($deviceId) {
            Cache::forget("fingerprint:device:{$deviceId}");
        } else {
            Cache::forget('fingerprint:devices');
        }
    }
}
```

## Logging and Monitoring

### Create Custom Log Channel

Add to `config/logging.php`:

```php
'channels' => [
    // Other channels...
    
    'fingerprint' => [
        'driver' => 'daily',
        'path' => storage_path('logs/fingerprint.log'),
        'level' => env('LOG_LEVEL', 'debug'),
        'days' => 14,
    ],
],
```

### Use Custom Logger

```php
use Illuminate\Support\Facades\Log;

Log::channel('fingerprint')->info('Fingerprint operation', [
    'user_id' => $userId,
    'action' => 'enrollment',
    'quality' => $quality,
]);
```

## Best Practices

### 1. Environment Configuration

Always use environment variables for sensitive configuration:

```env
FINGERPRINT_BASE_URL=https://fingerprint.example.com
FINGERPRINT_API_KEY=your-secure-api-key
```

### 2. Error Handling

Use try-catch blocks and log errors appropriately:

```php
try {
    $result = Fingerprint::enrollFingerprint($deviceId, $userId);
} catch (FingerprintException $e) {
    Log::error('Enrollment failed', [
        'user_id' => $userId,
        'error' => $e->getMessage(),
    ]);
    
    return response()->json(['error' => 'Enrollment failed'], 500);
}
```

### 3. Database Transactions

Use transactions when modifying multiple tables:

```php
DB::transaction(function () use ($user, $deviceId) {
    $result = Fingerprint::enrollFingerprint($deviceId, "user-{$user->id}");
    
    FingerprintTemplate::create([
        'user_id' => $user->id,
        'template' => $result['template'],
        'quality' => $result['quality'],
    ]);
});
```

### 4. Validation

Always validate input data:

```php
$request->validate([
    'user_id' => 'required|exists:users,id',
    'device_id' => 'required|string|max:255',
    'metadata' => 'nullable|array',
]);
```

### 5. Rate Limiting

Implement rate limiting on API endpoints:

```php
Route::middleware(['throttle:10,1'])->group(function () {
    Route::post('/fingerprint/enroll', [FingerprintController::class, 'enroll']);
});
```

### 6. Queue Long-Running Operations

Use queues for operations that might take time:

```php
ProcessFingerprintEnrollment::dispatch($user, $deviceId)->onQueue('fingerprint');
```

### 7. Cache Frequently Accessed Data

Cache device information to reduce API calls:

```php
$devices = Cache::remember('devices', 300, fn() => Fingerprint::listDevices());
```

### 8. Audit Logging

Log all authentication attempts for security:

```php
DB::table('fingerprint_auth_logs')->insert([
    'user_id' => $userId,
    'success' => $success,
    'ip_address' => $request->ip(),
    'created_at' => now(),
]);
```

### 9. Use Dependency Injection

Prefer dependency injection over facades in classes:

```php
public function __construct(
    protected FingerprintService $fingerprint
) {}
```

### 10. Test Your Integration

Write comprehensive tests for all fingerprint operations:

```php
public function test_can_enroll_fingerprint(): void
{
    Fingerprint::shouldReceive('enrollFingerprint')
        ->once()
        ->andReturn(['template' => 'test', 'quality' => 85]);
    
    // Test your code
}
```

## Troubleshooting

### Service Not Resolving

If the service is not resolving, ensure the service provider is registered:

```bash
php artisan config:clear
php artisan cache:clear
```

### Configuration Not Loading

Publish and verify the configuration file:

```bash
php artisan vendor:publish --tag=fingerprint-config
```

### Database Connection Issues

Ensure migrations are run:

```bash
php artisan migrate
```

### API Key Not Working

Verify the API key in your `.env` file and clear config cache:

```bash
php artisan config:clear
```

### Facade Not Found

Ensure the facade alias is registered in `config/app.php` or use the fully qualified class name.

## Performance Optimization

### 1. Use Eager Loading

```php
$users = User::with('fingerprintTemplate')->get();
```

### 2. Index Database Columns

Ensure proper indexes on frequently queried columns:

```php
$table->index('user_id');
$table->index('created_at');
```

### 3. Cache Results

```php
$devices = Cache::remember('devices', 300, fn() => Fingerprint::listDevices());
```

### 4. Use Queue Workers

```bash
php artisan queue:work --queue=fingerprint
```

## Security Considerations

1. **Always use HTTPS** in production
2. **Store API keys securely** in environment variables
3. **Validate all input** before processing
4. **Implement rate limiting** to prevent abuse
5. **Log authentication attempts** for audit trails
6. **Use middleware** to protect sensitive endpoints
7. **Encrypt sensitive data** in the database
8. **Implement CSRF protection** on web routes
9. **Use API authentication** (Sanctum/Passport) for API routes
10. **Regular security audits** of fingerprint data access

## Next Steps

- [PHP Integration](php.md) - Base PHP implementation
- [Python Integration](python.md) - Python implementation
- [API Reference](../api-reference/rest-api.md) - Complete API documentation
- [Best Practices](../guides/best-practices.md) - Security and optimization tips
- [Error Codes](../api-reference/error-codes.md) - Complete error code reference
