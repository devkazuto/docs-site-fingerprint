---
sidebar_position: 1
title: Vanilla JavaScript Integration
description: Complete guide for integrating the Fingerprint Service with vanilla JavaScript
---

# Vanilla JavaScript Integration

Learn how to integrate the Fingerprint Background Service into your vanilla JavaScript applications using the native Fetch API.

## Prerequisites

- Modern browser with Fetch API support (Chrome 42+, Firefox 39+, Safari 10.1+, Edge 14+)
- Fingerprint Background Service running (default: `http://localhost:8080`)
- Valid API key

## Installation

No installation required! Vanilla JavaScript works directly in the browser. Simply include the API client code in your project.

## API Client Implementation

Create a reusable API client class to handle all fingerprint operations:

```javascript
// fingerprint-api.js
class FingerprintAPI {
  constructor(baseURL, apiKey) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Device Management
  async getDevices() {
    return this.request('/devices');
  }

  async getDeviceInfo(deviceId) {
    return this.request(`/devices/${deviceId}/info`);
  }

  async testDevice(deviceId) {
    return this.request(`/devices/${deviceId}/test`, { method: 'POST' });
  }

  // Fingerprint Operations
  async enrollFingerprint(userId, deviceId = null, metadata = {}) {
    return this.request('/fingerprint/enroll', {
      method: 'POST',
      body: JSON.stringify({ userId, deviceId, metadata }),
    });
  }

  async verifyFingerprint(template, userId, deviceId = null) {
    return this.request('/fingerprint/verify', {
      method: 'POST',
      body: JSON.stringify({ template, userId, deviceId }),
    });
  }

  async identifyFingerprint(template, deviceId = null) {
    return this.request('/fingerprint/identify', {
      method: 'POST',
      body: JSON.stringify({ template, deviceId }),
    });
  }

  async startScan(deviceId = null) {
    const query = deviceId ? `?deviceId=${deviceId}` : '';
    return this.request(`/fingerprint/scan/start${query}`);
  }

  async getScanStatus(scanId) {
    return this.request(`/fingerprint/scan/status/${scanId}`);
  }
}

// Initialize API client
const api = new FingerprintAPI('http://localhost:8080/api', 'your-api-key-here');
```

## Basic Operations

### Enrollment

Enroll a new fingerprint for a user:

```javascript
async function enrollUser(userId, userName) {
  try {
    console.log(`Starting enrollment for ${userName}...`);
    
    const result = await api.enrollFingerprint(userId, null, {
      name: userName,
      enrolledAt: new Date().toISOString()
    });

    console.log('Enrollment successful!');
    console.log(`Quality: ${result.quality}`);
    console.log(`Scans completed: ${result.scansCompleted}`);

    // Store the template in your database
    await saveTemplateToDatabase(userId, result.template);

    return result;
  } catch (error) {
    console.error('Enrollment failed:', error.message);
    throw error;
  }
}

// Usage
enrollUser('user-12345', 'John Doe')
  .then(result => {
    alert(`Enrollment successful! Quality: ${result.quality}`);
  })
  .catch(error => {
    alert(`Enrollment failed: ${error.message}`);
  });
```

### Verification (1:1)

Verify a fingerprint against a stored template:

```javascript
async function verifyUser(userId) {
  try {
    // Retrieve stored template from your database
    const storedTemplate = await getTemplateFromDatabase(userId);

    if (!storedTemplate) {
      throw new Error('No fingerprint template found for user');
    }

    console.log('Please place your finger on the scanner...');
    
    const result = await api.verifyFingerprint(storedTemplate, userId);

    if (result.match && result.confidence >= 70) {
      console.log(`Verification successful! Confidence: ${result.confidence}%`);
      return true;
    } else {
      console.log('Verification failed');
      return false;
    }
  } catch (error) {
    console.error('Verification error:', error.message);
    return false;
  }
}

// Usage
verifyUser('user-12345')
  .then(verified => {
    if (verified) {
      alert('Access granted!');
      // Proceed with login
    } else {
      alert('Access denied!');
    }
  });
```

### Identification (1:N)

Identify a user from the fingerprint database:

```javascript
async function identifyUser() {
  try {
    console.log('Please place your finger on the scanner...');
    
    // Start a scan session
    const scan = await api.startScan();
    
    // Poll for scan completion
    const template = await waitForScanCompletion(scan.scanId);
    
    // Identify the user
    const result = await api.identifyFingerprint(template);

    if (result.match) {
      console.log(`User identified: ${result.userId}`);
      console.log(`Confidence: ${result.confidence}%`);
      
      // Retrieve user details from your database
      const user = await getUserFromDatabase(result.userId);
      return user;
    } else {
      console.log('User not found in database');
      return null;
    }
  } catch (error) {
    console.error('Identification error:', error.message);
    return null;
  }
}

// Helper function to poll scan status
async function waitForScanCompletion(scanId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await api.getScanStatus(scanId);
    
    if (status.status === 'complete') {
      return status.template;
    } else if (status.status === 'error') {
      throw new Error('Scan failed');
    }
    
    // Wait 500ms before next poll
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error('Scan timeout');
}

// Usage
identifyUser()
  .then(user => {
    if (user) {
      alert(`Welcome back, ${user.name}!`);
      // Proceed with login
    } else {
      alert('User not recognized');
    }
  });
```

## Error Handling

Implement robust error handling with retry logic:

```javascript
// Error codes from the API
const ErrorCodes = {
  DEVICE_NOT_FOUND: 1001,
  DEVICE_BUSY: 1002,
  DEVICE_DISCONNECTED: 1003,
  LOW_QUALITY: 2001,
  NO_FINGERPRINT_DETECTED: 2002,
  INVALID_API_KEY: 4001,
  RATE_LIMIT_EXCEEDED: 4004,
};

async function enrollWithRetry(userId, userName, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Enrollment attempt ${attempt}/${maxAttempts}`);
      
      const result = await api.enrollFingerprint(userId, null, { name: userName });

      // Check quality threshold
      if (result.quality >= 60) {
        console.log(`Enrollment successful with quality ${result.quality}`);
        return result;
      }

      console.log(`Low quality (${result.quality}), retrying...`);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      // Handle specific error codes
      if (error.code === ErrorCodes.DEVICE_BUSY && attempt < maxAttempts) {
        console.log('Device busy, waiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      if (error.code === ErrorCodes.LOW_QUALITY && attempt < maxAttempts) {
        console.log('Low quality scan, please try again');
        continue;
      }
      
      if (error.code === ErrorCodes.DEVICE_DISCONNECTED) {
        throw new Error('Fingerprint device is disconnected. Please reconnect and try again.');
      }
      
      if (error.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
        const retryAfter = error.retryAfter || 60;
        throw new Error(`Rate limit exceeded. Please wait ${retryAfter} seconds.`);
      }
      
      throw error;
    }
  }

  throw new Error('Failed to enroll after maximum attempts. Please ensure proper finger placement.');
}

// Exponential backoff for transient errors
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage
retryWithBackoff(() => api.getDevices())
  .then(devices => console.log('Devices:', devices))
  .catch(error => console.error('Failed after retries:', error));
```

## WebSocket Integration

Use WebSocket for real-time fingerprint events:

```javascript
class FingerprintWebSocket {
  constructor(url, apiKey) {
    this.url = url;
    this.apiKey = apiKey;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = {};
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Authenticate
        this.send({ type: 'auth', apiKey: this.apiKey });
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('disconnected');
        this.attemptReconnect();
      };
    });
  }

  handleMessage(data) {
    console.log('WebSocket message:', data.type);

    switch (data.type) {
      case 'device:connected':
        this.emit('deviceConnected', data.device);
        break;
      case 'device:disconnected':
        this.emit('deviceDisconnected', data.deviceId);
        break;
      case 'fingerprint:detected':
        this.emit('fingerprintDetected', data);
        break;
      case 'scan:complete':
        this.emit('scanComplete', data);
        break;
      case 'scan:error':
        this.emit('scanError', data);
        break;
      default:
        this.emit('message', data);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  subscribe(deviceId) {
    this.send({ type: 'subscribe', deviceId });
  }

  unsubscribe(deviceId) {
    this.send({ type: 'unsubscribe', deviceId });
  }

  startScan(deviceId) {
    this.send({ type: 'scan:start', deviceId });
  }

  stopScan(scanId) {
    this.send({ type: 'scan:stop', scanId });
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage
const ws = new FingerprintWebSocket('ws://localhost:8080', 'your-api-key-here');

// Set up event listeners
ws.on('deviceConnected', (device) => {
  console.log('Device connected:', device);
  document.getElementById('device-status').textContent = 'Connected';
});

ws.on('deviceDisconnected', (deviceId) => {
  console.log('Device disconnected:', deviceId);
  document.getElementById('device-status').textContent = 'Disconnected';
});

ws.on('fingerprintDetected', (data) => {
  console.log('Fingerprint detected, quality:', data.quality);
  document.getElementById('scan-status').textContent = `Scanning... Quality: ${data.quality}`;
});

ws.on('scanComplete', (data) => {
  console.log('Scan complete:', data);
  document.getElementById('scan-status').textContent = 'Scan complete!';
  
  // Process the template
  processFingerprint(data.template, data.quality);
});

ws.on('scanError', (data) => {
  console.error('Scan error:', data.error);
  document.getElementById('scan-status').textContent = `Error: ${data.error}`;
});

// Connect
ws.connect()
  .then(() => {
    console.log('WebSocket ready');
    ws.subscribe('device-001');
  })
  .catch(error => {
    console.error('Failed to connect:', error);
  });
```

## Complete Example: Login System

Here's a complete example of a fingerprint-based login system:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fingerprint Login</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
    }
    .container {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      background: #f9f9f9;
    }
    .status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      background: #e3f2fd;
    }
    .error {
      background: #ffebee;
      color: #c62828;
    }
    .success {
      background: #e8f5e9;
      color: #2e7d32;
    }
    button {
      padding: 10px 20px;
      margin: 5px;
      border: none;
      border-radius: 4px;
      background: #2196f3;
      color: white;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background: #1976d2;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Fingerprint Login System</h1>
    
    <div id="status" class="status">Ready</div>
    
    <div>
      <h3>Enrollment</h3>
      <input type="text" id="userId" placeholder="User ID" />
      <input type="text" id="userName" placeholder="User Name" />
      <button id="enrollBtn" onclick="handleEnrollment()">Enroll Fingerprint</button>
    </div>
    
    <div>
      <h3>Verification</h3>
      <input type="text" id="verifyUserId" placeholder="User ID" />
      <button id="verifyBtn" onclick="handleVerification()">Verify Fingerprint</button>
    </div>
    
    <div>
      <h3>Identification</h3>
      <button id="identifyBtn" onclick="handleIdentification()">Identify User</button>
    </div>
  </div>

  <script src="fingerprint-api.js"></script>
  <script>
    // Initialize API
    const api = new FingerprintAPI('http://localhost:8080/api', 'your-api-key-here');
    
    // Simple in-memory database (replace with real database)
    const database = new Map();

    function setStatus(message, type = 'info') {
      const statusEl = document.getElementById('status');
      statusEl.textContent = message;
      statusEl.className = `status ${type}`;
    }

    function disableButtons(disabled) {
      document.getElementById('enrollBtn').disabled = disabled;
      document.getElementById('verifyBtn').disabled = disabled;
      document.getElementById('identifyBtn').disabled = disabled;
    }

    async function handleEnrollment() {
      const userId = document.getElementById('userId').value;
      const userName = document.getElementById('userName').value;

      if (!userId || !userName) {
        setStatus('Please enter User ID and Name', 'error');
        return;
      }

      try {
        disableButtons(true);
        setStatus('Starting enrollment... Please place your finger on the scanner', 'info');

        const result = await enrollWithRetry(userId, userName, 3);

        // Store in database
        database.set(userId, {
          userId,
          name: userName,
          template: result.template,
          quality: result.quality,
          enrolledAt: new Date().toISOString()
        });

        setStatus(`Enrollment successful! Quality: ${result.quality}`, 'success');
        
        // Clear inputs
        document.getElementById('userId').value = '';
        document.getElementById('userName').value = '';
      } catch (error) {
        setStatus(`Enrollment failed: ${error.message}`, 'error');
      } finally {
        disableButtons(false);
      }
    }

    async function handleVerification() {
      const userId = document.getElementById('verifyUserId').value;

      if (!userId) {
        setStatus('Please enter User ID', 'error');
        return;
      }

      const user = database.get(userId);
      if (!user) {
        setStatus('User not found in database', 'error');
        return;
      }

      try {
        disableButtons(true);
        setStatus('Please place your finger on the scanner', 'info');

        const result = await api.verifyFingerprint(user.template, userId);

        if (result.match && result.confidence >= 70) {
          setStatus(`Verification successful! Welcome ${user.name}. Confidence: ${result.confidence}%`, 'success');
        } else {
          setStatus('Verification failed. Fingerprint does not match.', 'error');
        }
      } catch (error) {
        setStatus(`Verification error: ${error.message}`, 'error');
      } finally {
        disableButtons(false);
      }
    }

    async function handleIdentification() {
      if (database.size === 0) {
        setStatus('No users enrolled in database', 'error');
        return;
      }

      try {
        disableButtons(true);
        setStatus('Please place your finger on the scanner', 'info');

        // Start scan
        const scan = await api.startScan();
        
        // Wait for completion
        const template = await waitForScanCompletion(scan.scanId);
        
        // Identify
        const result = await api.identifyFingerprint(template);

        if (result.match) {
          const user = database.get(result.userId);
          setStatus(`User identified: ${user.name}. Confidence: ${result.confidence}%`, 'success');
        } else {
          setStatus('User not found in database', 'error');
        }
      } catch (error) {
        setStatus(`Identification error: ${error.message}`, 'error');
      } finally {
        disableButtons(false);
      }
    }

    async function enrollWithRetry(userId, userName, maxAttempts) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          setStatus(`Enrollment attempt ${attempt}/${maxAttempts}. Place your finger on the scanner...`, 'info');
          
          const result = await api.enrollFingerprint(userId, null, { name: userName });

          if (result.quality >= 60) {
            return result;
          }

          if (attempt < maxAttempts) {
            setStatus(`Low quality (${result.quality}). Please try again...`, 'error');
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          if (attempt === maxAttempts) throw error;
          setStatus(`Error: ${error.message}. Retrying...`, 'error');
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      throw new Error('Failed to enroll after maximum attempts');
    }

    async function waitForScanCompletion(scanId, maxAttempts = 30) {
      for (let i = 0; i < maxAttempts; i++) {
        const status = await api.getScanStatus(scanId);
        
        if (status.status === 'complete') {
          return status.template;
        } else if (status.status === 'error') {
          throw new Error('Scan failed');
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      throw new Error('Scan timeout');
    }

    // Check device status on load
    window.addEventListener('load', async () => {
      try {
        const devices = await api.getDevices();
        if (devices.length > 0) {
          setStatus(`Ready. Device connected: ${devices[0].model}`, 'success');
        } else {
          setStatus('No fingerprint device detected', 'error');
        }
      } catch (error) {
        setStatus(`Error: ${error.message}`, 'error');
      }
    });
  </script>
</body>
</html>
```

## Best Practices

### 1. Quality Validation

Always validate fingerprint quality before accepting:

```javascript
function validateQuality(quality, operation) {
  const thresholds = {
    enrollment: 60,
    verification: 50
  };

  const threshold = thresholds[operation] || 50;

  if (quality < threshold) {
    console.warn(`Quality ${quality} below threshold ${threshold} for ${operation}`);
    return false;
  }

  return true;
}
```

### 2. User Feedback

Provide clear feedback during operations:

```javascript
function showProgress(message, progress = null) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  
  if (progress !== null) {
    statusEl.textContent += ` (${progress}%)`;
  }
}

// Usage
showProgress('Scanning fingerprint', 33);
showProgress('Processing template', 66);
showProgress('Enrollment complete', 100);
```

### 3. Secure API Key Storage

Never hardcode API keys in client-side code. Use environment variables or backend proxy:

```javascript
// Bad - API key exposed in client code
const api = new FingerprintAPI('http://localhost:8080/api', 'ak_live_abc123');

// Good - Fetch API key from backend
async function initializeAPI() {
  const response = await fetch('/api/get-fingerprint-key');
  const { apiKey } = await response.json();
  return new FingerprintAPI('http://localhost:8080/api', apiKey);
}
```

### 4. Caching Device Information

Cache device information to reduce API calls:

```javascript
class DeviceCache {
  constructor(api, ttl = 300000) { // 5 minutes default
    this.api = api;
    this.ttl = ttl;
    this.cache = null;
    this.timestamp = null;
  }

  async getDevices() {
    const now = Date.now();
    
    if (this.cache && this.timestamp && (now - this.timestamp < this.ttl)) {
      return this.cache;
    }

    this.cache = await this.api.getDevices();
    this.timestamp = now;
    return this.cache;
  }

  invalidate() {
    this.cache = null;
    this.timestamp = null;
  }
}

// Usage
const deviceCache = new DeviceCache(api);
const devices = await deviceCache.getDevices(); // Fetches from API
const devices2 = await deviceCache.getDevices(); // Returns cached result
```

## Troubleshooting

### Device Not Found

```javascript
async function ensureDeviceAvailable() {
  const devices = await api.getDevices();
  
  if (devices.length === 0) {
    throw new Error('No fingerprint device connected. Please connect a device and try again.');
  }
  
  return devices[0];
}
```

### CORS Issues

If you encounter CORS errors, configure the service to allow your origin:

```javascript
// The service must be configured to allow your domain
// Check CONFIGURATION.md for CORS setup
```

### Rate Limiting

Handle rate limits gracefully:

```javascript
async function handleRateLimit(fn, retryAfter = 60) {
  try {
    return await fn();
  } catch (error) {
    if (error.code === 4004) {
      console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return await fn();
    }
    throw error;
  }
}
```

## Next Steps

- [TypeScript Integration](./typescript.md) - Add type safety to your integration
- [React Integration](./react.md) - Use React hooks and components
- [API Reference](/docs/api-reference/rest-api) - Complete API documentation
- [Best Practices](/docs/guides/best-practices) - Security and optimization tips

## Support

For issues or questions:
- Check the [Troubleshooting Guide](/docs/troubleshooting)
- Review [API Documentation](/docs/api-reference/rest-api)
- See [Error Codes](/docs/api-reference/error-codes)
