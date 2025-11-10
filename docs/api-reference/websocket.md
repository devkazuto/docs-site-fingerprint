---
sidebar_position: 2
title: WebSocket API Reference
description: Real-time WebSocket API reference for the Fingerprint Service
---

# WebSocket API Reference

## Overview

The Fingerprint Service provides a WebSocket interface for real-time communication and event streaming. This is ideal for applications that need immediate notifications about device status changes, fingerprint detection, and scan completion.

**WebSocket URL:** `ws://localhost:8080` (default)

For secure connections: `wss://your-domain.com`

## Connection

### Establishing Connection

Connect to the WebSocket server using the standard WebSocket protocol:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('WebSocket connected');
  // Send authentication message
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

### Authentication

**You must authenticate immediately after connection** by sending an authentication message.

#### API Key Authentication

For standard API access:

```json
{
  "type": "auth",
  "apiKey": "your-api-key-here"
}
```

#### Admin Token Authentication

For admin access (includes all events):

```json
{
  "type": "auth",
  "token": "admin-jwt-token"
}
```

### Authentication Response

**Success:**
```json
{
  "type": "auth:success",
  "message": "Authentication successful",
  "permissions": ["device:read", "fingerprint:scan"]
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


---

## Client → Server Events

These are messages sent from the client to the server.

### Subscribe to Device Events

Subscribe to events from a specific device.

**Message:**
```json
{
  "type": "subscribe",
  "deviceId": "device-001"
}
```

**Parameters:**
- `type` (string, required) - Message type: "subscribe"
- `deviceId` (string, required) - Device identifier to subscribe to

**Response:**
```json
{
  "type": "subscribe:success",
  "deviceId": "device-001",
  "message": "Subscribed to device events"
}
```

**Error Response:**
```json
{
  "type": "subscribe:error",
  "deviceId": "device-001",
  "message": "Device not found",
  "code": 1001
}
```

---

### Unsubscribe from Device Events

Unsubscribe from events from a specific device.

**Message:**
```json
{
  "type": "unsubscribe",
  "deviceId": "device-001"
}
```

**Parameters:**
- `type` (string, required) - Message type: "unsubscribe"
- `deviceId` (string, required) - Device identifier to unsubscribe from

**Response:**
```json
{
  "type": "unsubscribe:success",
  "deviceId": "device-001",
  "message": "Unsubscribed from device events"
}
```

---

### Start Scan Session

Start a fingerprint scan session via WebSocket.

**Message:**
```json
{
  "type": "scan:start",
  "deviceId": "device-001",
  "options": {
    "timeout": 30000,
    "qualityThreshold": 60
  }
}
```

**Parameters:**
- `type` (string, required) - Message type: "scan:start"
- `deviceId` (string, required) - Device identifier
- `options` (object, optional) - Scan options
  - `timeout` (number, optional) - Scan timeout in milliseconds (default: 30000)
  - `qualityThreshold` (number, optional) - Minimum quality threshold (default: 50)

**Response:**
```json
{
  "type": "scan:started",
  "scanId": "scan-abc123",
  "deviceId": "device-001",
  "timestamp": "2025-11-05T14:30:00Z"
}
```

**Error Response:**
```json
{
  "type": "scan:error",
  "message": "Device is busy",
  "code": 1002,
  "timestamp": "2025-11-05T14:30:00Z"
}
```

---

### Stop Scan Session

Stop an active scan session.

**Message:**
```json
{
  "type": "scan:stop",
  "scanId": "scan-abc123"
}
```

**Parameters:**
- `type` (string, required) - Message type: "scan:stop"
- `scanId` (string, required) - Scan session identifier

**Response:**
```json
{
  "type": "scan:stopped",
  "scanId": "scan-abc123",
  "timestamp": "2025-11-05T14:30:05Z"
}
```

---

### Ping

Send a ping to keep the connection alive.

**Message:**
```json
{
  "type": "ping"
}
```

**Response:**
```json
{
  "type": "pong",
  "timestamp": "2025-11-05T14:30:00Z"
}
```


---

## Server → Client Events

These are messages sent from the server to the client.

### Device Connected

Sent when a fingerprint reader is connected.

**Message:**
```json
{
  "type": "device:connected",
  "device": {
    "id": "device-001",
    "serialNumber": "SLK20R-12345",
    "model": "ZKTeco SLK20R",
    "status": "connected",
    "firmwareVersion": "5.0.0.16"
  },
  "timestamp": "2025-11-05T14:30:00Z"
}
```

**Fields:**
- `type` (string) - Event type: "device:connected"
- `device` (object) - Device information
  - `id` (string) - Device identifier
  - `serialNumber` (string) - Device serial number
  - `model` (string) - Device model
  - `status` (string) - Device status
  - `firmwareVersion` (string) - Firmware version
- `timestamp` (string) - Event timestamp (ISO 8601)

---

### Device Disconnected

Sent when a fingerprint reader is disconnected.

**Message:**
```json
{
  "type": "device:disconnected",
  "deviceId": "device-001",
  "reason": "Device unplugged",
  "timestamp": "2025-11-05T14:35:00Z"
}
```

**Fields:**
- `type` (string) - Event type: "device:disconnected"
- `deviceId` (string) - Device identifier
- `reason` (string, optional) - Disconnection reason
- `timestamp` (string) - Event timestamp (ISO 8601)

---

### Device Status Changed

Sent when a device status changes (idle, busy, error).

**Message:**
```json
{
  "type": "device:status",
  "deviceId": "device-001",
  "status": "busy",
  "previousStatus": "idle",
  "timestamp": "2025-11-05T14:30:10Z"
}
```

**Fields:**
- `type` (string) - Event type: "device:status"
- `deviceId` (string) - Device identifier
- `status` (string) - New status (idle, busy, error)
- `previousStatus` (string) - Previous status
- `timestamp` (string) - Event timestamp (ISO 8601)

---

### Fingerprint Detected

Sent when a fingerprint is detected on the sensor.

**Message:**
```json
{
  "type": "fingerprint:detected",
  "deviceId": "device-001",
  "scanId": "scan-abc123",
  "quality": 85,
  "timestamp": "2025-11-05T14:30:15Z"
}
```

**Fields:**
- `type` (string) - Event type: "fingerprint:detected"
- `deviceId` (string) - Device identifier
- `scanId` (string) - Associated scan session ID
- `quality` (number) - Preliminary quality score (0-100)
- `timestamp` (string) - Event timestamp (ISO 8601)

---

### Scan Progress

Sent during multi-scan enrollment to indicate progress.

**Message:**
```json
{
  "type": "scan:progress",
  "scanId": "scan-abc123",
  "deviceId": "device-001",
  "scansCompleted": 2,
  "scansRequired": 3,
  "message": "Place finger again",
  "timestamp": "2025-11-05T14:30:18Z"
}
```

**Fields:**
- `type` (string) - Event type: "scan:progress"
- `scanId` (string) - Scan session identifier
- `deviceId` (string) - Device identifier
- `scansCompleted` (number) - Number of scans completed
- `scansRequired` (number) - Total scans required
- `message` (string) - Progress message
- `timestamp` (string) - Event timestamp (ISO 8601)

---

### Scan Complete

Sent when a scan session completes successfully.

**Message:**
```json
{
  "type": "scan:complete",
  "scanId": "scan-abc123",
  "deviceId": "device-001",
  "template": "base64-encoded-template-data...",
  "quality": 92,
  "scanTime": 1250,
  "timestamp": "2025-11-05T14:30:20Z"
}
```

**Fields:**
- `type` (string) - Event type: "scan:complete"
- `scanId` (string) - Scan session identifier
- `deviceId` (string) - Device identifier
- `template` (string) - Base64-encoded fingerprint template
- `quality` (number) - Final quality score (0-100)
- `scanTime` (number) - Total scan time in milliseconds
- `timestamp` (string) - Event timestamp (ISO 8601)

---

### Scan Error

Sent when a scan session fails.

**Message:**
```json
{
  "type": "scan:error",
  "scanId": "scan-abc123",
  "deviceId": "device-001",
  "error": "Low quality scan",
  "code": 2001,
  "retryable": true,
  "timestamp": "2025-11-05T14:30:25Z"
}
```

**Fields:**
- `type` (string) - Event type: "scan:error"
- `scanId` (string) - Scan session identifier
- `deviceId` (string) - Device identifier
- `error` (string) - Error message
- `code` (number) - Error code
- `retryable` (boolean) - Whether the operation can be retried
- `timestamp` (string) - Event timestamp (ISO 8601)

---

### Scan Timeout

Sent when a scan session times out.

**Message:**
```json
{
  "type": "scan:timeout",
  "scanId": "scan-abc123",
  "deviceId": "device-001",
  "message": "Scan timeout - no fingerprint detected",
  "timestamp": "2025-11-05T14:31:00Z"
}
```

**Fields:**
- `type` (string) - Event type: "scan:timeout"
- `scanId` (string) - Scan session identifier
- `deviceId` (string) - Device identifier
- `message` (string) - Timeout message
- `timestamp` (string) - Event timestamp (ISO 8601)


---

### Service Status Change

Sent when the service status changes.

**Message:**
```json
{
  "type": "service:status",
  "status": "running",
  "uptime": 86400,
  "version": "1.0.0",
  "timestamp": "2025-11-05T14:30:00Z"
}
```

**Fields:**
- `type` (string) - Event type: "service:status"
- `status` (string) - Service status (starting, running, stopping, stopped)
- `uptime` (number) - Service uptime in seconds
- `version` (string) - Service version
- `timestamp` (string) - Event timestamp (ISO 8601)

---

### Log Entry (Admin Only)

Sent to admin connections for real-time log streaming.

**Message:**
```json
{
  "type": "log:entry",
  "level": "info",
  "message": "Device connected successfully",
  "metadata": {
    "deviceId": "device-001",
    "serialNumber": "SLK20R-12345"
  },
  "timestamp": "2025-11-05T14:30:00Z"
}
```

**Fields:**
- `type` (string) - Event type: "log:entry"
- `level` (string) - Log level (error, warn, info, debug)
- `message` (string) - Log message
- `metadata` (object, optional) - Additional log context
- `timestamp` (string) - Event timestamp (ISO 8601)

---

### Error Event

Sent when a general error occurs.

**Message:**
```json
{
  "type": "error",
  "error": "Internal server error",
  "code": 5001,
  "details": {
    "operation": "device:connect"
  },
  "timestamp": "2025-11-05T14:30:00Z"
}
```

**Fields:**
- `type` (string) - Event type: "error"
- `error` (string) - Error message
- `code` (number) - Error code
- `details` (object, optional) - Additional error context
- `timestamp` (string) - Event timestamp (ISO 8601)


---

## Connection Management

### Heartbeat / Keep-Alive

The server sends periodic ping messages to keep the connection alive. Clients should respond with a pong message.

**Server Ping:**
```json
{
  "type": "ping",
  "timestamp": "2025-11-05T14:30:00Z"
}
```

**Client Pong:**
```json
{
  "type": "pong",
  "timestamp": "2025-11-05T14:30:00Z"
}
```

**Interval:** Server sends ping every 30 seconds

**Timeout:** Connection closed if no pong received within 60 seconds

---

### Reconnection Strategy

Implement exponential backoff for reconnection attempts:

```javascript
class WebSocketClient {
  constructor(url, apiKey) {
    this.url = url;
    this.apiKey = apiKey;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      
      // Authenticate
      this.send({ type: 'auth', apiKey: this.apiKey });
    };

    this.ws.onclose = () => {
      console.log('Disconnected');
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  handleMessage(data) {
    // Handle incoming messages
    switch (data.type) {
      case 'ping':
        this.send({ type: 'pong' });
        break;
      // Handle other message types
    }
  }

  close() {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    this.ws.close();
  }
}
```

---

### Connection States

The WebSocket connection can be in one of these states:

- **CONNECTING (0)** - Connection is being established
- **OPEN (1)** - Connection is open and ready to communicate
- **CLOSING (2)** - Connection is in the process of closing
- **CLOSED (3)** - Connection is closed

Check connection state before sending messages:

```javascript
if (ws.readyState === WebSocket.OPEN) {
  ws.send(JSON.stringify(message));
} else {
  console.warn('WebSocket is not open. State:', ws.readyState);
}
```


---

## Complete Examples

### Basic WebSocket Client

```javascript
class FingerprintWebSocket {
  constructor(url, apiKey) {
    this.url = url;
    this.apiKey = apiKey;
    this.ws = null;
    this.authenticated = false;
    this.eventHandlers = new Map();
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.authenticate();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.authenticated = false;
      // Implement reconnection logic here
    };
  }

  authenticate() {
    this.send({
      type: 'auth',
      apiKey: this.apiKey
    });
  }

  handleMessage(data) {
    console.log('Received:', data);

    // Handle authentication response
    if (data.type === 'auth:success') {
      this.authenticated = true;
      console.log('Authentication successful');
      this.emit('authenticated');
      return;
    }

    if (data.type === 'auth:error') {
      console.error('Authentication failed:', data.message);
      this.emit('auth-error', data);
      return;
    }

    // Handle ping/pong
    if (data.type === 'ping') {
      this.send({ type: 'pong' });
      return;
    }

    // Emit event to registered handlers
    this.emit(data.type, data);
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not open');
    }
  }

  // Event handler registration
  on(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  emit(eventType, data) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Device subscription
  subscribe(deviceId) {
    this.send({
      type: 'subscribe',
      deviceId: deviceId
    });
  }

  unsubscribe(deviceId) {
    this.send({
      type: 'unsubscribe',
      deviceId: deviceId
    });
  }

  // Scan operations
  startScan(deviceId, options = {}) {
    this.send({
      type: 'scan:start',
      deviceId: deviceId,
      options: options
    });
  }

  stopScan(scanId) {
    this.send({
      type: 'scan:stop',
      scanId: scanId
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Usage
const ws = new FingerprintWebSocket('ws://localhost:8080', 'your-api-key');

// Wait for authentication
ws.on('authenticated', () => {
  console.log('Ready to use WebSocket');
  
  // Subscribe to device events
  ws.subscribe('device-001');
  
  // Start a scan
  ws.startScan('device-001');
});

// Handle device events
ws.on('device:connected', (data) => {
  console.log('Device connected:', data.device);
});

ws.on('device:disconnected', (data) => {
  console.log('Device disconnected:', data.deviceId);
});

// Handle scan events
ws.on('fingerprint:detected', (data) => {
  console.log('Fingerprint detected, quality:', data.quality);
});

ws.on('scan:complete', (data) => {
  console.log('Scan complete!');
  console.log('Template:', data.template);
  console.log('Quality:', data.quality);
  
  // Process the template
  processFingerprint(data.template);
});

ws.on('scan:error', (data) => {
  console.error('Scan error:', data.error);
  if (data.retryable) {
    console.log('Retrying scan...');
    ws.startScan(data.deviceId);
  }
});
```

---

### React Hook Example

```typescript
import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useFingerprint(url: string, apiKey: string) {
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Authenticate
      ws.send(JSON.stringify({ type: 'auth', apiKey }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastMessage(data);

      if (data.type === 'auth:success') {
        setAuthenticated(true);
      }

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setAuthenticated(false);
    };

    return () => {
      ws.close();
    };
  }, [url, apiKey]);

  const send = (message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const subscribe = (deviceId: string) => {
    send({ type: 'subscribe', deviceId });
  };

  const startScan = (deviceId: string) => {
    send({ type: 'scan:start', deviceId });
  };

  return {
    connected,
    authenticated,
    lastMessage,
    subscribe,
    startScan,
    send
  };
}

// Usage in component
function FingerprintScanner() {
  const { connected, authenticated, lastMessage, subscribe, startScan } = 
    useFingerprint('ws://localhost:8080', 'your-api-key');

  useEffect(() => {
    if (authenticated) {
      subscribe('device-001');
    }
  }, [authenticated]);

  useEffect(() => {
    if (lastMessage?.type === 'scan:complete') {
      console.log('Scan complete:', lastMessage.template);
    }
  }, [lastMessage]);

  return (
    <div>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
      <p>Auth: {authenticated ? 'Authenticated' : 'Not authenticated'}</p>
      <button 
        onClick={() => startScan('device-001')}
        disabled={!authenticated}
      >
        Start Scan
      </button>
    </div>
  );
}
```


---

### Python Example

```python
import asyncio
import websockets
import json

class FingerprintWebSocket:
    def __init__(self, url: str, api_key: str):
        self.url = url
        self.api_key = api_key
        self.ws = None
        self.authenticated = False
        self.event_handlers = {}

    async def connect(self):
        """Connect to WebSocket server and authenticate."""
        self.ws = await websockets.connect(self.url)
        print("WebSocket connected")
        
        # Authenticate
        await self.send({'type': 'auth', 'apiKey': self.api_key})
        
        # Start message handler
        asyncio.create_task(self.message_handler())

    async def message_handler(self):
        """Handle incoming messages."""
        async for message in self.ws:
            data = json.loads(message)
            await self.handle_message(data)

    async def handle_message(self, data: dict):
        """Process incoming message."""
        print(f"Received: {data['type']}")
        
        if data['type'] == 'auth:success':
            self.authenticated = True
            print("Authentication successful")
            await self.emit('authenticated', data)
        elif data['type'] == 'ping':
            await self.send({'type': 'pong'})
        else:
            await self.emit(data['type'], data)

    async def send(self, data: dict):
        """Send message to server."""
        if self.ws:
            await self.ws.send(json.dumps(data))

    def on(self, event_type: str, handler):
        """Register event handler."""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)

    async def emit(self, event_type: str, data: dict):
        """Emit event to registered handlers."""
        if event_type in self.event_handlers:
            for handler in self.event_handlers[event_type]:
                await handler(data)

    async def subscribe(self, device_id: str):
        """Subscribe to device events."""
        await self.send({'type': 'subscribe', 'deviceId': device_id})

    async def start_scan(self, device_id: str):
        """Start fingerprint scan."""
        await self.send({'type': 'scan:start', 'deviceId': device_id})

    async def close(self):
        """Close WebSocket connection."""
        if self.ws:
            await self.ws.close()

# Usage
async def main():
    ws = FingerprintWebSocket('ws://localhost:8080', 'your-api-key')
    
    # Register event handlers
    async def on_authenticated(data):
        print("Ready to use WebSocket")
        await ws.subscribe('device-001')
        await ws.start_scan('device-001')
    
    async def on_scan_complete(data):
        print(f"Scan complete! Quality: {data['quality']}")
        print(f"Template: {data['template'][:50]}...")
    
    async def on_scan_error(data):
        print(f"Scan error: {data['error']}")
    
    ws.on('authenticated', on_authenticated)
    ws.on('scan:complete', on_scan_complete)
    ws.on('scan:error', on_scan_error)
    
    # Connect
    await ws.connect()
    
    # Keep running
    try:
        await asyncio.Future()  # Run forever
    except KeyboardInterrupt:
        await ws.close()

if __name__ == '__main__':
    asyncio.run(main())
```

---

## Best Practices

### 1. Always Authenticate Immediately

Send authentication message as soon as the connection opens:

```javascript
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    apiKey: 'your-api-key'
  }));
};
```

### 2. Implement Reconnection Logic

Handle disconnections gracefully with exponential backoff:

```javascript
function reconnect() {
  const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
  setTimeout(() => connect(), delay);
  attempts++;
}
```

### 3. Handle Ping/Pong

Respond to server pings to keep connection alive:

```javascript
if (data.type === 'ping') {
  ws.send(JSON.stringify({ type: 'pong' }));
}
```

### 4. Subscribe to Specific Devices

Only subscribe to devices you need to reduce message traffic:

```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  deviceId: 'device-001'
}));
```

### 5. Clean Up on Disconnect

Unsubscribe and clean up resources when disconnecting:

```javascript
ws.onclose = () => {
  // Clear any pending operations
  // Reset state
  // Attempt reconnection if needed
};
```

### 6. Handle Errors Gracefully

Always handle error events:

```javascript
ws.on('scan:error', (data) => {
  if (data.retryable) {
    // Retry the operation
  } else {
    // Show error to user
  }
});
```

### 7. Use Message Queuing

Queue messages when connection is not ready:

```javascript
const messageQueue = [];

function send(message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    messageQueue.push(message);
  }
}

ws.onopen = () => {
  // Send queued messages
  while (messageQueue.length > 0) {
    send(messageQueue.shift());
  }
};
```

---

## Troubleshooting

### Connection Fails Immediately

**Problem:** WebSocket connection closes immediately after opening.

**Solutions:**
- Verify the WebSocket URL is correct
- Check if the service is running
- Ensure firewall allows WebSocket connections
- Check for CORS issues in browser console

### Authentication Fails

**Problem:** Receiving `auth:error` message.

**Solutions:**
- Verify API key is correct and not revoked
- Check API key format (should start with `ak_live_` or `ak_test_`)
- Ensure API key is sent immediately after connection

### Not Receiving Events

**Problem:** Not receiving device or scan events.

**Solutions:**
- Verify you've subscribed to the device
- Check authentication was successful
- Ensure device is connected
- Check message handler is properly registered

### Connection Drops Frequently

**Problem:** WebSocket connection drops and reconnects often.

**Solutions:**
- Implement proper ping/pong handling
- Check network stability
- Increase timeout values
- Implement exponential backoff for reconnection

### Messages Not Sending

**Problem:** Messages sent but not received by server.

**Solutions:**
- Check WebSocket state before sending
- Verify message format is valid JSON
- Ensure authentication completed before sending
- Check for rate limiting

---

## Security Considerations

### 1. Use Secure WebSocket (WSS) in Production

Always use `wss://` protocol in production:

```javascript
const ws = new WebSocket('wss://your-domain.com');
```

### 2. Never Expose API Keys in Client Code

Use environment variables or backend proxy:

```javascript
// Bad
const apiKey = 'ak_live_abc123...';

// Good
const apiKey = process.env.REACT_APP_API_KEY;
```

### 3. Validate All Incoming Messages

Always validate message structure:

```javascript
function isValidMessage(data) {
  return data && typeof data === 'object' && typeof data.type === 'string';
}
```

### 4. Implement Rate Limiting

Limit message sending rate to prevent abuse:

```javascript
const rateLimiter = {
  tokens: 10,
  maxTokens: 10,
  refillRate: 1, // per second
  
  canSend() {
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }
};
```

---

## Next Steps

- [REST API Reference](./rest-api.md) - HTTP endpoint documentation
- [Error Codes Reference](./error-codes.md) - Complete error code list
- [Integration Guides](/docs/integration/javascript-vanilla) - Framework-specific examples
- [Best Practices Guide](/docs/guides/best-practices) - Advanced patterns and techniques
