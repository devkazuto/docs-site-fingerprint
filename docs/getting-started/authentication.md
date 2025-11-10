---
sidebar_position: 2
title: Authentication
description: Learn how to authenticate API requests using API keys
---

# Authentication

The Fingerprint Background Service uses API keys to authenticate requests. This guide explains how to create, manage, and use API keys in your applications.

## Overview

All API requests (except health checks) require authentication using an API key. API keys are passed in the request header and provide secure access to the service.

**Authentication Methods:**
- **API Key Authentication**: For application-to-service communication (REST API)
- **JWT Token Authentication**: For admin access to Web Admin interface
- **WebSocket Authentication**: For real-time event subscriptions

## API Key Authentication

### What is an API Key?

An API key is a unique identifier that authenticates your application when making requests to the Fingerprint Service. It looks like this:

```
ak_live_1234567890abcdef1234567890abcdef
```

API keys have the following format:
- Prefix: `ak_` (API Key)
- Environment: `live_` or `test_`
- Random string: 32 characters

### Creating an API Key

You can create API keys in two ways:

#### Method 1: During Installation

When you install the Fingerprint Service, the installer prompts you to generate an API key. This key is automatically saved to the configuration file.

#### Method 2: Using Web Admin

1. **Open Web Admin**:
   ```
   http://localhost:8080/admin
   ```

2. **Login** with your admin credentials

3. **Navigate to Settings → API Keys**

4. **Click "Create New API Key"**

5. **Fill in the details**:
   - **Name**: A descriptive name (e.g., "Production App", "Mobile App")
   - **Permissions** (optional): Restrict access to specific operations
   - **Expiration** (optional): Set an expiration date

6. **Click "Generate"**

7. **Copy and save the API key** - You won't be able to see it again!

#### Method 3: Using REST API

Create an API key programmatically (requires admin authentication):

```bash
curl -X POST http://localhost:8080/api/config/api-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production App",
    "permissions": ["fingerprint:enroll", "fingerprint:verify", "fingerprint:identify"]
  }'
```

Response:
```json
{
  "id": 5,
  "key": "ak_live_xyz789abc123def456ghi789jkl012mno",
  "name": "Production App",
  "createdAt": "2025-11-07T10:30:00Z"
}
```

### Using API Keys in Requests

Include your API key in the `X-API-Key` header with every request:

#### cURL Example

```bash
curl http://localhost:8080/api/devices \
  -H "X-API-Key: ak_live_1234567890abcdef1234567890abcdef"
```

#### JavaScript Example

```javascript
fetch('http://localhost:8080/api/devices', {
  headers: {
    'X-API-Key': 'ak_live_1234567890abcdef1234567890abcdef'
  }
})
  .then(response => response.json())
  .then(data => console.log(data));
```

#### Python Example

```python
import requests

headers = {
    'X-API-Key': 'ak_live_1234567890abcdef1234567890abcdef'
}

response = requests.get('http://localhost:8080/api/devices', headers=headers)
print(response.json())
```

#### PHP Example

```php
<?php
$ch = curl_init('http://localhost:8080/api/devices');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: ak_live_1234567890abcdef1234567890abcdef'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);
?>
```

#### C# Example

```csharp
using System.Net.Http;

var client = new HttpClient();
client.DefaultRequestHeaders.Add("X-API-Key", "ak_live_1234567890abcdef1234567890abcdef");

var response = await client.GetAsync("http://localhost:8080/api/devices");
var content = await response.Content.ReadAsStringAsync();
Console.WriteLine(content);
```

#### Java Example

```java
import java.net.http.*;
import java.net.URI;

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("http://localhost:8080/api/devices"))
    .header("X-API-Key", "ak_live_1234567890abcdef1234567890abcdef")
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());
```

## JWT Token Authentication (Admin)

The Web Admin interface uses JWT (JSON Web Token) authentication for admin access.

### Admin Login

To access admin endpoints, you need to login first:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-admin-password"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 1800
}
```

### Using JWT Token

Include the token in the `Authorization` header with the `Bearer` prefix:

```bash
curl http://localhost:8080/api/config \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Expiration

JWT tokens expire after 30 minutes (1800 seconds) by default. When a token expires, you'll receive a `401 Unauthorized` response. Simply login again to get a new token.

## WebSocket Authentication

WebSocket connections also require authentication.

### Authenticating WebSocket Connection

After establishing a WebSocket connection, send an authentication message:

#### Using API Key

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  // Authenticate with API key
  ws.send(JSON.stringify({
    type: 'auth',
    apiKey: 'ak_live_1234567890abcdef1234567890abcdef'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'auth:success') {
    console.log('Authenticated successfully');
    // Now you can subscribe to events
  }
};
```

#### Using Admin Token

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  // Authenticate with admin token
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }));
};
```

### Authentication Response

After sending authentication, you'll receive a response:

**Success:**
```json
{
  "type": "auth:success",
  "message": "Authentication successful"
}
```

**Failure:**
```json
{
  "type": "auth:error",
  "message": "Invalid API key",
  "code": 4001
}
```

## Managing API Keys

### Listing API Keys

View all API keys (requires admin authentication):

```bash
curl http://localhost:8080/api/config/api-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Response:
```json
[
  {
    "id": 1,
    "key": "ak_live_abc123...",
    "name": "Production App",
    "lastUsed": "2025-11-07T14:20:00Z",
    "createdAt": "2025-01-15T10:00:00Z",
    "revoked": false
  },
  {
    "id": 2,
    "key": "ak_test_xyz789...",
    "name": "Development",
    "lastUsed": "2025-11-06T09:15:00Z",
    "createdAt": "2025-02-01T08:30:00Z",
    "revoked": false
  }
]
```

### Revoking API Keys

If an API key is compromised or no longer needed, revoke it:

```bash
curl -X DELETE http://localhost:8080/api/config/api-keys/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Response:
```json
{
  "status": "success",
  "message": "API key revoked"
}
```

:::warning
Revoking an API key immediately invalidates it. Any applications using that key will no longer be able to access the API.
:::

### API Key Permissions

You can restrict API keys to specific operations:

**Available Permissions:**
- `fingerprint:enroll` - Enroll new fingerprints
- `fingerprint:verify` - Verify fingerprints (1:1)
- `fingerprint:identify` - Identify fingerprints (1:N)
- `fingerprint:delete` - Delete fingerprint templates
- `device:read` - Read device information
- `device:manage` - Manage device settings
- `database:read` - Read database statistics
- `database:export` - Export database
- `database:import` - Import database

**Example: Create a read-only API key**

```bash
curl -X POST http://localhost:8080/api/config/api-keys \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Read-Only App",
    "permissions": ["device:read", "database:read"]
  }'
```

## Authentication Errors

### Common Error Codes

| Code | Error | Description | Solution |
|------|-------|-------------|----------|
| 4001 | INVALID_API_KEY | API key is invalid or missing | Check that you're sending the correct API key in the `X-API-Key` header |
| 4002 | API_KEY_REVOKED | API key has been revoked | Generate a new API key |
| 4003 | UNAUTHORIZED | Insufficient permissions | Check that your API key has the required permissions |
| 4004 | RATE_LIMIT_EXCEEDED | Too many requests | Wait before retrying (see `Retry-After` header) |
| 4005 | TOKEN_EXPIRED | JWT token has expired | Login again to get a new token |

### Error Response Format

When authentication fails, you'll receive an error response:

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or missing",
    "statusCode": 401
  }
}
```

### Handling Authentication Errors

**JavaScript Example:**

```javascript
async function makeAuthenticatedRequest(url, apiKey) {
  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey
      }
    });

    if (response.status === 401) {
      const error = await response.json();
      
      if (error.error.code === 'INVALID_API_KEY') {
        console.error('Invalid API key. Please check your credentials.');
      } else if (error.error.code === 'API_KEY_REVOKED') {
        console.error('API key has been revoked. Please generate a new one.');
      }
      
      throw new Error(error.error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

## Best Practices

### 1. Keep API Keys Secure

- **Never commit API keys to version control**
- Store API keys in environment variables or secure configuration
- Use different API keys for development, staging, and production
- Rotate API keys regularly

**Example: Using environment variables**

```javascript
// .env file (never commit this!)
FINGERPRINT_API_KEY=ak_live_1234567890abcdef1234567890abcdef

// In your code
const apiKey = process.env.FINGERPRINT_API_KEY;
```

### 2. Use Appropriate Permissions

Create API keys with the minimum required permissions:

```javascript
// Good: Specific permissions for a verification-only app
{
  "name": "Attendance App",
  "permissions": ["fingerprint:verify", "device:read"]
}

// Bad: Unnecessary permissions
{
  "name": "Attendance App",
  "permissions": ["*"]  // Grants all permissions
}
```

### 3. Monitor API Key Usage

Regularly check the `lastUsed` timestamp to identify:
- Unused API keys (can be revoked)
- Suspicious activity (unexpected usage patterns)
- Keys that should be rotated

### 4. Implement Retry Logic

Handle rate limiting gracefully:

```javascript
async function makeRequestWithRetry(url, apiKey, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: { 'X-API-Key': apiKey }
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

### 5. Use HTTPS in Production

Always use HTTPS in production to prevent API keys from being intercepted:

```javascript
// Development
const API_URL = 'http://localhost:8080';

// Production
const API_URL = 'https://fingerprint-api.your-domain.com';
```

### 6. Separate Keys for Different Environments

Use different API keys for each environment:

```javascript
const API_KEYS = {
  development: 'ak_test_dev123...',
  staging: 'ak_test_staging456...',
  production: 'ak_live_prod789...'
};

const apiKey = API_KEYS[process.env.NODE_ENV];
```

## Testing Authentication

### Test API Key

Verify your API key is working:

```bash
curl http://localhost:8080/api/devices \
  -H "X-API-Key: YOUR_API_KEY" \
  -v
```

**Expected response (success):**
```
< HTTP/1.1 200 OK
< Content-Type: application/json
[
  {
    "id": "device-001",
    "status": "connected"
  }
]
```

**Expected response (failure):**
```
< HTTP/1.1 401 Unauthorized
< Content-Type: application/json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or missing"
  }
}
```

### Test Admin Login

Verify admin credentials:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password"
  }' \
  -v
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **API Requests**: 100 requests per minute per API key
- **Fingerprint Scans**: 10 scans per minute per device
- **Admin Endpoints**: 20 requests per minute per token

When you exceed the rate limit, you'll receive:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 45
  }
}
```

The `Retry-After` header indicates how many seconds to wait before retrying.

## Next Steps

Now that you understand authentication:

1. [Quick Start Guide](./quick-start.md) - Make your first authenticated API call
2. [REST API Reference](../api-reference/rest-api.md) - Explore all available endpoints
3. [Integration Guides](../integration/javascript-vanilla.md) - See framework-specific examples

## Security Checklist

Before deploying to production:

- [ ] API keys stored securely (environment variables, secrets manager)
- [ ] Different API keys for each environment
- [ ] API keys have appropriate permissions (principle of least privilege)
- [ ] HTTPS enabled for all API communication
- [ ] Admin password changed from default
- [ ] Rate limiting configured appropriately
- [ ] Monitoring set up for API key usage
- [ ] Unused API keys revoked
- [ ] API key rotation schedule established

## Troubleshooting

### "Invalid API Key" Error

**Possible causes:**
1. API key not included in request
2. Wrong header name (should be `X-API-Key`)
3. API key has been revoked
4. Typo in API key

**Solution:**
```bash
# Verify your API key format
echo "ak_live_1234567890abcdef1234567890abcdef" | wc -c
# Should be 40 characters (including prefix)

# Test with verbose output
curl -v http://localhost:8080/api/devices \
  -H "X-API-Key: YOUR_API_KEY"
```

### "Token Expired" Error

**Solution:** Login again to get a new token:

```javascript
async function getAdminToken(username, password) {
  const response = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  return data.token;
}
```

### Rate Limit Issues

**Solution:** Implement exponential backoff:

```javascript
async function makeRequestWithBackoff(url, apiKey) {
  let delay = 1000; // Start with 1 second
  
  while (true) {
    const response = await fetch(url, {
      headers: { 'X-API-Key': apiKey }
    });
    
    if (response.status !== 429) {
      return await response.json();
    }
    
    console.log(`Rate limited. Waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2; // Exponential backoff
  }
}
```
