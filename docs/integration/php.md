---
sidebar_position: 6
title: PHP Integration
description: Complete guide for integrating the Fingerprint Service with PHP
---

# PHP Integration

## Overview

This guide demonstrates how to integrate the Fingerprint Service API into PHP applications using both native cURL and the Guzzle HTTP client library. We'll create a robust API client with proper error handling and exception management.

## Prerequisites

- PHP 7.4 or higher (PHP 8.0+ recommended)
- cURL extension enabled (for native implementation)
- Composer (for Guzzle implementation)
- Fingerprint Service running and accessible

## Installation

### Native cURL (No Dependencies)

No installation required - cURL is typically included with PHP.

### Guzzle HTTP Client

```bash
composer require guzzlehttp/guzzle:^7.0
```

## Implementation 1: Native cURL

### API Client Class

Create a file `FingerprintClient.php`:

```php
<?php

class FingerprintClient
{
    private string $baseUrl;
    private string $apiKey;
    private int $timeout;

    public function __construct(string $baseUrl, string $apiKey, int $timeout = 30)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        $this->timeout = $timeout;
    }

    /**
     * Make HTTP request to API
     */
    private function request(string $method, string $endpoint, ?array $data = null): array
    {
        $url = $this->baseUrl . $endpoint;
        $ch = curl_init();

        $headers = [
            'X-API-Key: ' . $this->apiKey,
            'Content-Type: application/json',
            'Accept: application/json'
        ];

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => $method
        ]);

        if ($data !== null && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new FingerprintException("cURL Error: {$error}");
        }

        $decoded = json_decode($response, true);
        
        if ($httpCode >= 400) {
            $message = $decoded['error']['message'] ?? 'Unknown error';
            $code = $decoded['error']['code'] ?? $httpCode;
            throw new FingerprintException($message, $code);
        }

        return $decoded ?? [];
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
            'userId' => $userId
        ];

        if ($metadata !== null) {
            $data['metadata'] = $metadata;
        }

        return $this->request('POST', '/api/fingerprint/enroll', $data);
    }

    /**
     * Verify fingerprint (1:1 matching)
     */
    public function verifyFingerprint(string $template, string $userId, string $deviceId): array
    {
        $data = [
            'template' => $template,
            'userId' => $userId,
            'deviceId' => $deviceId
        ];

        return $this->request('POST', '/api/fingerprint/verify', $data);
    }

    /**
     * Identify fingerprint (1:N matching)
     */
    public function identifyFingerprint(string $template, string $deviceId): array
    {
        $data = [
            'template' => $template,
            'deviceId' => $deviceId
        ];

        return $this->request('POST', '/api/fingerprint/identify', $data);
    }

    /**
     * Start a scan session
     */
    public function startScan(?string $deviceId = null): array
    {
        $endpoint = '/api/fingerprint/scan/start';
        if ($deviceId !== null) {
            $endpoint .= '?deviceId=' . urlencode($deviceId);
        }

        return $this->request('GET', $endpoint);
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
    public function waitForScan(string $scanId, int $maxWaitSeconds = 30): array
    {
        $startTime = time();
        
        while (time() - $startTime < $maxWaitSeconds) {
            $status = $this->getScanStatus($scanId);
            
            if ($status['status'] === 'complete') {
                return $status;
            }
            
            if ($status['status'] === 'error') {
                throw new FingerprintException('Scan failed: ' . ($status['error'] ?? 'Unknown error'));
            }
            
            usleep(500000); // Wait 500ms before next poll
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
}

/**
 * Custom exception for fingerprint operations
 */
class FingerprintException extends Exception
{
    public function __construct(string $message, int $code = 0, ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
```

### Usage Examples

#### Basic Enrollment Flow

```php
<?php

require_once 'FingerprintClient.php';

try {
    $client = new FingerprintClient('http://localhost:8080', 'your-api-key-here');

    // List available devices
    $devices = $client->listDevices();
    if (empty($devices)) {
        throw new Exception('No devices connected');
    }

    $deviceId = $devices[0]['id'];
    echo "Using device: {$deviceId}\n";

    // Start enrollment
    $userId = 'user-' . uniqid();
    $metadata = [
        'name' => 'John Doe',
        'department' => 'Engineering',
        'email' => 'john.doe@example.com'
    ];

    echo "Starting enrollment for user: {$userId}\n";
    $result = $client->enrollFingerprint($deviceId, $userId, $metadata);

    echo "Enrollment successful!\n";
    echo "Quality: {$result['quality']}\n";
    echo "Template: " . substr($result['template'], 0, 50) . "...\n";

    // Store the template in your database
    // saveToDatabase($userId, $result['template'], $metadata);

} catch (FingerprintException $e) {
    echo "Fingerprint Error: {$e->getMessage()} (Code: {$e->getCode()})\n";
} catch (Exception $e) {
    echo "Error: {$e->getMessage()}\n";
}
```

#### Verification Flow

```php
<?php

require_once 'FingerprintClient.php';

try {
    $client = new FingerprintClient('http://localhost:8080', 'your-api-key-here');

    // Get user's stored template from database
    $userId = 'user-12345';
    // $storedTemplate = getTemplateFromDatabase($userId);

    // Start scan
    $scan = $client->startScan();
    echo "Place finger on scanner...\n";

    // Wait for scan completion
    $scanResult = $client->waitForScan($scan['scanId']);
    echo "Scan complete. Quality: {$scanResult['quality']}\n";

    // Verify against stored template
    $verification = $client->verifyFingerprint(
        $scanResult['template'],
        $userId,
        $scan['deviceId']
    );

    if ($verification['match']) {
        echo "✓ Verification successful!\n";
        echo "Confidence: {$verification['confidence']}%\n";
        // Grant access
    } else {
        echo "✗ Verification failed\n";
        // Deny access
    }

} catch (FingerprintException $e) {
    echo "Fingerprint Error: {$e->getMessage()}\n";
} catch (Exception $e) {
    echo "Error: {$e->getMessage()}\n";
}
```

#### Identification Flow

```php
<?php

require_once 'FingerprintClient.php';

try {
    $client = new FingerprintClient('http://localhost:8080', 'your-api-key-here');

    // Start scan
    $scan = $client->startScan();
    echo "Place finger on scanner...\n";

    // Wait for scan completion
    $scanResult = $client->waitForScan($scan['scanId']);
    echo "Scan complete. Quality: {$scanResult['quality']}\n";

    // Identify user
    $identification = $client->identifyFingerprint(
        $scanResult['template'],
        $scan['deviceId']
    );

    if ($identification['match']) {
        echo "✓ User identified!\n";
        echo "User ID: {$identification['userId']}\n";
        echo "Confidence: {$identification['confidence']}%\n";
        
        // Load user details from database
        // $user = getUserFromDatabase($identification['userId']);
        // echo "Welcome, {$user['name']}!\n";
    } else {
        echo "✗ User not found in database\n";
    }

} catch (FingerprintException $e) {
    echo "Fingerprint Error: {$e->getMessage()}\n";
} catch (Exception $e) {
    echo "Error: {$e->getMessage()}\n";
}
```

## Implementation 2: Guzzle HTTP Client

### API Client with Guzzle

Create a file `GuzzleFingerprintClient.php`:

```php
<?php

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Exception\GuzzleException;

class GuzzleFingerprintClient
{
    private Client $client;
    private string $apiKey;

    public function __construct(string $baseUrl, string $apiKey, int $timeout = 30)
    {
        $this->apiKey = $apiKey;
        $this->client = new Client([
            'base_uri' => rtrim($baseUrl, '/'),
            'timeout' => $timeout,
            'headers' => [
                'X-API-Key' => $apiKey,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json'
            ]
        ]);
    }

    /**
     * Make HTTP request
     */
    private function request(string $method, string $uri, array $options = []): array
    {
        try {
            $response = $this->client->request($method, $uri, $options);
            $body = (string) $response->getBody();
            return json_decode($body, true) ?? [];
        } catch (RequestException $e) {
            $this->handleException($e);
        } catch (GuzzleException $e) {
            throw new FingerprintException("HTTP Error: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Handle Guzzle exceptions
     */
    private function handleException(RequestException $e): void
    {
        if ($e->hasResponse()) {
            $response = $e->getResponse();
            $body = json_decode((string) $response->getBody(), true);
            $message = $body['error']['message'] ?? $e->getMessage();
            $code = $body['error']['code'] ?? $response->getStatusCode();
            throw new FingerprintException($message, $code, $e);
        }

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
     * Enroll a new fingerprint
     */
    public function enrollFingerprint(string $deviceId, string $userId, ?array $metadata = null): array
    {
        $data = [
            'deviceId' => $deviceId,
            'userId' => $userId
        ];

        if ($metadata !== null) {
            $data['metadata'] = $metadata;
        }

        return $this->request('POST', '/api/fingerprint/enroll', ['json' => $data]);
    }

    /**
     * Verify fingerprint (1:1 matching)
     */
    public function verifyFingerprint(string $template, string $userId, string $deviceId): array
    {
        return $this->request('POST', '/api/fingerprint/verify', [
            'json' => [
                'template' => $template,
                'userId' => $userId,
                'deviceId' => $deviceId
            ]
        ]);
    }

    /**
     * Identify fingerprint (1:N matching)
     */
    public function identifyFingerprint(string $template, string $deviceId): array
    {
        return $this->request('POST', '/api/fingerprint/identify', [
            'json' => [
                'template' => $template,
                'deviceId' => $deviceId
            ]
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
    public function waitForScan(string $scanId, int $maxWaitSeconds = 30): array
    {
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
}
```

### Usage with Guzzle

```php
<?php

require 'vendor/autoload.php';
require_once 'GuzzleFingerprintClient.php';

try {
    $client = new GuzzleFingerprintClient('http://localhost:8080', 'your-api-key-here');

    // Check service health
    $health = $client->getHealth();
    echo "Service Status: {$health['status']}\n";

    // List devices
    $devices = $client->listDevices();
    echo "Connected devices: " . count($devices) . "\n";

    // Enroll fingerprint
    $result = $client->enrollFingerprint(
        $devices[0]['id'],
        'user-' . uniqid(),
        ['name' => 'Jane Smith']
    );

    echo "Enrollment successful! Quality: {$result['quality']}\n";

} catch (FingerprintException $e) {
    echo "Error: {$e->getMessage()}\n";
}
```

## Error Handling

### Exception Hierarchy

```php
<?php

/**
 * Base exception for all fingerprint operations
 */
class FingerprintException extends Exception {}

/**
 * Device-related errors
 */
class DeviceException extends FingerprintException {}

/**
 * Fingerprint quality or matching errors
 */
class FingerprintQualityException extends FingerprintException {}

/**
 * Authentication errors
 */
class AuthenticationException extends FingerprintException {}

/**
 * Rate limiting errors
 */
class RateLimitException extends FingerprintException {}
```

### Enhanced Error Handling

```php
<?php

function handleFingerprintOperation(callable $operation, int $maxRetries = 3): mixed
{
    $attempt = 0;
    $backoff = 1; // seconds

    while ($attempt < $maxRetries) {
        try {
            return $operation();
        } catch (FingerprintQualityException $e) {
            echo "Low quality scan. Please try again.\n";
            $attempt++;
            if ($attempt >= $maxRetries) {
                throw $e;
            }
        } catch (RateLimitException $e) {
            echo "Rate limit exceeded. Waiting {$backoff} seconds...\n";
            sleep($backoff);
            $backoff *= 2; // Exponential backoff
            $attempt++;
        } catch (DeviceException $e) {
            echo "Device error: {$e->getMessage()}\n";
            throw $e; // Don't retry device errors
        }
    }

    throw new FingerprintException('Max retries exceeded');
}

// Usage
try {
    $result = handleFingerprintOperation(function() use ($client, $deviceId, $userId) {
        return $client->enrollFingerprint($deviceId, $userId);
    });
    
    echo "Success!\n";
} catch (FingerprintException $e) {
    echo "Failed: {$e->getMessage()}\n";
}
```

## Advanced Usage

### Retry Logic with Exponential Backoff

```php
<?php

trait RetryableTrait
{
    private function retryOperation(callable $operation, int $maxRetries = 3, int $initialDelay = 1): mixed
    {
        $attempt = 0;
        $delay = $initialDelay;

        while ($attempt < $maxRetries) {
            try {
                return $operation();
            } catch (Exception $e) {
                $attempt++;
                
                if ($attempt >= $maxRetries) {
                    throw $e;
                }

                // Exponential backoff
                sleep($delay);
                $delay *= 2;
            }
        }
    }
}

class RobustFingerprintClient extends FingerprintClient
{
    use RetryableTrait;

    public function enrollWithRetry(string $deviceId, string $userId, ?array $metadata = null): array
    {
        return $this->retryOperation(function() use ($deviceId, $userId, $metadata) {
            return $this->enrollFingerprint($deviceId, $userId, $metadata);
        });
    }
}
```

### Quality Validation

```php
<?php

class FingerprintValidator
{
    private const MIN_ENROLLMENT_QUALITY = 60;
    private const MIN_VERIFICATION_QUALITY = 50;

    public static function validateEnrollmentQuality(array $result): void
    {
        if ($result['quality'] < self::MIN_ENROLLMENT_QUALITY) {
            throw new FingerprintQualityException(
                "Quality too low for enrollment: {$result['quality']} (minimum: " . self::MIN_ENROLLMENT_QUALITY . ")"
            );
        }
    }

    public static function validateVerificationQuality(array $result): void
    {
        if ($result['quality'] < self::MIN_VERIFICATION_QUALITY) {
            throw new FingerprintQualityException(
                "Quality too low for verification: {$result['quality']} (minimum: " . self::MIN_VERIFICATION_QUALITY . ")"
            );
        }
    }

    public static function validateConfidence(array $result, float $minConfidence = 80.0): void
    {
        if ($result['confidence'] < $minConfidence) {
            throw new FingerprintQualityException(
                "Confidence too low: {$result['confidence']}% (minimum: {$minConfidence}%)"
            );
        }
    }
}

// Usage
try {
    $result = $client->enrollFingerprint($deviceId, $userId);
    FingerprintValidator::validateEnrollmentQuality($result);
    echo "Enrollment successful with good quality!\n";
} catch (FingerprintQualityException $e) {
    echo "Quality check failed: {$e->getMessage()}\n";
}
```

## Complete Example: User Authentication System

```php
<?php

require_once 'FingerprintClient.php';

class FingerprintAuthSystem
{
    private FingerprintClient $client;
    private PDO $db;

    public function __construct(FingerprintClient $client, PDO $db)
    {
        $this->client = $client;
        $this->db = $db;
    }

    /**
     * Register new user with fingerprint
     */
    public function registerUser(string $username, string $email, string $deviceId): array
    {
        // Create user in database
        $stmt = $this->db->prepare(
            "INSERT INTO users (username, email, created_at) VALUES (?, ?, NOW())"
        );
        $stmt->execute([$username, $email]);
        $userId = $this->db->lastInsertId();

        try {
            // Enroll fingerprint
            $result = $this->client->enrollFingerprint(
                $deviceId,
                "user-{$userId}",
                ['username' => $username, 'email' => $email]
            );

            // Store template
            $stmt = $this->db->prepare(
                "INSERT INTO fingerprint_templates (user_id, template, quality, created_at) 
                 VALUES (?, ?, ?, NOW())"
            );
            $stmt->execute([$userId, $result['template'], $result['quality']]);

            return [
                'success' => true,
                'userId' => $userId,
                'quality' => $result['quality']
            ];

        } catch (FingerprintException $e) {
            // Rollback user creation
            $this->db->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
            throw $e;
        }
    }

    /**
     * Authenticate user with fingerprint
     */
    public function authenticateUser(string $deviceId): ?array
    {
        // Start scan
        $scan = $this->client->startScan($deviceId);
        $scanResult = $this->client->waitForScan($scan['scanId']);

        // Identify user
        $identification = $this->client->identifyFingerprint(
            $scanResult['template'],
            $deviceId
        );

        if (!$identification['match']) {
            return null;
        }

        // Extract user ID from service userId format
        $serviceUserId = $identification['userId'];
        $userId = (int) str_replace('user-', '', $serviceUserId);

        // Load user from database
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            return null;
        }

        // Log authentication
        $stmt = $this->db->prepare(
            "INSERT INTO auth_logs (user_id, confidence, timestamp) VALUES (?, ?, NOW())"
        );
        $stmt->execute([$userId, $identification['confidence']]);

        return [
            'userId' => $userId,
            'username' => $user['username'],
            'email' => $user['email'],
            'confidence' => $identification['confidence']
        ];
    }
}

// Usage
try {
    $db = new PDO('mysql:host=localhost;dbname=myapp', 'user', 'password');
    $client = new FingerprintClient('http://localhost:8080', 'your-api-key-here');
    $authSystem = new FingerprintAuthSystem($client, $db);

    // Register new user
    $result = $authSystem->registerUser('johndoe', 'john@example.com', 'device-001');
    echo "User registered with ID: {$result['userId']}\n";

    // Authenticate user
    echo "Place finger on scanner to login...\n";
    $user = $authSystem->authenticateUser('device-001');

    if ($user) {
        echo "Welcome, {$user['username']}!\n";
        echo "Confidence: {$user['confidence']}%\n";
    } else {
        echo "Authentication failed\n";
    }

} catch (FingerprintException $e) {
    echo "Error: {$e->getMessage()}\n";
}
```

## Database Schema

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fingerprint_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    template TEXT NOT NULL,
    quality INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE auth_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    confidence DECIMAL(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_id ON fingerprint_templates(user_id);
CREATE INDEX idx_auth_user_id ON auth_logs(user_id);
CREATE INDEX idx_auth_timestamp ON auth_logs(timestamp);
```

## Troubleshooting

### Common Issues

**cURL SSL Certificate Errors**

```php
// Disable SSL verification (development only!)
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
```

**Timeout Issues**

```php
// Increase timeout for slow operations
$client = new FingerprintClient('http://localhost:8080', 'api-key', 60);
```

**Memory Issues with Large Templates**

```php
// Increase memory limit
ini_set('memory_limit', '256M');
```

**JSON Encoding Issues**

```php
// Ensure proper UTF-8 encoding
$data = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

## Best Practices

1. **Always validate quality scores** before storing templates
2. **Use prepared statements** to prevent SQL injection
3. **Implement retry logic** for transient errors
4. **Log all authentication attempts** for security auditing
5. **Store API keys securely** using environment variables
6. **Use HTTPS** in production environments
7. **Implement rate limiting** on your application side
8. **Cache device information** to reduce API calls
9. **Use transactions** when updating multiple database tables
10. **Validate user input** before passing to API

## Next Steps

- [Laravel Integration](laravel.md) - Laravel-specific implementation
- [API Reference](../api-reference/rest-api.md) - Complete API documentation
- [Best Practices](../guides/best-practices.md) - Security and optimization tips
- [Error Codes](../api-reference/error-codes.md) - Complete error code reference
