---
sidebar_position: 3
title: Quick Start
description: Get up and running with the Fingerprint Service in 5 minutes
---

# Quick Start

Get started with the Fingerprint Service in just a few minutes. This guide will walk you through making your first API call and performing a basic fingerprint enrollment.

## Prerequisites

Before you begin, make sure you have:

- ✅ Fingerprint Service installed and running ([Installation Guide](./installation.md))
- ✅ ZKTeco SLK20R fingerprint reader connected
- ✅ API key ready ([Authentication Guide](./authentication.md))

## Step 1: Verify Service is Running

First, check that the service is running and accessible:

```bash
curl http://localhost:8080/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "deviceStatus": "connected",
  "dbStatus": "operational",
  "version": "1.0.0"
}
```

If you get an error, make sure the service is started. See the [Installation Guide](./installation.md#troubleshooting) for help.

## Step 2: Check Connected Devices

List all connected fingerprint readers:

```bash
curl http://localhost:8080/api/devices \
  -H "X-API-Key: YOUR_API_KEY"
```

**Expected response:**
```json
[
  {
    "id": "device-001",
    "serialNumber": "SLK20R-12345",
    "model": "ZKTeco SLK20R",
    "status": "connected",
    "lastActivity": "2025-11-07T10:30:00Z"
  }
]
```

:::tip
Save the `id` value (e.g., `device-001`) - you'll need it for fingerprint operations.
:::

## Step 3: Your First Fingerprint Enrollment

Now let's enroll a fingerprint! This is a complete working example you can run immediately.

### Using cURL

```bash
# Start enrollment
curl -X POST http://localhost:8080/api/fingerprint/enroll \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-001",
    "userId": "user-001",
    "metadata": {
      "name": "John Doe",
      "department": "Engineering"
    }
  }'
```

**What happens:**
1. The service prompts you to place your finger on the reader
2. You'll need to scan the same finger **3 times**
3. The service creates a merged template from all 3 scans
4. You receive the fingerprint template

**Expected response:**
```json
{
  "template": "Rk1SACAyMAAAAADkAAABAAGQAMUAxQEAAAAoJ4CEAICkEYCJ...",
  "quality": 92,
  "enrollmentId": "enroll-789",
  "scansCompleted": 3,
  "message": "Enrollment successful"
}
```

:::tip
Save the `template` value - this is the fingerprint data you'll use for verification!
:::

### Using JavaScript

```javascript
const API_KEY = 'YOUR_API_KEY';
const API_URL = 'http://localhost:8080/api';

async function enrollFingerprint(userId, name) {
  const response = await fetch(`${API_URL}/fingerprint/enroll`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      deviceId: 'device-001',
      userId: userId,
      metadata: { name: name }
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('Enrollment successful!');
    console.log('Quality:', data.quality);
    console.log('Template:', data.template);
    return data.template;
  } else {
    console.error('Enrollment failed:', data.error);
    throw new Error(data.error.message);
  }
}

// Use it
enrollFingerprint('user-001', 'John Doe')
  .then(template => {
    // Save template to your database
    console.log('Save this template:', template);
  })
  .catch(error => console.error(error));
```

### Using Python

```python
import requests
import json

API_KEY = 'YOUR_API_KEY'
API_URL = 'http://localhost:8080/api'

def enroll_fingerprint(user_id, name):
    headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
    }
    
    payload = {
        'deviceId': 'device-001',
        'userId': user_id,
        'metadata': {'name': name}
    }
    
    response = requests.post(
        f'{API_URL}/fingerprint/enroll',
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"Enrollment successful!")
        print(f"Quality: {data['quality']}")
        print(f"Template: {data['template']}")
        return data['template']
    else:
        error = response.json()
        print(f"Enrollment failed: {error['error']['message']}")
        raise Exception(error['error']['message'])

# Use it
try:
    template = enroll_fingerprint('user-001', 'John Doe')
    # Save template to your database
    print(f"Save this template: {template}")
except Exception as e:
    print(f"Error: {e}")
```

## Step 4: Verify a Fingerprint

Now let's verify the fingerprint we just enrolled:

### Using cURL

```bash
curl -X POST http://localhost:8080/api/fingerprint/verify \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "Rk1SACAyMAAAAADkAAABAAGQAMUAxQEAAAAoJ4CEAICkEYCJ...",
    "userId": "user-001",
    "deviceId": "device-001"
  }'
```

**Expected response:**
```json
{
  "match": true,
  "confidence": 95.5,
  "userId": "user-001",
  "verificationTime": 145
}
```

### Using JavaScript

```javascript
async function verifyFingerprint(userId, template) {
  const response = await fetch(`${API_URL}/fingerprint/verify`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      template: template,
      userId: userId,
      deviceId: 'device-001'
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    if (data.match) {
      console.log(`✓ Verified! Confidence: ${data.confidence}%`);
    } else {
      console.log('✗ No match');
    }
    return data;
  } else {
    console.error('Verification failed:', data.error);
    throw new Error(data.error.message);
  }
}

// Use it
verifyFingerprint('user-001', savedTemplate)
  .then(result => {
    if (result.match) {
      console.log('User authenticated successfully!');
    }
  })
  .catch(error => console.error(error));
```

### Using Python

```python
def verify_fingerprint(user_id, template):
    headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
    }
    
    payload = {
        'template': template,
        'userId': user_id,
        'deviceId': 'device-001'
    }
    
    response = requests.post(
        f'{API_URL}/fingerprint/verify',
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        data = response.json()
        if data['match']:
            print(f"✓ Verified! Confidence: {data['confidence']}%")
        else:
            print("✗ No match")
        return data
    else:
        error = response.json()
        print(f"Verification failed: {error['error']['message']}")
        raise Exception(error['error']['message'])

# Use it
try:
    result = verify_fingerprint('user-001', saved_template)
    if result['match']:
        print("User authenticated successfully!")
except Exception as e:
    print(f"Error: {e}")
```

## Step 5: Real-Time Events with WebSocket

For a better user experience, use WebSocket to receive real-time notifications:

### JavaScript WebSocket Example

```javascript
const ws = new WebSocket('ws://localhost:8080');

// Authenticate
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    apiKey: 'YOUR_API_KEY'
  }));
};

// Handle messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'auth:success':
      console.log('✓ WebSocket authenticated');
      // Subscribe to device events
      ws.send(JSON.stringify({
        type: 'subscribe',
        deviceId: 'device-001'
      }));
      break;
      
    case 'fingerprint:detected':
      console.log('👆 Finger detected on reader');
      console.log('Quality:', message.quality);
      break;
      
    case 'scan:complete':
      console.log('✓ Scan complete!');
      console.log('Template:', message.template);
      console.log('Quality:', message.quality);
      break;
      
    case 'scan:error':
      console.error('✗ Scan error:', message.error);
      break;
      
    case 'device:connected':
      console.log('✓ Device connected:', message.device.id);
      break;
      
    case 'device:disconnected':
      console.log('✗ Device disconnected:', message.deviceId);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket connection closed');
};
```

## Complete Working Example

Here's a complete example that puts it all together:

```javascript
const API_KEY = 'YOUR_API_KEY';
const API_URL = 'http://localhost:8080/api';

class FingerprintClient {
  constructor(apiKey, apiUrl) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data;
  }

  async getDevices() {
    return this.request('/devices');
  }

  async enrollFingerprint(deviceId, userId, metadata) {
    return this.request('/fingerprint/enroll', {
      method: 'POST',
      body: JSON.stringify({ deviceId, userId, metadata })
    });
  }

  async verifyFingerprint(deviceId, userId, template) {
    return this.request('/fingerprint/verify', {
      method: 'POST',
      body: JSON.stringify({ deviceId, userId, template })
    });
  }

  async identifyFingerprint(deviceId, template) {
    return this.request('/fingerprint/identify', {
      method: 'POST',
      body: JSON.stringify({ deviceId, template })
    });
  }
}

// Usage
const client = new FingerprintClient(API_KEY, API_URL);

async function main() {
  try {
    // 1. Get devices
    console.log('Fetching devices...');
    const devices = await client.getDevices();
    console.log('Connected devices:', devices);

    const deviceId = devices[0].id;

    // 2. Enroll a fingerprint
    console.log('\nEnrolling fingerprint...');
    console.log('Please scan your finger 3 times...');
    
    const enrollment = await client.enrollFingerprint(
      deviceId,
      'user-123',
      { name: 'John Doe', email: 'john@example.com' }
    );
    
    console.log('✓ Enrollment successful!');
    console.log('Quality:', enrollment.quality);
    
    const template = enrollment.template;

    // 3. Verify the fingerprint
    console.log('\nVerifying fingerprint...');
    console.log('Please scan your finger again...');
    
    const verification = await client.verifyFingerprint(
      deviceId,
      'user-123',
      template
    );
    
    if (verification.match) {
      console.log('✓ Verification successful!');
      console.log('Confidence:', verification.confidence);
    } else {
      console.log('✗ Verification failed');
    }

    // 4. Identify (1:N search)
    console.log('\nIdentifying fingerprint...');
    console.log('Please scan your finger...');
    
    const identification = await client.identifyFingerprint(
      deviceId,
      template
    );
    
    if (identification.match) {
      console.log('✓ Identified user:', identification.userId);
      console.log('Confidence:', identification.confidence);
    } else {
      console.log('✗ No match found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

## What's Next?

Congratulations! You've successfully:
- ✅ Verified the service is running
- ✅ Listed connected devices
- ✅ Enrolled a fingerprint
- ✅ Verified a fingerprint
- ✅ Learned about WebSocket events

### Next Steps

1. **Learn the workflows**
   - [Enrollment Flow](../guides/enrollment-flow.md) - Detailed enrollment process
   - [Verification Flow](../guides/verification-flow.md) - 1:1 verification
   - [Identification Flow](../guides/identification-flow.md) - 1:N identification

2. **Explore framework integrations**
   - [React Integration](../integration/react.md) - React hooks and components
   - [Angular Integration](../integration/angular.md) - Angular services
   - [Vue Integration](../integration/vue.md) - Vue composables
   - [Python Integration](../integration/python.md) - Python client
   - [PHP Integration](../integration/php.md) - PHP client

3. **Check out complete examples**
   - [Login System](../examples/login-system.md) - Fingerprint authentication
   - [Attendance System](../examples/attendance-system.md) - Time tracking
   - [Access Control](../examples/access-control.md) - Door access

4. **Review best practices**
   - [Best Practices Guide](../guides/best-practices.md) - Production tips
   - [Error Handling](../api-reference/error-codes.md) - Error codes reference

## Common Issues

### "Device not found" Error

**Problem:** The device ID doesn't exist or device is disconnected.

**Solution:**
```bash
# Check connected devices
curl http://localhost:8080/api/devices \
  -H "X-API-Key: YOUR_API_KEY"

# Use the correct device ID from the response
```

### "Low quality scan" Error

**Problem:** The fingerprint scan quality is below the threshold.

**Solution:**
- Clean the fingerprint reader sensor
- Ensure finger is dry and clean
- Press firmly but not too hard
- Try a different finger
- Adjust quality threshold in configuration (if needed)

### "Rate limit exceeded" Error

**Problem:** Too many requests in a short time.

**Solution:**
```javascript
// Implement retry with exponential backoff
async function requestWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('rate limit') && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### "Invalid API key" Error

**Problem:** API key is missing, incorrect, or revoked.

**Solution:**
1. Check that you're including the `X-API-Key` header
2. Verify the API key is correct (no extra spaces or characters)
3. Generate a new API key if needed (see [Authentication Guide](./authentication.md))

## Tips for Success

### 1. Store Templates Securely

Always store fingerprint templates in your own database:

```javascript
// After enrollment
const enrollment = await client.enrollFingerprint(deviceId, userId, metadata);

// Save to your database
await database.users.update(userId, {
  fingerprintTemplate: enrollment.template,
  fingerprintQuality: enrollment.quality,
  enrolledAt: new Date()
});
```

### 2. Handle Quality Validation

Check quality scores and prompt for re-scan if needed:

```javascript
async function enrollWithQualityCheck(deviceId, userId, minQuality = 70) {
  const enrollment = await client.enrollFingerprint(deviceId, userId, {});
  
  if (enrollment.quality < minQuality) {
    console.log(`Quality too low (${enrollment.quality}). Please try again.`);
    return enrollWithQualityCheck(deviceId, userId, minQuality);
  }
  
  return enrollment;
}
```

### 3. Implement Error Handling

Always handle errors gracefully:

```javascript
async function safeEnrollment(deviceId, userId) {
  try {
    return await client.enrollFingerprint(deviceId, userId, {});
  } catch (error) {
    if (error.message.includes('device not found')) {
      console.error('Please connect the fingerprint reader');
    } else if (error.message.includes('low quality')) {
      console.error('Please clean your finger and try again');
    } else {
      console.error('Enrollment failed:', error.message);
    }
    throw error;
  }
}
```

### 4. Use WebSocket for Better UX

WebSocket provides real-time feedback during scanning:

```javascript
function setupRealtimeFeedback(ws, deviceId) {
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case 'fingerprint:detected':
        showMessage('Finger detected, scanning...');
        break;
      case 'scan:complete':
        showMessage('Scan complete!');
        break;
      case 'scan:error':
        showMessage('Scan failed, please try again');
        break;
    }
  };
}
```

## Testing Your Integration

Use these test scenarios to verify your integration:

### Test 1: Basic Enrollment
```bash
# Should succeed with quality > 60
curl -X POST http://localhost:8080/api/fingerprint/enroll \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "device-001", "userId": "test-001"}'
```

### Test 2: Verification
```bash
# Should match with confidence > 80
curl -X POST http://localhost:8080/api/fingerprint/verify \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "device-001", "userId": "test-001", "template": "..."}'
```

### Test 3: Error Handling
```bash
# Should return 404 error
curl -X POST http://localhost:8080/api/fingerprint/verify \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "invalid-device", "userId": "test-001", "template": "..."}'
```

## Need Help?

- 📖 [Full API Reference](../api-reference/rest-api.md)
- 🔧 [Troubleshooting Guide](../troubleshooting.md)
- 💬 [Community Forum](https://community.example.com)
- 🐛 [Report Issues](https://github.com/your-org/fingerprint-service/issues)

Happy coding! 🚀
