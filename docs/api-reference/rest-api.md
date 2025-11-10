---
sidebar_position: 1
title: REST API Reference
description: Complete REST API reference for the Fingerprint Service
---

# REST API Reference

## Overview

The Fingerprint Background Service provides a comprehensive RESTful API for integrating fingerprint reader functionality into your applications. All endpoints require authentication via API key.

**Base URL:** `http://localhost:8080/api` (default)

**Content Type:** `application/json`

## Authentication

All API requests require an API key in the request header:

```http
X-API-Key: your-api-key-here
```

Admin endpoints require a JWT token obtained from the login endpoint:

```http
Authorization: Bearer <admin-token>
```

### Admin Login

Authenticate as administrator to access admin-only endpoints.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 1800
}
```

**Status Codes:**
- `200 OK` - Authentication successful
- `401 Unauthorized` - Invalid credentials
- `429 Too Many Requests` - Rate limit exceeded


---

## Device Management

### List Devices

Get all connected fingerprint readers.

**Endpoint:** `GET /api/devices`

**Authentication:** API Key required

**Response:**
```json
[
  {
    "id": "device-001",
    "serialNumber": "SLK20R-12345",
    "model": "ZKTeco SLK20R",
    "status": "connected",
    "lastActivity": "2025-11-05T10:30:00Z"
  }
]
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid API key
- `500 Internal Server Error` - Server error

---

### Get Device Info

Get detailed information about a specific device.

**Endpoint:** `GET /api/devices/:deviceId/info`

**Authentication:** API Key required

**Path Parameters:**
- `deviceId` (string, required) - Device identifier

**Response:**
```json
{
  "serialNumber": "SLK20R-12345",
  "model": "ZKTeco SLK20R",
  "firmwareVersion": "5.0.0.16",
  "temperature": 28.5,
  "status": "idle",
  "capabilities": {
    "resolution": "500 DPI",
    "imageSize": "256x288"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid API key
- `404 Not Found` - Device not found

---

### Test Device Connection

Test connection to a specific device.

**Endpoint:** `POST /api/devices/:deviceId/test`

**Authentication:** API Key required

**Path Parameters:**
- `deviceId` (string, required) - Device identifier

**Response:**
```json
{
  "status": "success",
  "message": "Device connection successful",
  "quality": 95,
  "responseTime": 120
}
```

**Status Codes:**
- `200 OK` - Connection successful
- `404 Not Found` - Device not found
- `503 Service Unavailable` - Device unavailable


---

## Fingerprint Operations

### Enroll Fingerprint

Enroll a new fingerprint for a user. Requires 3 scans to create a merged template.

**Endpoint:** `POST /api/fingerprint/enroll`

**Authentication:** API Key required

**Request Body:**
```json
{
  "deviceId": "device-001",
  "userId": "user-12345",
  "metadata": {
    "name": "John Doe",
    "department": "Engineering"
  }
}
```

**Request Parameters:**
- `deviceId` (string, optional) - Specific device to use for enrollment
- `userId` (string, required) - Unique identifier for the user
- `metadata` (object, optional) - Additional user information

**Response:**
```json
{
  "template": "base64-encoded-template-data...",
  "quality": 92,
  "enrollmentId": "enroll-789",
  "scansCompleted": 3,
  "message": "Enrollment successful"
}
```

**Response Fields:**
- `template` (string) - Base64-encoded fingerprint template
- `quality` (number) - Quality score (0-100)
- `enrollmentId` (string) - Unique enrollment identifier
- `scansCompleted` (number) - Number of scans completed
- `message` (string) - Status message

**Status Codes:**
- `200 OK` - Enrollment successful
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Device not found
- `422 Unprocessable Entity` - Low quality scan
- `429 Too Many Requests` - Rate limit exceeded

---

### Verify Fingerprint (1:1)

Verify a fingerprint against a specific template.

**Endpoint:** `POST /api/fingerprint/verify`

**Authentication:** API Key required

**Request Body:**
```json
{
  "template": "base64-encoded-template-data...",
  "userId": "user-12345",
  "deviceId": "device-001"
}
```

**Request Parameters:**
- `template` (string, required) - Base64-encoded fingerprint template to verify against
- `userId` (string, required) - User identifier
- `deviceId` (string, optional) - Specific device to use

**Response:**
```json
{
  "match": true,
  "confidence": 95.5,
  "userId": "user-12345",
  "verificationTime": 145
}
```

**Response Fields:**
- `match` (boolean) - Whether fingerprint matches
- `confidence` (number) - Match confidence score (0-100)
- `userId` (string) - User identifier
- `verificationTime` (number) - Verification time in milliseconds

**Status Codes:**
- `200 OK` - Verification completed (match or no match)
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - User or device not found
- `422 Unprocessable Entity` - Low quality scan

---

### Identify Fingerprint (1:N)

Identify a fingerprint from the database.

**Endpoint:** `POST /api/fingerprint/identify`

**Authentication:** API Key required

**Request Body:**
```json
{
  "template": "base64-encoded-template-data...",
  "deviceId": "device-001"
}
```

**Request Parameters:**
- `template` (string, required) - Base64-encoded fingerprint template to identify
- `deviceId` (string, optional) - Specific device to use

**Response:**
```json
{
  "match": true,
  "confidence": 88.3,
  "userId": "user-12345",
  "matchedTemplate": "template-id-456",
  "identificationTime": 320
}
```

**Response Fields:**
- `match` (boolean) - Whether a match was found
- `confidence` (number) - Match confidence score (0-100)
- `userId` (string) - Matched user identifier (if found)
- `matchedTemplate` (string) - Matched template identifier (if found)
- `identificationTime` (number) - Identification time in milliseconds

**Status Codes:**
- `200 OK` - Identification completed (match or no match)
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Device not found


---

### Start Scan Session

Start a fingerprint scan session.

**Endpoint:** `GET /api/fingerprint/scan/start`

**Authentication:** API Key required

**Query Parameters:**
- `deviceId` (string, optional) - Specific device to use

**Response:**
```json
{
  "scanId": "scan-abc123",
  "status": "waiting",
  "deviceId": "device-001"
}
```

**Response Fields:**
- `scanId` (string) - Unique scan session identifier
- `status` (string) - Current scan status
- `deviceId` (string) - Device being used

**Status Codes:**
- `200 OK` - Scan session started
- `404 Not Found` - Device not found
- `503 Service Unavailable` - Device busy

---

### Get Scan Status

Get the status of an active scan session.

**Endpoint:** `GET /api/fingerprint/scan/status/:scanId`

**Authentication:** API Key required

**Path Parameters:**
- `scanId` (string, required) - Scan session identifier

**Response:**
```json
{
  "status": "complete",
  "quality": 87,
  "template": "base64-encoded-template-data...",
  "scanTime": 1250
}
```

**Response Fields:**
- `status` (string) - Current scan status (waiting, scanning, complete, error)
- `quality` (number) - Quality score (0-100, only when complete)
- `template` (string) - Base64-encoded template (only when complete)
- `scanTime` (number) - Scan time in milliseconds (only when complete)

**Possible Status Values:**
- `waiting` - Waiting for finger placement
- `scanning` - Scan in progress
- `complete` - Scan completed successfully
- `error` - Scan failed

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Scan session not found


---

## Database Management

:::info Admin Only
Database management endpoints require admin authentication.
:::

### Get Database Statistics

Get statistics about the fingerprint database.

**Endpoint:** `GET /api/database/stats`

**Authentication:** Admin token required

**Response:**
```json
{
  "totalRecords": 1523,
  "storageSize": 15728640,
  "oldestEntry": "2024-01-15T08:30:00Z",
  "newestEntry": "2025-11-05T14:22:00Z",
  "averageQuality": 85.3
}
```

**Response Fields:**
- `totalRecords` (number) - Total number of fingerprint records
- `storageSize` (number) - Database size in bytes
- `oldestEntry` (string) - Timestamp of oldest record
- `newestEntry` (string) - Timestamp of newest record
- `averageQuality` (number) - Average quality score

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing admin token

---

### Export Database

Export fingerprint database with optional filters.

**Endpoint:** `POST /api/database/export`

**Authentication:** Admin token required

**Request Body:**
```json
{
  "format": "json",
  "filters": {
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "userId": "user-12345"
  },
  "password": "encryption-password"
}
```

**Request Parameters:**
- `format` (string, required) - Export format (json)
- `filters` (object, optional) - Filter criteria
  - `startDate` (string, optional) - Start date filter
  - `endDate` (string, optional) - End date filter
  - `userId` (string, optional) - Specific user filter
- `password` (string, required) - Encryption password for export file

**Response:**
```json
{
  "downloadUrl": "/api/database/export/download/export-20251105.enc",
  "expiresIn": 3600,
  "recordCount": 150,
  "fileSize": 2048576
}
```

**Response Fields:**
- `downloadUrl` (string) - URL to download the export file
- `expiresIn` (number) - Expiration time in seconds
- `recordCount` (number) - Number of records exported
- `fileSize` (number) - File size in bytes

**Status Codes:**
- `200 OK` - Export created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Invalid or missing admin token

---

### Import Database

Import fingerprint data from an export file.

**Endpoint:** `POST /api/database/import`

**Authentication:** Admin token required

**Content Type:** `multipart/form-data`

**Request Parameters:**
- `file` (file, required) - Export file to import
- `password` (string, required) - Decryption password
- `options` (object, optional) - Import options
  - `duplicateHandling` (string) - How to handle duplicates (skip, overwrite, merge)

**Response:**
```json
{
  "imported": 145,
  "skipped": 5,
  "errors": [],
  "duration": 2340
}
```

**Response Fields:**
- `imported` (number) - Number of records imported
- `skipped` (number) - Number of records skipped
- `errors` (array) - List of errors encountered
- `duration` (number) - Import duration in milliseconds

**Duplicate Handling Options:**
- `skip` - Skip duplicate entries (default)
- `overwrite` - Overwrite existing entries
- `merge` - Merge with existing data

**Status Codes:**
- `200 OK` - Import completed
- `400 Bad Request` - Invalid file or password
- `401 Unauthorized` - Invalid or missing admin token

---

### Bulk Delete

Delete multiple fingerprint records based on criteria.

**Endpoint:** `DELETE /api/database/bulk-delete`

**Authentication:** Admin token required

**Request Body:**
```json
{
  "filters": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "qualityBelow": 50
  }
}
```

**Request Parameters:**
- `filters` (object, required) - Deletion criteria
  - `startDate` (string, optional) - Start date filter
  - `endDate` (string, optional) - End date filter
  - `qualityBelow` (number, optional) - Delete records with quality below this value

**Response:**
```json
{
  "deleted": 23
}
```

**Response Fields:**
- `deleted` (number) - Number of records deleted

**Status Codes:**
- `200 OK` - Deletion completed
- `400 Bad Request` - Invalid filters
- `401 Unauthorized` - Invalid or missing admin token


---

## Backup Management

:::info Admin Only
Backup management endpoints require admin authentication.
:::

### List Backups

Get all available backups.

**Endpoint:** `GET /api/backups`

**Authentication:** Admin token required

**Response:**
```json
[
  {
    "id": 1,
    "timestamp": "2025-11-05T02:00:00Z",
    "size": 10485760,
    "encrypted": true,
    "filename": "backup_20251105_020000.enc"
  }
]
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing admin token

---

### Create Backup

Create a manual backup.

**Endpoint:** `POST /api/backups/create`

**Authentication:** Admin token required

**Response:**
```json
{
  "backupId": 15,
  "timestamp": "2025-11-05T14:30:00Z",
  "size": 10485760,
  "filename": "backup_20251105_143000.enc"
}
```

**Status Codes:**
- `200 OK` - Backup created successfully
- `401 Unauthorized` - Invalid or missing admin token
- `500 Internal Server Error` - Backup failed

---

### Restore Backup

Restore from a backup file.

**Endpoint:** `POST /api/backups/restore/:backupId`

**Authentication:** Admin token required

**Path Parameters:**
- `backupId` (number, required) - Backup identifier

**Request Body:**
```json
{
  "password": "backup-password"
}
```

**Request Parameters:**
- `password` (string, required) - Backup decryption password

**Response:**
```json
{
  "status": "success",
  "restoredRecords": 1523,
  "restoreTime": 5420
}
```

**Response Fields:**
- `status` (string) - Restore status
- `restoredRecords` (number) - Number of records restored
- `restoreTime` (number) - Restore time in milliseconds

**Status Codes:**
- `200 OK` - Restore successful
- `400 Bad Request` - Invalid password
- `401 Unauthorized` - Invalid or missing admin token
- `404 Not Found` - Backup not found

---

### Delete Backup

Delete a backup file.

**Endpoint:** `DELETE /api/backups/:backupId`

**Authentication:** Admin token required

**Path Parameters:**
- `backupId` (number, required) - Backup identifier

**Response:**
```json
{
  "status": "success"
}
```

**Status Codes:**
- `200 OK` - Backup deleted successfully
- `401 Unauthorized` - Invalid or missing admin token
- `404 Not Found` - Backup not found

---

### Download Backup

Download a backup file.

**Endpoint:** `GET /api/backups/:backupId/download`

**Authentication:** Admin token required

**Path Parameters:**
- `backupId` (number, required) - Backup identifier

**Response:** Binary file stream

**Status Codes:**
- `200 OK` - Download started
- `401 Unauthorized` - Invalid or missing admin token
- `404 Not Found` - Backup not found


---

## Configuration

:::info Admin Only
Configuration endpoints require admin authentication.
:::

### Get Configuration

Get current service configuration.

**Endpoint:** `GET /api/config`

**Authentication:** Admin token required

**Response:**
```json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0"
  },
  "cors": {
    "origins": ["https://example.com"]
  },
  "rateLimit": {
    "api": {
      "windowMs": 60000,
      "maxRequests": 100
    }
  },
  "fingerprint": {
    "qualityThreshold": {
      "enrollment": 60,
      "verification": 50
    }
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing admin token

---

### Update Configuration

Update service configuration.

**Endpoint:** `PUT /api/config`

**Authentication:** Admin token required

**Request Body:**
```json
{
  "server": {
    "port": 8081
  },
  "cors": {
    "origins": ["https://example.com", "https://app.example.com"]
  }
}
```

**Response:**
```json
{
  "status": "success",
  "requiresRestart": true
}
```

**Response Fields:**
- `status` (string) - Update status
- `requiresRestart` (boolean) - Whether service restart is required

**Status Codes:**
- `200 OK` - Configuration updated
- `400 Bad Request` - Invalid configuration
- `401 Unauthorized` - Invalid or missing admin token

---

### List API Keys

Get all API keys.

**Endpoint:** `GET /api/config/api-keys`

**Authentication:** Admin token required

**Response:**
```json
[
  {
    "id": 1,
    "key": "ak_live_abc123...",
    "name": "Production App",
    "lastUsed": "2025-11-05T14:20:00Z",
    "createdAt": "2025-01-15T10:00:00Z",
    "revoked": false
  }
]
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing admin token

---

### Create API Key

Create a new API key.

**Endpoint:** `POST /api/config/api-keys`

**Authentication:** Admin token required

**Request Body:**
```json
{
  "name": "Mobile App",
  "permissions": ["fingerprint:enroll", "fingerprint:verify"]
}
```

**Request Parameters:**
- `name` (string, required) - Descriptive name for the API key
- `permissions` (array, optional) - List of permissions (future use)

**Response:**
```json
{
  "id": 5,
  "key": "ak_live_xyz789...",
  "name": "Mobile App",
  "createdAt": "2025-11-05T14:30:00Z"
}
```

**Status Codes:**
- `200 OK` - API key created
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Invalid or missing admin token

---

### Revoke API Key

Revoke an API key.

**Endpoint:** `DELETE /api/config/api-keys/:keyId`

**Authentication:** Admin token required

**Path Parameters:**
- `keyId` (number, required) - API key identifier

**Response:**
```json
{
  "status": "success"
}
```

**Status Codes:**
- `200 OK` - API key revoked
- `401 Unauthorized` - Invalid or missing admin token
- `404 Not Found` - API key not found


---

## Monitoring

### Health Check

Get service health status.

**Endpoint:** `GET /api/health`

**Authentication:** None required

**Response:**
```json
{
  "status": "healthy",
  "uptime": 86400,
  "deviceStatus": "connected",
  "dbStatus": "operational",
  "version": "1.0.0"
}
```

**Response Fields:**
- `status` (string) - Overall health status (healthy, unhealthy)
- `uptime` (number) - Service uptime in seconds
- `deviceStatus` (string) - Device connection status
- `dbStatus` (string) - Database status
- `version` (string) - Service version

**Status Codes:**
- `200 OK` - Service is healthy
- `503 Service Unavailable` - Service is unhealthy

---

### Get Logs

Get service logs with filters.

**Endpoint:** `GET /api/logs`

**Authentication:** Admin token required

**Query Parameters:**
- `level` (string, optional) - Filter by log level (error, warn, info, debug)
- `limit` (number, optional) - Number of entries (default: 100)
- `offset` (number, optional) - Pagination offset
- `startDate` (string, optional) - Start date filter (ISO 8601)
- `endDate` (string, optional) - End date filter (ISO 8601)
- `search` (string, optional) - Search text

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2025-11-05T14:30:00Z",
      "level": "info",
      "message": "Device connected",
      "metadata": {
        "deviceId": "device-001"
      }
    }
  ],
  "total": 1523
}
```

**Response Fields:**
- `logs` (array) - Array of log entries
- `total` (number) - Total number of matching logs

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing admin token

---

### Get Statistics

Get usage statistics.

**Endpoint:** `GET /api/stats`

**Authentication:** Admin token required

**Response:**
```json
{
  "totalScans": 5432,
  "successRate": 94.5,
  "avgQuality": 85.3,
  "avgResponseTime": 180,
  "period": {
    "start": "2025-11-01T00:00:00Z",
    "end": "2025-11-05T23:59:59Z"
  }
}
```

**Response Fields:**
- `totalScans` (number) - Total number of scans
- `successRate` (number) - Success rate percentage
- `avgQuality` (number) - Average quality score
- `avgResponseTime` (number) - Average response time in milliseconds
- `period` (object) - Statistics period

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing admin token


---

## Notifications

:::info Admin Only
Notification endpoints require admin authentication.
:::

### Get Notification Configuration

Get notification settings.

**Endpoint:** `GET /api/notifications/config`

**Authentication:** Admin token required

**Response:**
```json
{
  "email": {
    "enabled": true,
    "smtp": {
      "host": "smtp.example.com",
      "port": 587
    },
    "from": "alerts@example.com",
    "to": ["admin@example.com"]
  },
  "webhook": {
    "enabled": false,
    "url": ""
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing admin token

---

### Update Notification Configuration

Update notification settings.

**Endpoint:** `PUT /api/notifications/config`

**Authentication:** Admin token required

**Request Body:**
```json
{
  "email": {
    "enabled": true,
    "smtp": {
      "host": "smtp.example.com",
      "port": 587,
      "auth": {
        "user": "alerts@example.com",
        "pass": "password"
      }
    }
  }
}
```

**Response:**
```json
{
  "status": "success"
}
```

**Status Codes:**
- `200 OK` - Configuration updated
- `400 Bad Request` - Invalid configuration
- `401 Unauthorized` - Invalid or missing admin token

---

### Test Notification

Send a test notification.

**Endpoint:** `POST /api/notifications/test`

**Authentication:** Admin token required

**Request Body:**
```json
{
  "type": "email",
  "recipient": "test@example.com"
}
```

**Request Parameters:**
- `type` (string, required) - Notification type (email, webhook)
- `recipient` (string, required) - Test recipient

**Response:**
```json
{
  "status": "success",
  "message": "Test notification sent"
}
```

**Status Codes:**
- `200 OK` - Test notification sent
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Invalid or missing admin token
- `500 Internal Server Error` - Send failed


---

## Updates

:::info Admin Only
Update endpoints require admin authentication.
:::

### Check for Updates

Check if updates are available.

**Endpoint:** `GET /api/updates/check`

**Authentication:** Admin token required

**Response:**
```json
{
  "available": true,
  "version": "1.1.0",
  "changelog": "- Bug fixes\n- Performance improvements",
  "downloadSize": 52428800,
  "releaseDate": "2025-11-01T00:00:00Z"
}
```

**Response Fields:**
- `available` (boolean) - Whether an update is available
- `version` (string) - New version number
- `changelog` (string) - Release notes
- `downloadSize` (number) - Download size in bytes
- `releaseDate` (string) - Release date

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing admin token

---

### Install Update

Install an available update.

**Endpoint:** `POST /api/updates/install`

**Authentication:** Admin token required

**Response:**
```json
{
  "status": "scheduled",
  "scheduledTime": "2025-11-05T15:00:00Z"
}
```

**Response Fields:**
- `status` (string) - Installation status
- `scheduledTime` (string) - When the update will be installed

**Status Codes:**
- `200 OK` - Update scheduled
- `400 Bad Request` - No update available
- `401 Unauthorized` - Invalid or missing admin token

---

### Get Update Status

Get the status of an update installation.

**Endpoint:** `GET /api/updates/status`

**Authentication:** Admin token required

**Response:**
```json
{
  "status": "downloading",
  "progress": 45,
  "currentVersion": "1.0.0",
  "targetVersion": "1.1.0"
}
```

**Response Fields:**
- `status` (string) - Current update status
- `progress` (number) - Progress percentage (0-100)
- `currentVersion` (string) - Current version
- `targetVersion` (string) - Target version

**Possible Status Values:**
- `idle` - No update in progress
- `checking` - Checking for updates
- `downloading` - Downloading update
- `installing` - Installing update
- `complete` - Update complete
- `failed` - Update failed

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing admin token


---

## Rate Limiting

The API implements rate limiting to prevent abuse and ensure fair usage.

### Rate Limits

- **API Requests:** 100 requests per minute per API key
- **Fingerprint Scans:** 10 scans per minute per device

### Rate Limit Headers

All API responses include rate limit information in headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699200000
```

**Headers:**
- `X-RateLimit-Limit` - Maximum requests allowed in the window
- `X-RateLimit-Remaining` - Remaining requests in current window
- `X-RateLimit-Reset` - Unix timestamp when the limit resets

### Rate Limit Exceeded Response

When rate limit is exceeded, the API returns HTTP 429 with a `Retry-After` header:

**Status Code:** `429 Too Many Requests`

**Response:**
```json
{
  "error": {
    "code": 4004,
    "name": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 45
  }
}
```

**Response Fields:**
- `error.code` (number) - Error code
- `error.name` (string) - Error name
- `error.message` (string) - Human-readable error message
- `error.retryAfter` (number) - Seconds to wait before retrying

### Best Practices

1. **Monitor rate limit headers** - Check remaining requests before making calls
2. **Implement exponential backoff** - Wait progressively longer between retries
3. **Cache responses** - Reduce unnecessary API calls
4. **Batch operations** - Combine multiple operations when possible

**Example: Handling Rate Limits**

```javascript
async function makeRequestWithRetry(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.status === 429) {
        const retryAfter = error.retryAfter || Math.pow(2, i) * 1000;
        console.log(`Rate limited. Retrying after ${retryAfter}ms`);
        await sleep(retryAfter);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": {
    "code": 1001,
    "name": "DEVICE_NOT_FOUND",
    "message": "Fingerprint reader not connected",
    "details": {
      "deviceId": "device-001"
    }
  }
}
```

**Error Response Fields:**
- `error.code` (number) - Numeric error code
- `error.name` (string) - Error name constant
- `error.message` (string) - Human-readable error message
- `error.details` (object, optional) - Additional error context

For a complete list of error codes, see the [Error Codes Reference](./error-codes.md).

---

## CORS Configuration

The service supports Cross-Origin Resource Sharing (CORS) for web applications.

### Default CORS Settings

By default, CORS is disabled. Configure allowed origins in the service configuration:

```json
{
  "cors": {
    "origins": ["https://example.com", "https://app.example.com"],
    "credentials": true,
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "allowedHeaders": ["Content-Type", "X-API-Key", "Authorization"]
  }
}
```

### CORS Headers

When CORS is enabled, the API includes these headers:

```http
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, X-API-Key, Authorization
Access-Control-Allow-Credentials: true
```

---

## Pagination

Endpoints that return lists support pagination using query parameters.

### Pagination Parameters

- `limit` (number, optional) - Number of items per page (default: 100, max: 1000)
- `offset` (number, optional) - Number of items to skip (default: 0)

**Example:**
```http
GET /api/logs?limit=50&offset=100
```

### Pagination Response

Paginated responses include metadata:

```json
{
  "data": [...],
  "pagination": {
    "total": 1523,
    "limit": 50,
    "offset": 100,
    "hasMore": true
  }
}
```

**Pagination Fields:**
- `total` (number) - Total number of items
- `limit` (number) - Items per page
- `offset` (number) - Current offset
- `hasMore` (boolean) - Whether more items are available

---

## Best Practices

### 1. Secure Your API Keys

- Never expose API keys in client-side code
- Use environment variables for API keys
- Rotate API keys regularly
- Revoke unused API keys

### 2. Handle Errors Gracefully

- Always check response status codes
- Implement retry logic for transient errors
- Log errors for debugging
- Provide user-friendly error messages

### 3. Validate Quality Scores

- Check quality scores before accepting fingerprints
- Prompt users to rescan if quality is low
- Set appropriate quality thresholds for your use case

### 4. Use WebSocket for Real-Time Updates

- Use WebSocket instead of polling for better performance
- Implement reconnection logic
- Handle connection errors gracefully

### 5. Implement Caching

- Cache device information to reduce API calls
- Use appropriate cache expiration times
- Invalidate cache when data changes

### 6. Monitor Rate Limits

- Track API usage to avoid hitting rate limits
- Implement request queuing if needed
- Use batch operations when possible

---

## Next Steps

- [WebSocket API Reference](./websocket.md) - Real-time event handling
- [Error Codes Reference](./error-codes.md) - Complete error code list
- [Integration Guides](/docs/integration/javascript-vanilla) - Framework-specific examples
- [Best Practices Guide](/docs/guides/best-practices) - Advanced patterns and techniques
