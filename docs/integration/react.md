---
sidebar_position: 3
title: React Integration
description: Complete guide for integrating the Fingerprint Service with React
---

# React Integration

Learn how to integrate the Fingerprint Background Service into your React applications using custom hooks and components.

## Prerequisites

- React 18+
- Node.js 16+
- Fingerprint Background Service running (default: `http://localhost:8080`)
- Valid API key

## Installation

```bash
npm install react react-dom
# or
yarn add react react-dom
```

## Custom Hooks

### useFingerprintAPI Hook

Create a hook to manage the API client:

```typescript
// hooks/useFingerprintAPI.ts
import { useMemo } from 'react';
import { FingerprintAPI } from '../lib/fingerprint-api';

export function useFingerprintAPI(baseURL: string, apiKey: string) {
  return useMemo(
    () => new FingerprintAPI({ baseURL, apiKey }),
    [baseURL, apiKey]
  );
}
```

### useFingerprintEnroll Hook

Create a hook for enrollment operations:

```typescript
// hooks/useFingerprintEnroll.ts
import { useState, useCallback } from 'react';
import type { FingerprintAPI } from '../lib/fingerprint-api';
import type { EnrollmentResult } from '../types/fingerprint';

interface EnrollState {
  isEnrolling: boolean;
  result: EnrollmentResult | null;
  error: Error | null;
  progress: number;
}

export function useFingerprintEnroll(api: FingerprintAPI) {
  const [state, setState] = useState<EnrollState>({
    isEnrolling: false,
    result: null,
    error: null,
    progress: 0,
  });

  const enroll = useCallback(
    async (userId: string, metadata?: Record<string, any>) => {
      setState({
        isEnrolling: true,
        result: null,
        error: null,
        progress: 0,
      });

      try {
        setState((prev) => ({ ...prev, progress: 33 }));
        
        const result = await api.enrollFingerprint({
          userId,
          metadata,
        });

        setState((prev) => ({ ...prev, progress: 100 }));

        setState({
          isEnrolling: false,
          result,
          error: null,
          progress: 100,
        });

        return result;
      } catch (error) {
        setState({
          isEnrolling: false,
          result: null,
          error: error as Error,
          progress: 0,
        });
        throw error;
      }
    },
    [api]
  );

  const reset = useCallback(() => {
    setState({
      isEnrolling: false,
      result: null,
      error: null,
      progress: 0,
    });
  }, []);

  return { ...state, enroll, reset };
}
```

### useFingerprintVerify Hook

Create a hook for verification operations:

```typescript
// hooks/useFingerprintVerify.ts
import { useState, useCallback } from 'react';
import type { FingerprintAPI } from '../lib/fingerprint-api';
import type { VerificationResult } from '../types/fingerprint';

interface VerifyState {
  isVerifying: boolean;
  result: VerificationResult | null;
  error: Error | null;
}

export function useFingerprintVerify(api: FingerprintAPI) {
  const [state, setState] = useState<VerifyState>({
    isVerifying: false,
    result: null,
    error: null,
  });

  const verify = useCallback(
    async (userId: string, template: string) => {
      setState({
        isVerifying: true,
        result: null,
        error: null,
      });

      try {
        const result = await api.verifyFingerprint({
          userId,
          template,
        });

        setState({
          isVerifying: false,
          result,
          error: null,
        });

        return result;
      } catch (error) {
        setState({
          isVerifying: false,
          result: null,
          error: error as Error,
        });
        throw error;
      }
    },
    [api]
  );

  const reset = useCallback(() => {
    setState({
      isVerifying: false,
      result: null,
      error: null,
    });
  }, []);

  return { ...state, verify, reset };
}
```

### useFingerprintIdentify Hook

Create a hook for identification operations:

```typescript
// hooks/useFingerprintIdentify.ts
import { useState, useCallback } from 'react';
import type { FingerprintAPI } from '../lib/fingerprint-api';
import type { IdentificationResult } from '../types/fingerprint';

interface IdentifyState {
  isIdentifying: boolean;
  result: IdentificationResult | null;
  error: Error | null;
}

export function useFingerprintIdentify(api: FingerprintAPI) {
  const [state, setState] = useState<IdentifyState>({
    isIdentifying: false,
    result: null,
    error: null,
  });

  const identify = useCallback(
    async (template: string) => {
      setState({
        isIdentifying: true,
        result: null,
        error: null,
      });

      try {
        const result = await api.identifyFingerprint({ template });

        setState({
          isIdentifying: false,
          result,
          error: null,
        });

        return result;
      } catch (error) {
        setState({
          isIdentifying: false,
          result: null,
          error: error as Error,
        });
        throw error;
      }
    },
    [api]
  );

  const reset = useCallback(() => {
    setState({
      isIdentifying: false,
      result: null,
      error: null,
    });
  }, []);

  return { ...state, identify, reset };
}
```

### useDevices Hook

Create a hook to manage device state:

```typescript
// hooks/useDevices.ts
import { useState, useEffect, useCallback } from 'react';
import type { FingerprintAPI } from '../lib/fingerprint-api';
import type { Device } from '../types/fingerprint';

export function useDevices(api: FingerprintAPI) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getDevices();
      setDevices(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return { devices, loading, error, refetch: fetchDevices };
}
```

## React Components

### FingerprintEnrollment Component

Create a component for enrollment UI:

```typescript
// components/FingerprintEnrollment.tsx
import React, { useState } from 'react';
import { useFingerprintEnroll } from '../hooks/useFingerprintEnroll';
import type { FingerprintAPI } from '../lib/fingerprint-api';

interface Props {
  api: FingerprintAPI;
  onSuccess?: (template: string, quality: number) => void;
  onError?: (error: Error) => void;
}

export function FingerprintEnrollment({ api, onSuccess, onError }: Props) {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const { isEnrolling, result, error, progress, enroll, reset } =
    useFingerprintEnroll(api);

  const handleEnroll = async () => {
    if (!userId || !userName) {
      alert('Please enter User ID and Name');
      return;
    }

    try {
      const enrollResult = await enroll(userId, { name: userName });
      onSuccess?.(enrollResult.template, enrollResult.quality);
    } catch (err) {
      onError?.(err as Error);
    }
  };

  const handleReset = () => {
    reset();
    setUserId('');
    setUserName('');
  };

  return (
    <div className="fingerprint-enrollment">
      <h2>Fingerprint Enrollment</h2>

      {!result && (
        <div className="form">
          <input
            type="text"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isEnrolling}
          />
          <input
            type="text"
            placeholder="User Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            disabled={isEnrolling}
          />
          <button onClick={handleEnroll} disabled={isEnrolling}>
            {isEnrolling ? 'Enrolling...' : 'Enroll Fingerprint'}
          </button>
        </div>
      )}

      {isEnrolling && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <p>Please place your finger on the scanner...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>Error: {error.message}</p>
          <button onClick={reset}>Try Again</button>
        </div>
      )}

      {result && (
        <div className="success">
          <p>✓ Enrollment successful!</p>
          <p>Quality: {result.quality}</p>
          <p>Scans completed: {result.scansCompleted}</p>
          <button onClick={handleReset}>Enroll Another</button>
        </div>
      )}
    </div>
  );
}
```

### FingerprintVerification Component

Create a component for verification UI:

```typescript
// components/FingerprintVerification.tsx
import React, { useState } from 'react';
import { useFingerprintVerify } from '../hooks/useFingerprintVerify';
import type { FingerprintAPI } from '../lib/fingerprint-api';

interface Props {
  api: FingerprintAPI;
  userId: string;
  template: string;
  onSuccess?: (confidence: number) => void;
  onFailure?: () => void;
}

export function FingerprintVerification({
  api,
  userId,
  template,
  onSuccess,
  onFailure,
}: Props) {
  const { isVerifying, result, error, verify, reset } =
    useFingerprintVerify(api);

  const handleVerify = async () => {
    try {
      const verifyResult = await verify(userId, template);
      
      if (verifyResult.match && verifyResult.confidence >= 70) {
        onSuccess?.(verifyResult.confidence);
      } else {
        onFailure?.();
      }
    } catch (err) {
      onFailure?.();
    }
  };

  return (
    <div className="fingerprint-verification">
      <h2>Fingerprint Verification</h2>

      {!result && !error && (
        <button onClick={handleVerify} disabled={isVerifying}>
          {isVerifying ? 'Verifying...' : 'Verify Fingerprint'}
        </button>
      )}

      {isVerifying && (
        <div className="status">
          <p>Please place your finger on the scanner...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>Verification failed: {error.message}</p>
          <button onClick={reset}>Try Again</button>
        </div>
      )}

      {result && (
        <div className={result.match ? 'success' : 'failure'}>
          {result.match ? (
            <>
              <p>✓ Verification successful!</p>
              <p>Confidence: {result.confidence}%</p>
            </>
          ) : (
            <>
              <p>✗ Verification failed</p>
              <p>Fingerprint does not match</p>
            </>
          )}
          <button onClick={reset}>Verify Again</button>
        </div>
      )}
    </div>
  );
}
```

### DeviceStatus Component

Create a component to display device status:

```typescript
// components/DeviceStatus.tsx
import React from 'react';
import { useDevices } from '../hooks/useDevices';
import type { FingerprintAPI } from '../lib/fingerprint-api';

interface Props {
  api: FingerprintAPI;
}

export function DeviceStatus({ api }: Props) {
  const { devices, loading, error, refetch } = useDevices(api);

  if (loading) {
    return <div className="device-status loading">Loading devices...</div>;
  }

  if (error) {
    return (
      <div className="device-status error">
        <p>Error: {error.message}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="device-status no-devices">
        <p>No fingerprint devices detected</p>
        <button onClick={refetch}>Refresh</button>
      </div>
    );
  }

  return (
    <div className="device-status">
      <h3>Connected Devices</h3>
      {devices.map((device) => (
        <div key={device.id} className="device-item">
          <span className={`status-indicator ${device.status}`} />
          <div className="device-info">
            <p className="device-model">{device.model}</p>
            <p className="device-serial">{device.serialNumber}</p>
            <p className="device-status-text">{device.status}</p>
          </div>
        </div>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

## WebSocket Integration with useEffect

Create a hook for WebSocket connection:

```typescript
// hooks/useFingerprintWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Device, ScanStatus } from '../types/fingerprint';

interface WebSocketEvents {
  onDeviceConnected?: (device: Device) => void;
  onDeviceDisconnected?: (deviceId: string) => void;
  onFingerprintDetected?: (data: { quality: number }) => void;
  onScanComplete?: (data: ScanStatus) => void;
  onScanError?: (data: { error: string }) => void;
}

export function useFingerprintWebSocket(
  url: string,
  apiKey: string,
  events: WebSocketEvents = {}
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);

        // Authenticate
        ws.send(JSON.stringify({ type: 'auth', apiKey }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'device:connected':
              events.onDeviceConnected?.(data.device);
              break;
            case 'device:disconnected':
              events.onDeviceDisconnected?.(data.deviceId);
              break;
            case 'fingerprint:detected':
              events.onFingerprintDetected?.(data);
              break;
            case 'scan:complete':
              events.onScanComplete?.(data);
              break;
            case 'scan:error':
              events.onScanError?.(data);
              break;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };
    } catch (err) {
      setError(err as Error);
    }
  }, [url, apiKey, events]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { isConnected, error, send, disconnect };
}
```

### Using WebSocket Hook in Component

```typescript
// components/LiveFingerprintScanner.tsx
import React, { useState } from 'react';
import { useFingerprintWebSocket } from '../hooks/useFingerprintWebSocket';

interface Props {
  wsUrl: string;
  apiKey: string;
  deviceId: string;
}

export function LiveFingerprintScanner({ wsUrl, apiKey, deviceId }: Props) {
  const [scanStatus, setScanStatus] = useState<string>('idle');
  const [quality, setQuality] = useState<number>(0);
  const [template, setTemplate] = useState<string>('');

  const { isConnected, send } = useFingerprintWebSocket(wsUrl, apiKey, {
    onDeviceConnected: (device) => {
      console.log('Device connected:', device);
    },
    onFingerprintDetected: (data) => {
      setScanStatus('scanning');
      setQuality(data.quality);
    },
    onScanComplete: (data) => {
      setScanStatus('complete');
      setTemplate(data.template || '');
      setQuality(data.quality || 0);
    },
    onScanError: (data) => {
      setScanStatus('error');
      console.error('Scan error:', data.error);
    },
  });

  const startScan = () => {
    setScanStatus('waiting');
    setQuality(0);
    setTemplate('');
    send({ type: 'scan:start', deviceId });
  };

  return (
    <div className="live-scanner">
      <h2>Live Fingerprint Scanner</h2>

      <div className="connection-status">
        {isConnected ? (
          <span className="connected">● Connected</span>
        ) : (
          <span className="disconnected">● Disconnected</span>
        )}
      </div>

      <button onClick={startScan} disabled={!isConnected}>
        Start Scan
      </button>

      <div className="scan-status">
        <p>Status: {scanStatus}</p>
        {quality > 0 && <p>Quality: {quality}</p>}
      </div>

      {template && (
        <div className="scan-result">
          <p>✓ Scan complete!</p>
          <p>Template captured</p>
        </div>
      )}
    </div>
  );
}
```

## State Management Patterns

### Context API for Global State

```typescript
// context/FingerprintContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FingerprintAPI } from '../lib/fingerprint-api';

interface FingerprintContextValue {
  api: FingerprintAPI;
  currentUser: string | null;
  setCurrentUser: (userId: string | null) => void;
}

const FingerprintContext = createContext<FingerprintContextValue | null>(null);

interface Props {
  children: ReactNode;
  baseURL: string;
  apiKey: string;
}

export function FingerprintProvider({ children, baseURL, apiKey }: Props) {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const api = new FingerprintAPI({ baseURL, apiKey });

  return (
    <FingerprintContext.Provider value={{ api, currentUser, setCurrentUser }}>
      {children}
    </FingerprintContext.Provider>
  );
}

export function useFingerprint() {
  const context = useContext(FingerprintContext);
  if (!context) {
    throw new Error('useFingerprint must be used within FingerprintProvider');
  }
  return context;
}
```

### Using Context in Components

```typescript
// App.tsx
import React from 'react';
import { FingerprintProvider } from './context/FingerprintContext';
import { FingerprintEnrollment } from './components/FingerprintEnrollment';
import { DeviceStatus } from './components/DeviceStatus';

export function App() {
  return (
    <FingerprintProvider
      baseURL="http://localhost:8080/api"
      apiKey="your-api-key-here"
    >
      <div className="app">
        <h1>Fingerprint Authentication</h1>
        <DeviceStatus />
        <FingerprintEnrollment />
      </div>
    </FingerprintProvider>
  );
}

// Component using context
function EnrollmentPage() {
  const { api, setCurrentUser } = useFingerprint();

  const handleSuccess = (template: string, quality: number) => {
    console.log('Enrolled successfully');
    // Store template in your database
  };

  return <FingerprintEnrollment api={api} onSuccess={handleSuccess} />;
}
```

## Complete Example: Login Application

```typescript
// App.tsx
import React, { useState } from 'react';
import { useFingerprintAPI } from './hooks/useFingerprintAPI';
import { useFingerprintEnroll } from './hooks/useFingerprintEnroll';
import { useFingerprintVerify } from './hooks/useFingerprintVerify';
import { DeviceStatus } from './components/DeviceStatus';

interface User {
  id: string;
  name: string;
  template?: string;
}

export function App() {
  const api = useFingerprintAPI('http://localhost:8080/api', 'your-api-key');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mode, setMode] = useState<'enroll' | 'verify'>('enroll');

  const {
    isEnrolling,
    result: enrollResult,
    error: enrollError,
    enroll,
    reset: resetEnroll,
  } = useFingerprintEnroll(api);

  const {
    isVerifying,
    result: verifyResult,
    error: verifyError,
    verify,
    reset: resetVerify,
  } = useFingerprintVerify(api);

  const handleEnroll = async (userId: string, userName: string) => {
    try {
      const result = await enroll(userId, { name: userName });
      
      // Add user to list
      setUsers((prev) => [
        ...prev,
        { id: userId, name: userName, template: result.template },
      ]);

      alert(`Enrollment successful! Quality: ${result.quality}`);
      resetEnroll();
    } catch (error) {
      alert(`Enrollment failed: ${(error as Error).message}`);
    }
  };

  const handleVerify = async (user: User) => {
    if (!user.template) {
      alert('User has no fingerprint enrolled');
      return;
    }

    try {
      const result = await verify(user.id, user.template);

      if (result.match && result.confidence >= 70) {
        alert(`Welcome back, ${user.name}! Confidence: ${result.confidence}%`);
      } else {
        alert('Verification failed');
      }

      resetVerify();
    } catch (error) {
      alert(`Verification failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="app">
      <h1>Fingerprint Login System</h1>

      <DeviceStatus api={api} />

      <div className="mode-selector">
        <button
          onClick={() => setMode('enroll')}
          className={mode === 'enroll' ? 'active' : ''}
        >
          Enroll
        </button>
        <button
          onClick={() => setMode('verify')}
          className={mode === 'verify' ? 'active' : ''}
        >
          Verify
        </button>
      </div>

      {mode === 'enroll' && (
        <EnrollmentForm
          onEnroll={handleEnroll}
          isEnrolling={isEnrolling}
          error={enrollError}
        />
      )}

      {mode === 'verify' && (
        <VerificationForm
          users={users}
          onVerify={handleVerify}
          isVerifying={isVerifying}
          error={verifyError}
        />
      )}

      <UserList users={users} />
    </div>
  );
}

function EnrollmentForm({
  onEnroll,
  isEnrolling,
  error,
}: {
  onEnroll: (userId: string, userName: string) => void;
  isEnrolling: boolean;
  error: Error | null;
}) {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId && userName) {
      onEnroll(userId, userName);
      setUserId('');
      setUserName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="enrollment-form">
      <h2>Enroll New User</h2>
      <input
        type="text"
        placeholder="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        disabled={isEnrolling}
      />
      <input
        type="text"
        placeholder="User Name"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        disabled={isEnrolling}
      />
      <button type="submit" disabled={isEnrolling}>
        {isEnrolling ? 'Enrolling...' : 'Enroll Fingerprint'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </form>
  );
}

function VerificationForm({
  users,
  onVerify,
  isVerifying,
  error,
}: {
  users: User[];
  onVerify: (user: User) => void;
  isVerifying: boolean;
  error: Error | null;
}) {
  const [selectedUserId, setSelectedUserId] = useState('');

  const handleVerify = () => {
    const user = users.find((u) => u.id === selectedUserId);
    if (user) {
      onVerify(user);
    }
  };

  return (
    <div className="verification-form">
      <h2>Verify User</h2>
      <select
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(e.target.value)}
        disabled={isVerifying}
      >
        <option value="">Select a user</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      <button onClick={handleVerify} disabled={isVerifying || !selectedUserId}>
        {isVerifying ? 'Verifying...' : 'Verify Fingerprint'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </div>
  );
}

function UserList({ users }: { users: User[] }) {
  return (
    <div className="user-list">
      <h2>Enrolled Users</h2>
      {users.length === 0 ? (
        <p>No users enrolled yet</p>
      ) : (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.name} ({user.id})
              {user.template && <span className="enrolled">✓ Enrolled</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Memoize API Client

```typescript
const api = useMemo(
  () => new FingerprintAPI({ baseURL, apiKey }),
  [baseURL, apiKey]
);
```

### 2. Handle Cleanup in useEffect

```typescript
useEffect(() => {
  const controller = new AbortController();

  async function fetchData() {
    try {
      const data = await api.getDevices();
      setDevices(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError(error);
      }
    }
  }

  fetchData();

  return () => {
    controller.abort();
  };
}, [api]);
```

### 3. Use Error Boundaries

```typescript
// ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <FingerprintEnrollment api={api} />
</ErrorBoundary>
```

### 4. Debounce Frequent Operations

```typescript
import { useCallback, useRef } from 'react';

function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

// Usage
const debouncedSearch = useDebounce((query: string) => {
  // Search logic
}, 300);
```

## Styling Components

### CSS Example

```css
/* fingerprint.css */
.fingerprint-enrollment {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form button {
  width: 100%;
  padding: 12px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.form button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.progress {
  margin: 20px 0;
}

.progress-bar {
  height: 4px;
  background: #2196f3;
  transition: width 0.3s ease;
}

.error {
  padding: 15px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  margin: 10px 0;
}

.success {
  padding: 15px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  margin: 10px 0;
}

.device-status {
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
  margin: 10px 0;
}

.device-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin: 5px 0;
  background: white;
  border-radius: 4px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 10px;
}

.status-indicator.connected {
  background: #4caf50;
}

.status-indicator.disconnected {
  background: #f44336;
}
```

## Next Steps

- [Angular Integration](./angular.md) - Use Angular services and RxJS
- [Vue Integration](./vue.md) - Use Vue 3 composables
- [API Reference](/docs/api-reference/rest-api) - Complete API documentation
- [Best Practices](/docs/guides/best-practices) - Advanced patterns

## Support

For issues or questions:
- Check the [Troubleshooting Guide](/docs/troubleshooting)
- Review [API Documentation](/docs/api-reference/rest-api)
- See [Error Codes](/docs/api-reference/error-codes)
