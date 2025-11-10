---
sidebar_position: 3
title: Error Codes Reference
description: Complete error code reference for the Fingerprint Service
---

# Error Codes Reference

## Overview

The Fingerprint Service uses standardized error codes to help you identify and resolve issues quickly. All errors follow a consistent format and are categorized by type.

## Error Response Format

All API errors return a consistent JSON structure:

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

**Error Fields:**
- `code` (number) - Numeric error code
- `name` (string) - Error name constant
- `message` (string) - Human-readable error message
- `details` (object, optional) - Additional error context

## Error Categories

Errors are organized into five categories based on their numeric code range:

- **1xxx** - Device Errors
- **2xxx** - Fingerprint Errors
- **3xxx** - Database Errors
- **4xxx** - Authentication Errors
- **5xxx** - System Errors

---

## Device Errors (1xxx)

Errors related to fingerprint reader hardware and connectivity.

### 1001 - DEVICE_NOT_FOUND

**Description:** The specified fingerprint reader is not connected or not found.

**Common Causes:**
- Device is not plugged in
- Device driver not installed
- Wrong device ID specified
- Device disconnected during operation

**Resolution:**
1. Check physical connection of the fingerprint reader
2. Verify device appears in system device manager
3. Restart the Fingerprint Service
4. Check device ID is correct using `GET /api/devices`

**Example:**
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

**Code Example:**
```javascript
try {
  await api.enrollFingerprint('user-123', 'device-001');
} catch (error) {
  if (error.code === 1001) {
    console.error('Device not found. Please connect the fingerprint reader.');
    // Prompt user to connect device
  }
}
```

---

### 1002 - DEVICE_BUSY

**Description:** The device is currently in use by another operation.

**Common Causes:**
- Another scan is in progress
- Device is being used by another application
- Previous operation did not complete properly

**Resolution:**
1. Wait for current operation to complete
2. Cancel any pending operations
3. Restart the device if stuck
4. Implement operation queuing in your application

**Example:**
```json
{
  "error": {
    "code": 1002,
    "name": "DEVICE_BUSY",
    "message": "Device is currently in use",
    "details": {
      "deviceId": "device-001",
      "currentOperation": "enrollment"
    }
  }
}
```

**Code Example:**
```javascript
async function enrollWithRetry(userId, deviceId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await api.enrollFingerprint(userId, deviceId);
    } catch (error) {
      if (error.code === 1002 && i < maxRetries - 1) {
        console.log('Device busy, retrying in 2 seconds...');
        await sleep(2000);
        continue;
      }
      throw error;
    }
  }
}
```

---

### 1003 - DEVICE_DISCONNECTED

**Description:** Device connection was lost during operation.

**Common Causes:**
- USB cable unplugged
- Power loss to device
- Device hardware failure
- USB port malfunction

**Resolution:**
1. Reconnect the device
2. Check USB cable and port
3. Restart the Fingerprint Service
4. Try a different USB port

**Example:**
```json
{
  "error": {
    "code": 1003,
    "name": "DEVICE_DISCONNECTED",
    "message": "Device connection lost",
    "details": {
      "deviceId": "device-001",
      "lastSeen": "2025-11-05T14:30:00Z"
    }
  }
}
```

---

### 1004 - DEVICE_INIT_FAILED

**Description:** Failed to initialize the fingerprint reader.

**Common Causes:**
- Device driver issues
- Incompatible device firmware
- Hardware malfunction
- Insufficient permissions

**Resolution:**
1. Reinstall device drivers
2. Update device firmware
3. Run service with administrator privileges
4. Check device compatibility

**Example:**
```json
{
  "error": {
    "code": 1004,
    "name": "DEVICE_INIT_FAILED",
    "message": "Failed to initialize device",
    "details": {
      "deviceId": "device-001",
      "reason": "Driver initialization failed"
    }
  }
}
```

---

### 1005 - DEVICE_TIMEOUT

**Description:** Device operation timed out.

**Common Causes:**
- Device not responding
- Hardware malfunction
- Operation took too long
- Network issues (for network-connected devices)

**Resolution:**
1. Check device is functioning properly
2. Restart the device
3. Increase timeout values in configuration
4. Check for hardware issues

**Example:**
```json
{
  "error": {
    "code": 1005,
    "name": "DEVICE_TIMEOUT",
    "message": "Device operation timed out",
    "details": {
      "deviceId": "device-001",
      "operation": "scan",
      "timeout": 30000
    }
  }
}
```


---

## Fingerprint Errors (2xxx)

Errors related to fingerprint capture, processing, and matching.

### 2001 - LOW_QUALITY

**Description:** Fingerprint quality is below the acceptable threshold.

**Common Causes:**
- Dirty or wet finger
- Dry or damaged skin
- Improper finger placement
- Sensor surface is dirty

**Resolution:**
1. Clean the sensor surface
2. Ask user to clean and dry their finger
3. Ensure proper finger placement
4. Retry the scan
5. Lower quality threshold if appropriate

**Example:**
```json
{
  "error": {
    "code": 2001,
    "name": "LOW_QUALITY",
    "message": "Fingerprint quality below threshold",
    "details": {
      "quality": 45,
      "threshold": 60,
      "operation": "enrollment"
    }
  }
}
```

**Code Example:**
```javascript
async function enrollWithQualityCheck(userId, minQuality = 60) {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const result = await api.enrollFingerprint(userId);
      
      if (result.quality >= minQuality) {
        return result;
      }
      
      console.log(`Quality ${result.quality} too low, please try again`);
      attempts++;
    } catch (error) {
      if (error.code === 2001) {
        console.log('Low quality scan. Please clean your finger and try again.');
        attempts++;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Failed to capture quality fingerprint after maximum attempts');
}
```

---

### 2002 - NO_FINGERPRINT_DETECTED

**Description:** No fingerprint was detected on the sensor.

**Common Causes:**
- Finger not placed on sensor
- Finger removed too quickly
- Sensor malfunction
- Timeout waiting for finger

**Resolution:**
1. Ensure finger is placed firmly on sensor
2. Hold finger steady during scan
3. Check sensor is working properly
4. Increase scan timeout if needed

**Example:**
```json
{
  "error": {
    "code": 2002,
    "name": "NO_FINGERPRINT_DETECTED",
    "message": "No fingerprint detected on sensor",
    "details": {
      "deviceId": "device-001",
      "timeout": 30000
    }
  }
}
```

---

### 2003 - TEMPLATE_EXTRACTION_FAILED

**Description:** Failed to extract fingerprint template from the captured image.

**Common Causes:**
- Very poor image quality
- Incomplete fingerprint capture
- Damaged or scarred fingerprint
- Algorithm failure

**Resolution:**
1. Retry the scan with better finger placement
2. Ensure finger covers entire sensor area
3. Try a different finger if available
4. Check for sensor issues

**Example:**
```json
{
  "error": {
    "code": 2003,
    "name": "TEMPLATE_EXTRACTION_FAILED",
    "message": "Failed to extract template from image",
    "details": {
      "reason": "Insufficient minutiae points"
    }
  }
}
```

---

### 2004 - MATCH_FAILED

**Description:** Fingerprint matching operation failed.

**Common Causes:**
- Fingerprints do not match
- Template corruption
- Algorithm error
- Database inconsistency

**Resolution:**
1. Verify correct user/template is being used
2. Retry verification
3. Re-enroll fingerprint if persistent
4. Check database integrity

**Example:**
```json
{
  "error": {
    "code": 2004,
    "name": "MATCH_FAILED",
    "message": "Fingerprint matching failed",
    "details": {
      "userId": "user-123",
      "confidence": 25.5
    }
  }
}
```

**Code Example:**
```javascript
async function verifyWithFallback(userId, template) {
  try {
    const result = await api.verifyFingerprint(template, userId);
    
    if (result.match && result.confidence >= 70) {
      return { success: true, confidence: result.confidence };
    } else {
      return { success: false, reason: 'Low confidence match' };
    }
  } catch (error) {
    if (error.code === 2004) {
      console.log('Match failed. Please try again or use alternative authentication.');
      return { success: false, reason: 'Match failed' };
    }
    throw error;
  }
}
```

---

### 2005 - ENROLLMENT_FAILED

**Description:** Fingerprint enrollment process failed.

**Common Causes:**
- Inconsistent scans across multiple captures
- Quality issues
- User moved finger between scans
- Template generation failure

**Resolution:**
1. Restart enrollment process
2. Ensure consistent finger placement
3. Clean sensor and finger
4. Provide clear instructions to user

**Example:**
```json
{
  "error": {
    "code": 2005,
    "name": "ENROLLMENT_FAILED",
    "message": "Enrollment process failed",
    "details": {
      "scansCompleted": 2,
      "scansRequired": 3,
      "reason": "Inconsistent scans"
    }
  }
}
```


---

## Database Errors (3xxx)

Errors related to database operations and data management.

### 3001 - DB_CONNECTION_FAILED

**Description:** Failed to connect to the database.

**Common Causes:**
- Database file is locked
- Insufficient permissions
- Corrupted database file
- Disk space issues

**Resolution:**
1. Check database file permissions
2. Ensure no other process is locking the database
3. Verify sufficient disk space
4. Restore from backup if corrupted

**Example:**
```json
{
  "error": {
    "code": 3001,
    "name": "DB_CONNECTION_FAILED",
    "message": "Database connection failed",
    "details": {
      "path": "/data/fingerprints.db",
      "reason": "Database is locked"
    }
  }
}
```

---

### 3002 - DB_QUERY_FAILED

**Description:** Database query execution failed.

**Common Causes:**
- Invalid query syntax
- Database corruption
- Constraint violations
- Disk I/O errors

**Resolution:**
1. Check database integrity
2. Restart the service
3. Restore from backup if needed
4. Check disk health

**Example:**
```json
{
  "error": {
    "code": 3002,
    "name": "DB_QUERY_FAILED",
    "message": "Database query failed",
    "details": {
      "query": "INSERT INTO fingerprints...",
      "reason": "Constraint violation"
    }
  }
}
```

---

### 3003 - DUPLICATE_ENTRY

**Description:** Attempted to create a record that already exists.

**Common Causes:**
- User already enrolled
- Duplicate user ID
- Template already exists
- Unique constraint violation

**Resolution:**
1. Check if user is already enrolled
2. Use update instead of insert
3. Delete existing record first (if appropriate)
4. Use different user ID

**Example:**
```json
{
  "error": {
    "code": 3003,
    "name": "DUPLICATE_ENTRY",
    "message": "Record already exists",
    "details": {
      "userId": "user-123",
      "field": "userId"
    }
  }
}
```

**Code Example:**
```javascript
async function enrollOrUpdate(userId) {
  try {
    return await api.enrollFingerprint(userId);
  } catch (error) {
    if (error.code === 3003) {
      console.log('User already enrolled. Updating...');
      // Delete old enrollment and create new one
      await api.deleteFingerprint(userId);
      return await api.enrollFingerprint(userId);
    }
    throw error;
  }
}
```

---

### 3004 - RECORD_NOT_FOUND

**Description:** Requested record does not exist in the database.

**Common Causes:**
- User not enrolled
- Record was deleted
- Wrong user ID
- Database inconsistency

**Resolution:**
1. Verify user ID is correct
2. Check if user is enrolled
3. Enroll user if needed
4. Check database integrity

**Example:**
```json
{
  "error": {
    "code": 3004,
    "name": "RECORD_NOT_FOUND",
    "message": "Record not found in database",
    "details": {
      "userId": "user-123",
      "table": "fingerprints"
    }
  }
}
```

**Code Example:**
```javascript
async function verifyOrEnroll(userId, template) {
  try {
    return await api.verifyFingerprint(template, userId);
  } catch (error) {
    if (error.code === 3004) {
      console.log('User not enrolled. Starting enrollment...');
      return await api.enrollFingerprint(userId);
    }
    throw error;
  }
}
```


---

## Authentication Errors (4xxx)

Errors related to API authentication and authorization.

### 4001 - INVALID_API_KEY

**Description:** The provided API key is invalid or missing.

**Common Causes:**
- API key not provided in header
- Incorrect API key format
- Typo in API key
- API key from different environment

**Resolution:**
1. Verify API key is included in `X-API-Key` header
2. Check API key format (should start with `ak_live_` or `ak_test_`)
3. Copy API key directly from admin panel
4. Generate new API key if needed

**Example:**
```json
{
  "error": {
    "code": 4001,
    "name": "INVALID_API_KEY",
    "message": "API key is invalid or missing",
    "details": {
      "header": "X-API-Key"
    }
  }
}
```

**Code Example:**
```javascript
// Correct way to include API key
const response = await fetch('http://localhost:8080/api/devices', {
  headers: {
    'X-API-Key': 'your-api-key-here'
  }
});

if (response.status === 401) {
  const error = await response.json();
  if (error.error.code === 4001) {
    console.error('Invalid API key. Please check your credentials.');
  }
}
```

---

### 4002 - API_KEY_REVOKED

**Description:** The API key has been revoked and is no longer valid.

**Common Causes:**
- API key was manually revoked
- Security breach response
- Key rotation
- Administrative action

**Resolution:**
1. Generate a new API key from admin panel
2. Update application configuration with new key
3. Contact administrator if unexpected

**Example:**
```json
{
  "error": {
    "code": 4002,
    "name": "API_KEY_REVOKED",
    "message": "API key has been revoked",
    "details": {
      "revokedAt": "2025-11-05T10:00:00Z",
      "reason": "Security rotation"
    }
  }
}
```

---

### 4003 - UNAUTHORIZED

**Description:** Insufficient permissions to perform the requested operation.

**Common Causes:**
- Using API key for admin-only endpoint
- Missing required permissions
- Token expired
- Wrong authentication method

**Resolution:**
1. Use admin token for admin endpoints
2. Check API key permissions
3. Refresh expired tokens
4. Use correct authentication method

**Example:**
```json
{
  "error": {
    "code": 4003,
    "name": "UNAUTHORIZED",
    "message": "Insufficient permissions",
    "details": {
      "required": "admin",
      "provided": "api_key"
    }
  }
}
```

**Code Example:**
```javascript
// Admin endpoints require JWT token, not API key
async function getConfig() {
  try {
    const response = await fetch('http://localhost:8080/api/config', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    return await response.json();
  } catch (error) {
    if (error.code === 4003) {
      console.error('Admin access required. Please login first.');
      // Redirect to login
    }
  }
}
```

---

### 4004 - RATE_LIMIT_EXCEEDED

**Description:** Too many requests have been made in a short time period.

**Common Causes:**
- Exceeding 100 requests per minute
- Rapid polling
- Retry loops without delays
- Multiple concurrent requests

**Resolution:**
1. Implement exponential backoff
2. Use WebSocket instead of polling
3. Cache responses when possible
4. Reduce request frequency

**Example:**
```json
{
  "error": {
    "code": 4004,
    "name": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 100,
      "window": 60000,
      "retryAfter": 45
    }
  }
}
```

**Code Example:**
```javascript
async function makeRequestWithRateLimit(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    if (error.code === 4004) {
      const retryAfter = error.details?.retryAfter || 60;
      console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
      
      await sleep(retryAfter * 1000);
      return await apiCall();
    }
    throw error;
  }
}

// Better approach: Use exponential backoff
async function makeRequestWithBackoff(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.code === 4004 && i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 30000);
        console.log(`Rate limited. Waiting ${delay}ms before retry ${i + 1}/${maxRetries}`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```


---

## System Errors (5xxx)

Errors related to system operations and service health.

### 5001 - INTERNAL_ERROR

**Description:** An unexpected internal server error occurred.

**Common Causes:**
- Unhandled exception
- Software bug
- Resource exhaustion
- System instability

**Resolution:**
1. Check service logs for details
2. Restart the service
3. Report bug if reproducible
4. Check system resources (CPU, memory, disk)

**Example:**
```json
{
  "error": {
    "code": 5001,
    "name": "INTERNAL_ERROR",
    "message": "Internal server error",
    "details": {
      "timestamp": "2025-11-05T14:30:00Z",
      "requestId": "req-abc123"
    }
  }
}
```

**Code Example:**
```javascript
async function handleInternalError(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    if (error.code === 5001) {
      console.error('Internal server error occurred.');
      console.error('Request ID:', error.details?.requestId);
      
      // Log error for support
      logErrorToSupport(error);
      
      // Show user-friendly message
      showError('An unexpected error occurred. Please try again later.');
    }
    throw error;
  }
}
```

---

### 5002 - SERVICE_UNAVAILABLE

**Description:** The service is temporarily unavailable.

**Common Causes:**
- Service is starting up
- Service is shutting down
- Maintenance mode
- System overload

**Resolution:**
1. Wait and retry after a short delay
2. Check service status
3. Verify service is running
4. Check system resources

**Example:**
```json
{
  "error": {
    "code": 5002,
    "name": "SERVICE_UNAVAILABLE",
    "message": "Service temporarily unavailable",
    "details": {
      "reason": "Service is starting",
      "retryAfter": 30
    }
  }
}
```

**Code Example:**
```javascript
async function callWithServiceCheck(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.code === 5002) {
        const retryAfter = error.details?.retryAfter || 10;
        console.log(`Service unavailable. Retrying in ${retryAfter} seconds...`);
        
        if (i < maxRetries - 1) {
          await sleep(retryAfter * 1000);
          continue;
        }
      }
      throw error;
    }
  }
}
```

---

### 5003 - CONFIGURATION_ERROR

**Description:** Invalid service configuration detected.

**Common Causes:**
- Corrupted configuration file
- Invalid configuration values
- Missing required settings
- Configuration file not found

**Resolution:**
1. Check configuration file syntax
2. Validate configuration values
3. Restore default configuration
4. Check file permissions

**Example:**
```json
{
  "error": {
    "code": 5003,
    "name": "CONFIGURATION_ERROR",
    "message": "Invalid configuration",
    "details": {
      "file": "config.json",
      "field": "server.port",
      "reason": "Port must be between 1 and 65535"
    }
  }
}
```

---

### 5004 - BACKUP_FAILED

**Description:** Backup operation failed.

**Common Causes:**
- Insufficient disk space
- Permission issues
- Database locked
- I/O errors

**Resolution:**
1. Check available disk space
2. Verify write permissions
3. Ensure database is not locked
4. Check disk health

**Example:**
```json
{
  "error": {
    "code": 5004,
    "name": "BACKUP_FAILED",
    "message": "Backup operation failed",
    "details": {
      "reason": "Insufficient disk space",
      "required": 104857600,
      "available": 52428800
    }
  }
}
```

---

### 5005 - UPDATE_FAILED

**Description:** Software update installation failed.

**Common Causes:**
- Download interrupted
- Corrupted update file
- Insufficient permissions
- Incompatible version

**Resolution:**
1. Retry the update
2. Check internet connection
3. Verify sufficient disk space
4. Run with administrator privileges

**Example:**
```json
{
  "error": {
    "code": 5005,
    "name": "UPDATE_FAILED",
    "message": "Update installation failed",
    "details": {
      "version": "1.1.0",
      "reason": "Checksum verification failed"
    }
  }
}
```


---

## Error Handling Best Practices

### 1. Always Check Error Codes

Don't rely solely on HTTP status codes. Check the error code for specific handling:

```javascript
async function handleApiCall(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    switch (error.code) {
      case 1001:
        // Handle device not found
        break;
      case 2001:
        // Handle low quality
        break;
      case 4004:
        // Handle rate limit
        break;
      default:
        // Handle unknown error
    }
  }
}
```

### 2. Implement Retry Logic

Retry transient errors with exponential backoff:

```javascript
async function retryableRequest(apiCall, retryableCodes = [1002, 1005, 5002]) {
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      const isRetryable = retryableCodes.includes(error.code);
      const isLastAttempt = attempt === maxRetries - 1;

      if (isRetryable && !isLastAttempt) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }
}
```

### 3. Provide User-Friendly Messages

Map error codes to user-friendly messages:

```javascript
const errorMessages = {
  1001: 'Please connect the fingerprint reader and try again.',
  1002: 'The fingerprint reader is busy. Please wait a moment.',
  2001: 'Fingerprint quality is too low. Please clean your finger and try again.',
  2002: 'No fingerprint detected. Please place your finger on the sensor.',
  4001: 'Authentication failed. Please check your credentials.',
  4004: 'Too many requests. Please wait a moment before trying again.'
};

function getUserMessage(errorCode) {
  return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
}
```

### 4. Log Errors for Debugging

Always log errors with context:

```javascript
function logError(error, context = {}) {
  console.error('API Error:', {
    code: error.code,
    name: error.name,
    message: error.message,
    details: error.details,
    context: context,
    timestamp: new Date().toISOString()
  });
}

// Usage
try {
  await api.enrollFingerprint(userId);
} catch (error) {
  logError(error, { operation: 'enrollment', userId });
  throw error;
}
```

### 5. Handle Specific Error Categories

Group error handling by category:

```javascript
function handleError(error) {
  const category = Math.floor(error.code / 1000);

  switch (category) {
    case 1: // Device errors
      return handleDeviceError(error);
    case 2: // Fingerprint errors
      return handleFingerprintError(error);
    case 3: // Database errors
      return handleDatabaseError(error);
    case 4: // Auth errors
      return handleAuthError(error);
    case 5: // System errors
      return handleSystemError(error);
    default:
      return handleUnknownError(error);
  }
}
```

### 6. Implement Circuit Breaker Pattern

Prevent cascading failures with circuit breaker:

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(apiCall) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await apiCall();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.log(`Circuit breaker opened. Will retry after ${this.timeout}ms`);
    }
  }
}

// Usage
const breaker = new CircuitBreaker();

async function safeApiCall() {
  return await breaker.execute(() => api.getDevices());
}
```

---

## Error Code Quick Reference

### Device Errors (1xxx)
| Code | Name | Description |
|------|------|-------------|
| 1001 | DEVICE_NOT_FOUND | Fingerprint reader not connected |
| 1002 | DEVICE_BUSY | Device is currently in use |
| 1003 | DEVICE_DISCONNECTED | Device connection lost |
| 1004 | DEVICE_INIT_FAILED | Failed to initialize device |
| 1005 | DEVICE_TIMEOUT | Device operation timed out |

### Fingerprint Errors (2xxx)
| Code | Name | Description |
|------|------|-------------|
| 2001 | LOW_QUALITY | Fingerprint quality below threshold |
| 2002 | NO_FINGERPRINT_DETECTED | No fingerprint detected on sensor |
| 2003 | TEMPLATE_EXTRACTION_FAILED | Failed to extract template from image |
| 2004 | MATCH_FAILED | Fingerprint matching failed |
| 2005 | ENROLLMENT_FAILED | Enrollment process failed |

### Database Errors (3xxx)
| Code | Name | Description |
|------|------|-------------|
| 3001 | DB_CONNECTION_FAILED | Database connection failed |
| 3002 | DB_QUERY_FAILED | Database query failed |
| 3003 | DUPLICATE_ENTRY | Record already exists |
| 3004 | RECORD_NOT_FOUND | Record not found in database |

### Authentication Errors (4xxx)
| Code | Name | Description |
|------|------|-------------|
| 4001 | INVALID_API_KEY | API key is invalid or missing |
| 4002 | API_KEY_REVOKED | API key has been revoked |
| 4003 | UNAUTHORIZED | Insufficient permissions |
| 4004 | RATE_LIMIT_EXCEEDED | Too many requests |

### System Errors (5xxx)
| Code | Name | Description |
|------|------|-------------|
| 5001 | INTERNAL_ERROR | Internal server error |
| 5002 | SERVICE_UNAVAILABLE | Service temporarily unavailable |
| 5003 | CONFIGURATION_ERROR | Invalid configuration |
| 5004 | BACKUP_FAILED | Backup operation failed |
| 5005 | UPDATE_FAILED | Update installation failed |

---

## Troubleshooting Common Scenarios

### Scenario 1: Enrollment Keeps Failing

**Symptoms:** Repeated 2001 (LOW_QUALITY) or 2005 (ENROLLMENT_FAILED) errors

**Solutions:**
1. Clean the sensor surface thoroughly
2. Ensure user's finger is clean and dry
3. Guide user on proper finger placement
4. Lower quality threshold temporarily
5. Try a different finger
6. Check sensor hardware

### Scenario 2: Device Not Detected

**Symptoms:** Consistent 1001 (DEVICE_NOT_FOUND) errors

**Solutions:**
1. Check physical USB connection
2. Verify device appears in Device Manager (Windows) or lsusb (Linux)
3. Reinstall device drivers
4. Restart the Fingerprint Service
5. Try a different USB port
6. Check device compatibility

### Scenario 3: Rate Limiting Issues

**Symptoms:** Frequent 4004 (RATE_LIMIT_EXCEEDED) errors

**Solutions:**
1. Implement request queuing
2. Use WebSocket instead of polling
3. Add delays between requests
4. Cache responses when possible
5. Implement exponential backoff
6. Review application logic for unnecessary requests

### Scenario 4: Authentication Failures

**Symptoms:** 4001 (INVALID_API_KEY) or 4003 (UNAUTHORIZED) errors

**Solutions:**
1. Verify API key is correct
2. Check API key is in correct header
3. Ensure API key hasn't been revoked
4. Use admin token for admin endpoints
5. Generate new API key if needed

---

## Next Steps

- [REST API Reference](./rest-api.md) - Complete API endpoint documentation
- [WebSocket API Reference](./websocket.md) - Real-time event handling
- [Best Practices Guide](/docs/guides/best-practices) - Advanced error handling patterns
- [Troubleshooting Guide](/docs/getting-started/installation#troubleshooting) - General troubleshooting
