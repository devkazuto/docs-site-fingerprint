---
sidebar_position: 2
title: TypeScript Integration
description: Type-safe integration guide for the Fingerprint Service with TypeScript
---

# TypeScript Integration

Learn how to integrate the Fingerprint Background Service into your TypeScript applications with full type safety.

## Prerequisites

- Node.js 16+ or modern browser with TypeScript support
- TypeScript 4.5+
- Fingerprint Background Service running (default: `http://localhost:8080`)
- Valid API key

## Installation

```bash
npm install --save-dev typescript @types/node
# or
yarn add -D typescript @types/node
```

## Type Definitions

Create comprehensive type definitions for the API:

```typescript
// types/fingerprint.ts

// Device Types
export interface Device {
  id: string;
  serialNumber: string;
  model: string;
  status: 'connected' | 'disconnected' | 'busy';
  lastActivity?: string;
}

export interface DeviceInfo extends Device {
  firmwareVersion: string;
  temperature: number;
  capabilities: {
    resolution: string;
    imageSize: string;
  };
}

export interface DeviceTestResult {
  status: 'success' | 'failed';
  message: string;
  quality: number;
  responseTime: number;
}

// Fingerprint Operation Types
export interface EnrollmentRequest {
  userId: string;
  deviceId?: string;
  metadata?: Record<string, any>;
}

export interface EnrollmentResult {
  template: string;
  quality: number;
  enrollmentId: string;
  scansCompleted: number;
  message: string;
}

export interface VerificationRequest {
  template: string;
  userId: string;
  deviceId?: string;
}

export interface VerificationResult {
  match: boolean;
  confidence: number;
  userId: string;
  verificationTime: number;
}

export interface IdentificationRequest {
  template: string;
  deviceId?: string;
}

export interface IdentificationResult {
  match: boolean;
  confidence: number;
  userId: string;
  matchedTemplate: string;
  identificationTime: number;
}

export interface ScanSession {
  scanId: string;
  status: 'waiting' | 'scanning' | 'complete' | 'error';
  deviceId: string;
}

export interface ScanStatus {
  status: 'waiting' | 'scanning' | 'complete' | 'error';
  quality?: number;
  template?: string;
  scanTime?: number;
  error?: string;
}

// Error Types
export interface APIError {
  code: number;
  name: string;
  message: string;
  retryAfter?: number;
}

export class FingerprintAPIError extends Error {
  constructor(
    public code: number,
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'FingerprintAPIError';
  }
}

// Request Options
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

// Configuration
export interface FingerprintAPIConfig {
  baseURL: string;
  apiKey: string;
  timeout?: number;
}
```

## Type-Safe API Client

Create a fully typed API client:

```typescript
// fingerprint-api.ts
import type {
  Device,
  DeviceInfo,
  DeviceTestResult,
  EnrollmentRequest,
  EnrollmentResult,
  VerificationRequest,
  VerificationResult,
  IdentificationRequest,
  IdentificationResult,
  ScanSession,
  ScanStatus,
  FingerprintAPIConfig,
  RequestOptions,
  FingerprintAPIError,
} from './types/fingerprint';

export class FingerprintAPI {
  private baseURL: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: FingerprintAPIConfig) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: options.signal || controller.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new FingerprintAPIError(
          error.error?.code || response.status,
          error.error?.message || response.statusText,
          error.error?.retryAfter
        );
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Device Management
  async getDevices(): Promise<Device[]> {
    return this.request<Device[]>('/devices');
  }

  async getDeviceInfo(deviceId: string): Promise<DeviceInfo> {
    return this.request<DeviceInfo>(`/devices/${deviceId}/info`);
  }

  async testDevice(deviceId: string): Promise<DeviceTestResult> {
    return this.request<DeviceTestResult>(`/devices/${deviceId}/test`, {
      method: 'POST',
    });
  }

  // Fingerprint Operations
  async enrollFingerprint(
    request: EnrollmentRequest
  ): Promise<EnrollmentResult> {
    return this.request<EnrollmentResult>('/fingerprint/enroll', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async verifyFingerprint(
    request: VerificationRequest
  ): Promise<VerificationResult> {
    return this.request<VerificationResult>('/fingerprint/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async identifyFingerprint(
    request: IdentificationRequest
  ): Promise<IdentificationResult> {
    return this.request<IdentificationResult>('/fingerprint/identify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async startScan(deviceId?: string): Promise<ScanSession> {
    const query = deviceId ? `?deviceId=${deviceId}` : '';
    return this.request<ScanSession>(`/fingerprint/scan/start${query}`);
  }

  async getScanStatus(scanId: string): Promise<ScanStatus> {
    return this.request<ScanStatus>(`/fingerprint/scan/status/${scanId}`);
  }
}
```

## Generic Request Handler

Create a generic request handler with type parameters:

```typescript
// api-client.ts
export class TypedAPIClient {
  constructor(
    private baseURL: string,
    private apiKey: string
  ) {}

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<TRequest, TResponse>(
    endpoint: string,
    data: TRequest
  ): Promise<TResponse> {
    return this.request<TResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<TRequest, TResponse>(
    endpoint: string,
    data: TRequest
  ): Promise<TResponse> {
    return this.request<TResponse>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Usage with type inference
const client = new TypedAPIClient('http://localhost:8080/api', 'your-api-key');

// TypeScript infers the return type
const devices = await client.get<Device[]>('/devices');
const result = await client.post<EnrollmentRequest, EnrollmentResult>(
  '/fingerprint/enroll',
  { userId: 'user-123' }
);
```

## Async/Await Patterns

### Enrollment with Type Safety

```typescript
async function enrollUser(
  api: FingerprintAPI,
  userId: string,
  userName: string
): Promise<EnrollmentResult> {
  try {
    const result = await api.enrollFingerprint({
      userId,
      metadata: { name: userName, enrolledAt: new Date().toISOString() },
    });

    if (result.quality < 60) {
      throw new Error(`Low quality scan: ${result.quality}`);
    }

    return result;
  } catch (error) {
    if (error instanceof FingerprintAPIError) {
      console.error(`API Error ${error.code}: ${error.message}`);
    }
    throw error;
  }
}
```

### Verification with Type Guards

```typescript
function isSuccessfulVerification(
  result: VerificationResult
): result is VerificationResult & { match: true } {
  return result.match && result.confidence >= 70;
}

async function verifyUser(
  api: FingerprintAPI,
  userId: string,
  template: string
): Promise<boolean> {
  const result = await api.verifyFingerprint({ template, userId });

  if (isSuccessfulVerification(result)) {
    console.log(`Verified with ${result.confidence}% confidence`);
    return true;
  }

  return false;
}
```

### Identification with Union Types

```typescript
type IdentificationOutcome =
  | { success: true; userId: string; confidence: number }
  | { success: false; reason: string };

async function identifyUser(
  api: FingerprintAPI,
  template: string
): Promise<IdentificationOutcome> {
  try {
    const result = await api.identifyFingerprint({ template });

    if (result.match) {
      return {
        success: true,
        userId: result.userId,
        confidence: result.confidence,
      };
    }

    return {
      success: false,
      reason: 'No match found in database',
    };
  } catch (error) {
    return {
      success: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Usage with type narrowing
const outcome = await identifyUser(api, template);

if (outcome.success) {
  console.log(`User ${outcome.userId} identified`);
} else {
  console.log(`Identification failed: ${outcome.reason}`);
}
```

## Advanced Type Patterns

### Result Type Pattern

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function safeEnroll(
  api: FingerprintAPI,
  request: EnrollmentRequest
): Promise<Result<EnrollmentResult, FingerprintAPIError>> {
  try {
    const value = await api.enrollFingerprint(request);
    return { ok: true, value };
  } catch (error) {
    if (error instanceof FingerprintAPIError) {
      return { ok: false, error };
    }
    return {
      ok: false,
      error: new FingerprintAPIError(5001, 'Unknown error'),
    };
  }
}

// Usage
const result = await safeEnroll(api, { userId: 'user-123' });

if (result.ok) {
  console.log('Template:', result.value.template);
} else {
  console.error('Error:', result.error.message);
}
```

### Builder Pattern with Types

```typescript
class EnrollmentRequestBuilder {
  private request: Partial<EnrollmentRequest> = {};

  setUserId(userId: string): this {
    this.request.userId = userId;
    return this;
  }

  setDeviceId(deviceId: string): this {
    this.request.deviceId = deviceId;
    return this;
  }

  setMetadata(metadata: Record<string, any>): this {
    this.request.metadata = metadata;
    return this;
  }

  build(): EnrollmentRequest {
    if (!this.request.userId) {
      throw new Error('userId is required');
    }
    return this.request as EnrollmentRequest;
  }
}

// Usage
const request = new EnrollmentRequestBuilder()
  .setUserId('user-123')
  .setMetadata({ name: 'John Doe' })
  .build();
```

### Retry Logic with Generics

```typescript
interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  shouldRetry?: (error: Error) => boolean;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, baseDelay, shouldRetry } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts - 1;
      const shouldRetryError =
        !shouldRetry || shouldRetry(error as Error);

      if (isLastAttempt || !shouldRetryError) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage
const result = await retryWithBackoff(
  () => api.enrollFingerprint({ userId: 'user-123' }),
  {
    maxAttempts: 3,
    baseDelay: 1000,
    shouldRetry: (error) => {
      if (error instanceof FingerprintAPIError) {
        return error.code === 2001; // LOW_QUALITY
      }
      return false;
    },
  }
);
```

### Type-Safe Event Emitter

```typescript
type EventMap = {
  deviceConnected: Device;
  deviceDisconnected: string;
  scanComplete: ScanStatus;
  scanError: { scanId: string; error: string };
};

class TypedEventEmitter<T extends Record<string, any>> {
  private listeners: {
    [K in keyof T]?: Array<(data: T[K]) => void>;
  } = {};

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
  }

  off<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event]!.filter(
        (cb) => cb !== callback
      );
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    if (this.listeners[event]) {
      this.listeners[event]!.forEach((callback) => callback(data));
    }
  }
}

// Usage
const emitter = new TypedEventEmitter<EventMap>();

emitter.on('deviceConnected', (device) => {
  console.log('Device connected:', device.model);
});

emitter.on('scanComplete', (status) => {
  console.log('Scan complete, quality:', status.quality);
});
```

## Complete Example: Type-Safe Service

```typescript
// fingerprint-service.ts
import {
  FingerprintAPI,
  Device,
  EnrollmentResult,
  VerificationResult,
  IdentificationResult,
  FingerprintAPIError,
} from './fingerprint-api';

export interface User {
  id: string;
  name: string;
  fingerprintTemplate?: string;
  fingerprintQuality?: number;
  enrolledAt?: string;
}

export class FingerprintService {
  private api: FingerprintAPI;
  private deviceCache: Device[] | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 300000; // 5 minutes

  constructor(baseURL: string, apiKey: string) {
    this.api = new FingerprintAPI({ baseURL, apiKey });
  }

  async getAvailableDevices(): Promise<Device[]> {
    const now = Date.now();

    if (
      this.deviceCache &&
      now - this.cacheTimestamp < this.cacheTTL
    ) {
      return this.deviceCache;
    }

    this.deviceCache = await this.api.getDevices();
    this.cacheTimestamp = now;
    return this.deviceCache;
  }

  async enrollUser(
    user: User,
    maxAttempts: number = 3
  ): Promise<EnrollmentResult> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.api.enrollFingerprint({
          userId: user.id,
          metadata: {
            name: user.name,
            enrolledAt: new Date().toISOString(),
          },
        });

        if (result.quality >= 60) {
          return result;
        }

        if (attempt < maxAttempts) {
          console.log(
            `Low quality (${result.quality}), attempt ${attempt}/${maxAttempts}`
          );
          await this.delay(1000);
        }
      } catch (error) {
        if (
          error instanceof FingerprintAPIError &&
          error.code === 2001 &&
          attempt < maxAttempts
        ) {
          console.log('Low quality scan, retrying...');
          await this.delay(1000);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to enroll after maximum attempts');
  }

  async verifyUser(
    userId: string,
    template: string,
    minConfidence: number = 70
  ): Promise<boolean> {
    const result = await this.api.verifyFingerprint({ template, userId });
    return result.match && result.confidence >= minConfidence;
  }

  async identifyUser(
    template: string
  ): Promise<IdentificationResult | null> {
    const result = await this.api.identifyFingerprint({ template });
    return result.match ? result : null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

## Testing with TypeScript

### Unit Tests with Jest

```typescript
// fingerprint-service.test.ts
import { FingerprintService } from './fingerprint-service';
import { FingerprintAPI } from './fingerprint-api';

jest.mock('./fingerprint-api');

describe('FingerprintService', () => {
  let service: FingerprintService;
  let mockAPI: jest.Mocked<FingerprintAPI>;

  beforeEach(() => {
    service = new FingerprintService(
      'http://localhost:8080/api',
      'test-key'
    );
    mockAPI = (service as any).api;
  });

  describe('enrollUser', () => {
    it('should enroll user successfully', async () => {
      const mockResult = {
        template: 'mock-template',
        quality: 85,
        enrollmentId: 'enroll-123',
        scansCompleted: 3,
        message: 'Success',
      };

      mockAPI.enrollFingerprint.mockResolvedValue(mockResult);

      const user = { id: 'user-123', name: 'John Doe' };
      const result = await service.enrollUser(user);

      expect(result).toEqual(mockResult);
      expect(mockAPI.enrollFingerprint).toHaveBeenCalledWith({
        userId: user.id,
        metadata: expect.objectContaining({ name: user.name }),
      });
    });

    it('should retry on low quality', async () => {
      mockAPI.enrollFingerprint
        .mockResolvedValueOnce({
          template: 'mock-template',
          quality: 45,
          enrollmentId: 'enroll-123',
          scansCompleted: 3,
          message: 'Low quality',
        })
        .mockResolvedValueOnce({
          template: 'mock-template',
          quality: 85,
          enrollmentId: 'enroll-123',
          scansCompleted: 3,
          message: 'Success',
        });

      const user = { id: 'user-123', name: 'John Doe' };
      const result = await service.enrollUser(user);

      expect(result.quality).toBe(85);
      expect(mockAPI.enrollFingerprint).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyUser', () => {
    it('should verify user successfully', async () => {
      mockAPI.verifyFingerprint.mockResolvedValue({
        match: true,
        confidence: 95,
        userId: 'user-123',
        verificationTime: 150,
      });

      const verified = await service.verifyUser(
        'user-123',
        'mock-template'
      );

      expect(verified).toBe(true);
    });

    it('should reject low confidence match', async () => {
      mockAPI.verifyFingerprint.mockResolvedValue({
        match: true,
        confidence: 65,
        userId: 'user-123',
        verificationTime: 150,
      });

      const verified = await service.verifyUser(
        'user-123',
        'mock-template',
        70
      );

      expect(verified).toBe(false);
    });
  });
});
```

## Best Practices

### 1. Use Strict TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true
  }
}
```

### 2. Use Discriminated Unions for State

```typescript
type FingerprintState =
  | { status: 'idle' }
  | { status: 'scanning'; progress: number }
  | { status: 'complete'; template: string; quality: number }
  | { status: 'error'; error: string };

function handleState(state: FingerprintState): void {
  switch (state.status) {
    case 'idle':
      console.log('Ready to scan');
      break;
    case 'scanning':
      console.log(`Scanning: ${state.progress}%`);
      break;
    case 'complete':
      console.log(`Complete: quality ${state.quality}`);
      break;
    case 'error':
      console.error(`Error: ${state.error}`);
      break;
  }
}
```

### 3. Use Readonly for Immutable Data

```typescript
interface ReadonlyDevice {
  readonly id: string;
  readonly serialNumber: string;
  readonly model: string;
  readonly status: string;
}

function processDevice(device: ReadonlyDevice): void {
  // device.id = 'new-id'; // Error: Cannot assign to 'id'
  console.log(device.id);
}
```

### 4. Use Utility Types

```typescript
// Partial - make all properties optional
type PartialEnrollment = Partial<EnrollmentRequest>;

// Required - make all properties required
type RequiredMetadata = Required<EnrollmentRequest['metadata']>;

// Pick - select specific properties
type DeviceIdentifier = Pick<Device, 'id' | 'serialNumber'>;

// Omit - exclude specific properties
type DeviceWithoutStatus = Omit<Device, 'status'>;

// Record - create object type with specific keys
type DeviceMap = Record<string, Device>;
```

## Next Steps

- [React Integration](./react.md) - Use TypeScript with React hooks
- [Angular Integration](./angular.md) - TypeScript with Angular services
- [API Reference](/docs/api-reference/rest-api) - Complete API documentation
- [Best Practices](/docs/guides/best-practices) - Advanced patterns

## Support

For issues or questions:
- Check the [Troubleshooting Guide](/docs/troubleshooting)
- Review [API Documentation](/docs/api-reference/rest-api)
- See [Error Codes](/docs/api-reference/error-codes)
