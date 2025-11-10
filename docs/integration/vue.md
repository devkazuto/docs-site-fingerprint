---
sidebar_position: 5
title: Vue 3 Integration
description: Complete guide for integrating the Fingerprint Service with Vue 3
---

# Vue 3 Integration

Learn how to integrate the Fingerprint Background Service into your Vue 3 applications using the Composition API and composables.

## Prerequisites

- Vue 3.2+
- Node.js 16+
- Fingerprint Background Service running (default: `http://localhost:8080`)
- Valid API key

## Installation

```bash
npm create vue@latest fingerprint-app
cd fingerprint-app
npm install
```

## Type Definitions

Create type definitions for the API:

```typescript
// types/fingerprint.ts
export interface Device {
  id: string;
  serialNumber: string;
  model: string;
  status: string;
  lastActivity?: string;
}

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
```

## Vue 3 Composables

### useFingerprintAPI Composable

Create a composable for the API client:

```typescript
// composables/useFingerprintAPI.ts
import { ref } from 'vue';
import type {
  Device,
  EnrollmentRequest,
  EnrollmentResult,
  VerificationRequest,
  VerificationResult,
  IdentificationRequest,
  IdentificationResult,
} from '../types/fingerprint';

export function useFingerprintAPI(baseURL: string, apiKey: string) {
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        ...options,
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }

      return await response.json();
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getDevices(): Promise<Device[]> {
    return request<Device[]>('/devices');
  }

  async function getDeviceInfo(deviceId: string) {
    return request(`/devices/${deviceId}/info`);
  }

  async function enrollFingerprint(
    req: EnrollmentRequest
  ): Promise<EnrollmentResult> {
    return request<EnrollmentResult>('/fingerprint/enroll', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async function verifyFingerprint(
    req: VerificationRequest
  ): Promise<VerificationResult> {
    return request<VerificationResult>('/fingerprint/verify', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async function identifyFingerprint(
    req: IdentificationRequest
  ): Promise<IdentificationResult> {
    return request<IdentificationResult>('/fingerprint/identify', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  return {
    loading,
    error,
    getDevices,
    getDeviceInfo,
    enrollFingerprint,
    verifyFingerprint,
    identifyFingerprint,
  };
}
```

### useFingerprintEnroll Composable

Create a composable for enrollment operations:

```typescript
// composables/useFingerprintEnroll.ts
import { ref, computed } from 'vue';
import type { EnrollmentResult } from '../types/fingerprint';

export function useFingerprintEnroll(
  enrollFn: (userId: string, metadata?: Record<string, any>) => Promise<EnrollmentResult>
) {
  const isEnrolling = ref(false);
  const result = ref<EnrollmentResult | null>(null);
  const error = ref<Error | null>(null);
  const progress = ref(0);

  const isComplete = computed(() => result.value !== null);
  const hasError = computed(() => error.value !== null);

  async function enroll(userId: string, metadata?: Record<string, any>) {
    isEnrolling.value = true;
    result.value = null;
    error.value = null;
    progress.value = 0;

    try {
      progress.value = 33;
      const enrollResult = await enrollFn(userId, metadata);
      progress.value = 100;
      result.value = enrollResult;
      return enrollResult;
    } catch (err) {
      error.value = err as Error;
      progress.value = 0;
      throw err;
    } finally {
      isEnrolling.value = false;
    }
  }

  function reset() {
    isEnrolling.value = false;
    result.value = null;
    error.value = null;
    progress.value = 0;
  }

  return {
    isEnrolling,
    result,
    error,
    progress,
    isComplete,
    hasError,
    enroll,
    reset,
  };
}
```

### useFingerprintVerify Composable

Create a composable for verification operations:

```typescript
// composables/useFingerprintVerify.ts
import { ref, computed } from 'vue';
import type { VerificationResult } from '../types/fingerprint';

export function useFingerprintVerify(
  verifyFn: (userId: string, template: string) => Promise<VerificationResult>
) {
  const isVerifying = ref(false);
  const result = ref<VerificationResult | null>(null);
  const error = ref<Error | null>(null);

  const isSuccessful = computed(() => {
    return result.value?.match && result.value.confidence >= 70;
  });

  async function verify(userId: string, template: string) {
    isVerifying.value = true;
    result.value = null;
    error.value = null;

    try {
      const verifyResult = await verifyFn(userId, template);
      result.value = verifyResult;
      return verifyResult;
    } catch (err) {
      error.value = err as Error;
      throw err;
    } finally {
      isVerifying.value = false;
    }
  }

  function reset() {
    isVerifying.value = false;
    result.value = null;
    error.value = null;
  }

  return {
    isVerifying,
    result,
    error,
    isSuccessful,
    verify,
    reset,
  };
}
```

### useDevices Composable

Create a composable to manage device state:

```typescript
// composables/useDevices.ts
import { ref, onMounted } from 'vue';
import type { Device } from '../types/fingerprint';

export function useDevices(
  getDevicesFn: () => Promise<Device[]>
) {
  const devices = ref<Device[]>([]);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function fetchDevices() {
    loading.value = true;
    error.value = null;

    try {
      devices.value = await getDevicesFn();
    } catch (err) {
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    fetchDevices();
  });

  return {
    devices,
    loading,
    error,
    refetch: fetchDevices,
  };
}
```

## Reactive State Management with ref/reactive

### Using ref for Primitive Values

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useFingerprintAPI } from './composables/useFingerprintAPI';

const baseURL = 'http://localhost:8080/api';
const apiKey = 'your-api-key-here';
const api = useFingerprintAPI(baseURL, apiKey);

const userId = ref('');
const userName = ref('');
const isEnrolling = ref(false);

async function handleEnroll() {
  if (!userId.value || !userName.value) {
    alert('Please enter User ID and Name');
    return;
  }

  isEnrolling.value = true;

  try {
    const result = await api.enrollFingerprint({
      userId: userId.value,
      metadata: { name: userName.value },
    });

    alert(`Enrollment successful! Quality: ${result.quality}`);
    userId.value = '';
    userName.value = '';
  } catch (error) {
    alert(`Enrollment failed: ${(error as Error).message}`);
  } finally {
    isEnrolling.value = false;
  }
}
</script>

<template>
  <div class="enrollment-form">
    <h2>Fingerprint Enrollment</h2>
    <input v-model="userId" placeholder="User ID" :disabled="isEnrolling" />
    <input v-model="userName" placeholder="User Name" :disabled="isEnrolling" />
    <button @click="handleEnroll" :disabled="isEnrolling">
      {{ isEnrolling ? 'Enrolling...' : 'Enroll Fingerprint' }}
    </button>
  </div>
</template>
```

### Using reactive for Object State

```vue
<script setup lang="ts">
import { reactive, toRefs } from 'vue';
import { useFingerprintAPI } from './composables/useFingerprintAPI';

const baseURL = 'http://localhost:8080/api';
const apiKey = 'your-api-key-here';
const api = useFingerprintAPI(baseURL, apiKey);

const state = reactive({
  userId: '',
  userName: '',
  isEnrolling: false,
  result: null as any,
  error: null as Error | null,
});

async function handleEnroll() {
  state.isEnrolling = true;
  state.error = null;

  try {
    state.result = await api.enrollFingerprint({
      userId: state.userId,
      metadata: { name: state.userName },
    });
  } catch (error) {
    state.error = error as Error;
  } finally {
    state.isEnrolling = false;
  }
}

// Destructure with toRefs to maintain reactivity
const { userId, userName, isEnrolling, result, error } = toRefs(state);
</script>
```

## Component Examples with Composition API

### FingerprintEnrollment Component

```vue
<!-- components/FingerprintEnrollment.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useFingerprintAPI } from '../composables/useFingerprintAPI';
import { useFingerprintEnroll } from '../composables/useFingerprintEnroll';

const props = defineProps<{
  baseURL: string;
  apiKey: string;
}>();

const emit = defineEmits<{
  success: [template: string, quality: number];
  error: [error: Error];
}>();

const api = useFingerprintAPI(props.baseURL, props.apiKey);
const userId = ref('');
const userName = ref('');

const {
  isEnrolling,
  result,
  error,
  progress,
  isComplete,
  hasError,
  enroll,
  reset,
} = useFingerprintEnroll((id, metadata) =>
  api.enrollFingerprint({ userId: id, metadata })
);

async function handleEnroll() {
  if (!userId.value || !userName.value) {
    alert('Please enter User ID and Name');
    return;
  }

  try {
    const enrollResult = await enroll(userId.value, { name: userName.value });
    emit('success', enrollResult.template, enrollResult.quality);
  } catch (err) {
    emit('error', err as Error);
  }
}

function handleReset() {
  reset();
  userId.value = '';
  userName.value = '';
}
</script>

<template>
  <div class="fingerprint-enrollment">
    <h2>Fingerprint Enrollment</h2>

    <div v-if="!isComplete" class="form">
      <input
        v-model="userId"
        type="text"
        placeholder="User ID"
        :disabled="isEnrolling"
      />
      <input
        v-model="userName"
        type="text"
        placeholder="User Name"
        :disabled="isEnrolling"
      />
      <button @click="handleEnroll" :disabled="isEnrolling">
        {{ isEnrolling ? 'Enrolling...' : 'Enroll Fingerprint' }}
      </button>
    </div>

    <div v-if="isEnrolling" class="progress">
      <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
      <p>Please place your finger on the scanner...</p>
    </div>

    <div v-if="hasError" class="error">
      <p>Error: {{ error?.message }}</p>
      <button @click="reset">Try Again</button>
    </div>

    <div v-if="isComplete" class="success">
      <p>✓ Enrollment successful!</p>
      <p>Quality: {{ result?.quality }}</p>
      <p>Scans completed: {{ result?.scansCompleted }}</p>
      <button @click="handleReset">Enroll Another</button>
    </div>
  </div>
</template>

<style scoped>
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
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
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
  background: #42b983;
  transition: width 0.3s ease;
}

.error {
  padding: 15px;
  background: #fee;
  color: #c33;
  border-radius: 4px;
  margin: 10px 0;
}

.success {
  padding: 15px;
  background: #efe;
  color: #3c3;
  border-radius: 4px;
  margin: 10px 0;
}
</style>
```

### FingerprintVerification Component

```vue
<!-- components/FingerprintVerification.vue -->
<script setup lang="ts">
import { useFingerprintAPI } from '../composables/useFingerprintAPI';
import { useFingerprintVerify } from '../composables/useFingerprintVerify';

const props = defineProps<{
  baseURL: string;
  apiKey: string;
  userId: string;
  template: string;
}>();

const emit = defineEmits<{
  success: [confidence: number];
  failure: [];
}>();

const api = useFingerprintAPI(props.baseURL, props.apiKey);

const { isVerifying, result, error, isSuccessful, verify, reset } =
  useFingerprintVerify((userId, template) =>
    api.verifyFingerprint({ userId, template })
  );

async function handleVerify() {
  try {
    await verify(props.userId, props.template);
    
    if (isSuccessful.value) {
      emit('success', result.value!.confidence);
    } else {
      emit('failure');
    }
  } catch (err) {
    emit('failure');
  }
}
</script>

<template>
  <div class="fingerprint-verification">
    <h2>Fingerprint Verification</h2>

    <button
      v-if="!result && !error"
      @click="handleVerify"
      :disabled="isVerifying"
    >
      {{ isVerifying ? 'Verifying...' : 'Verify Fingerprint' }}
    </button>

    <div v-if="isVerifying" class="status">
      <p>Please place your finger on the scanner...</p>
    </div>

    <div v-if="error" class="error">
      <p>Verification failed: {{ error.message }}</p>
      <button @click="reset">Try Again</button>
    </div>

    <div v-if="result" :class="isSuccessful ? 'success' : 'failure'">
      <template v-if="isSuccessful">
        <p>✓ Verification successful!</p>
        <p>Confidence: {{ result.confidence }}%</p>
      </template>
      <template v-else>
        <p>✗ Verification failed</p>
        <p>Fingerprint does not match</p>
      </template>
      <button @click="reset">Verify Again</button>
    </div>
  </div>
</template>

<style scoped>
.fingerprint-verification {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

button {
  width: 100%;
  padding: 12px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.status {
  padding: 15px;
  background: #e3f2fd;
  border-radius: 4px;
  margin: 10px 0;
}

.error,
.failure {
  padding: 15px;
  background: #fee;
  color: #c33;
  border-radius: 4px;
  margin: 10px 0;
}

.success {
  padding: 15px;
  background: #efe;
  color: #3c3;
  border-radius: 4px;
  margin: 10px 0;
}
</style>
```

### DeviceStatus Component

```vue
<!-- components/DeviceStatus.vue -->
<script setup lang="ts">
import { useFingerprintAPI } from '../composables/useFingerprintAPI';
import { useDevices } from '../composables/useDevices';

const props = defineProps<{
  baseURL: string;
  apiKey: string;
}>();

const api = useFingerprintAPI(props.baseURL, props.apiKey);
const { devices, loading, error, refetch } = useDevices(() => api.getDevices());
</script>

<template>
  <div class="device-status">
    <h3>Connected Devices</h3>

    <div v-if="loading" class="loading">Loading devices...</div>

    <div v-if="error" class="error">
      <p>Error: {{ error.message }}</p>
      <button @click="refetch">Retry</button>
    </div>

    <div v-if="!loading && !error && devices.length === 0" class="no-devices">
      <p>No fingerprint devices detected</p>
      <button @click="refetch">Refresh</button>
    </div>

    <div v-if="devices.length > 0" class="device-list">
      <div v-for="device in devices" :key="device.id" class="device-item">
        <span
          class="status-indicator"
          :class="{ connected: device.status === 'connected' }"
        ></span>
        <div class="device-info">
          <p class="device-model">{{ device.model }}</p>
          <p class="device-serial">{{ device.serialNumber }}</p>
          <p class="device-status">{{ device.status }}</p>
        </div>
      </div>
      <button @click="refetch">Refresh</button>
    </div>
  </div>
</template>

<style scoped>
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
  background: #f44;
}

.status-indicator.connected {
  background: #4c4;
}

.device-info {
  flex: 1;
}

.device-model {
  font-weight: bold;
  margin: 0;
}

.device-serial,
.device-status {
  font-size: 0.9em;
  color: #666;
  margin: 2px 0;
}

button {
  margin-top: 10px;
  padding: 8px 16px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error {
  padding: 15px;
  background: #fee;
  color: #c33;
  border-radius: 4px;
}
</style>
```

## WebSocket Integration with onMounted/onUnmounted

Create a composable for WebSocket connection:

```typescript
// composables/useFingerprintWebSocket.ts
import { ref, onMounted, onUnmounted } from 'vue';
import type { Device } from '../types/fingerprint';

interface WebSocketEvents {
  onDeviceConnected?: (device: Device) => void;
  onDeviceDisconnected?: (deviceId: string) => void;
  onFingerprintDetected?: (data: { quality: number }) => void;
  onScanComplete?: (data: any) => void;
  onScanError?: (data: { error: string }) => void;
}

export function useFingerprintWebSocket(
  url: string,
  apiKey: string,
  events: WebSocketEvents = {}
) {
  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const error = ref<Error | null>(null);

  function connect() {
    try {
      ws.value = new WebSocket(url);

      ws.value.onopen = () => {
        console.log('WebSocket connected');
        isConnected.value = true;
        error.value = null;

        // Authenticate
        send({ type: 'auth', apiKey });
      };

      ws.value.onmessage = (event) => {
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

      ws.value.onerror = (event) => {
        console.error('WebSocket error:', event);
        error.value = new Error('WebSocket connection error');
      };

      ws.value.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected.value = false;
      };
    } catch (err) {
      error.value = err as Error;
    }
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
  }

  function send(data: any) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data));
    }
  }

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected,
    error,
    send,
    disconnect,
  };
}
```

### Using WebSocket in Component

```vue
<!-- components/LiveFingerprintScanner.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useFingerprintWebSocket } from '../composables/useFingerprintWebSocket';

const props = defineProps<{
  wsUrl: string;
  apiKey: string;
  deviceId: string;
}>();

const scanStatus = ref('idle');
const quality = ref(0);
const template = ref('');

const { isConnected, send } = useFingerprintWebSocket(
  props.wsUrl,
  props.apiKey,
  {
    onDeviceConnected: (device) => {
      console.log('Device connected:', device);
    },
    onFingerprintDetected: (data) => {
      scanStatus.value = 'scanning';
      quality.value = data.quality;
    },
    onScanComplete: (data) => {
      scanStatus.value = 'complete';
      template.value = data.template || '';
      quality.value = data.quality || 0;
    },
    onScanError: (data) => {
      scanStatus.value = 'error';
      console.error('Scan error:', data.error);
    },
  }
);

function startScan() {
  scanStatus.value = 'waiting';
  quality.value = 0;
  template.value = '';
  send({ type: 'scan:start', deviceId: props.deviceId });
}
</script>

<template>
  <div class="live-scanner">
    <h2>Live Fingerprint Scanner</h2>

    <div class="connection-status">
      <span v-if="isConnected" class="connected">● Connected</span>
      <span v-else class="disconnected">● Disconnected</span>
    </div>

    <button @click="startScan" :disabled="!isConnected">Start Scan</button>

    <div class="scan-status">
      <p>Status: {{ scanStatus }}</p>
      <p v-if="quality > 0">Quality: {{ quality }}</p>
    </div>

    <div v-if="template" class="scan-result">
      <p>✓ Scan complete!</p>
      <p>Template captured</p>
    </div>
  </div>
</template>

<style scoped>
.live-scanner {
  max-width: 500px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.connection-status {
  margin: 10px 0;
}

.connected {
  color: #4c4;
}

.disconnected {
  color: #f44;
}

button {
  width: 100%;
  padding: 12px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin: 10px 0;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.scan-status {
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
  margin: 10px 0;
}

.scan-result {
  padding: 15px;
  background: #efe;
  color: #3c3;
  border-radius: 4px;
  margin: 10px 0;
}
</style>
```

## Complete Example: Login Application

```vue
<!-- App.vue -->
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useFingerprintAPI } from './composables/useFingerprintAPI';
import FingerprintEnrollment from './components/FingerprintEnrollment.vue';
import FingerprintVerification from './components/FingerprintVerification.vue';
import DeviceStatus from './components/DeviceStatus.vue';

interface User {
  id: string;
  name: string;
  template?: string;
}

const baseURL = 'http://localhost:8080/api';
const apiKey = 'your-api-key-here';

const mode = ref<'enroll' | 'verify'>('enroll');
const users = ref<User[]>([]);
const selectedUserId = ref('');

// Load users from localStorage
const storedUsers = localStorage.getItem('users');
if (storedUsers) {
  users.value = JSON.parse(storedUsers);
}

function saveUsers() {
  localStorage.setItem('users', JSON.stringify(users.value));
}

function handleEnrollSuccess(template: string, quality: number) {
  // User data is already added in the enrollment component
  alert(`Enrollment successful! Quality: ${quality}`);
}

function handleVerifySuccess(confidence: number) {
  const user = users.value.find((u) => u.id === selectedUserId.value);
  if (user) {
    alert(`Welcome back, ${user.name}! Confidence: ${confidence}%`);
  }
}

function handleVerifyFailure() {
  alert('Verification failed');
}

function addUser(userId: string, userName: string, template: string) {
  users.value.push({ id: userId, name: userName, template });
  saveUsers();
}
</script>

<template>
  <div class="app">
    <h1>Fingerprint Login System</h1>

    <DeviceStatus :base-u-r-l="baseURL" :api-key="apiKey" />

    <div class="mode-selector">
      <button
        @click="mode = 'enroll'"
        :class="{ active: mode === 'enroll' }"
      >
        Enroll
      </button>
      <button
        @click="mode = 'verify'"
        :class="{ active: mode === 'verify' }"
      >
        Verify
      </button>
    </div>

    <FingerprintEnrollment
      v-if="mode === 'enroll'"
      :base-u-r-l="baseURL"
      :api-key="apiKey"
      @success="handleEnrollSuccess"
    />

    <div v-if="mode === 'verify'" class="verification-section">
      <h2>Select User to Verify</h2>
      <select v-model="selectedUserId">
        <option value="">Select a user</option>
        <option v-for="user in users" :key="user.id" :value="user.id">
          {{ user.name }}
        </option>
      </select>

      <FingerprintVerification
        v-if="selectedUserId"
        :base-u-r-l="baseURL"
        :api-key="apiKey"
        :user-id="selectedUserId"
        :template="users.find((u) => u.id === selectedUserId)?.template || ''"
        @success="handleVerifySuccess"
        @failure="handleVerifyFailure"
      />
    </div>

    <div class="user-list">
      <h2>Enrolled Users</h2>
      <p v-if="users.length === 0">No users enrolled yet</p>
      <ul v-if="users.length > 0">
        <li v-for="user in users" :key="user.id">
          {{ user.name }} ({{ user.id }})
          <span v-if="user.template" class="enrolled">✓ Enrolled</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  text-align: center;
  color: #42b983;
}

.mode-selector {
  display: flex;
  gap: 10px;
  margin: 20px 0;
}

.mode-selector button {
  flex: 1;
  padding: 12px;
  background: #f5f5f5;
  border: 2px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.mode-selector button.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

.verification-section select {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.user-list {
  margin-top: 30px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.user-list ul {
  list-style: none;
  padding: 0;
}

.user-list li {
  padding: 10px;
  margin: 5px 0;
  background: white;
  border-radius: 4px;
}

.enrolled {
  color: #42b983;
  font-weight: bold;
}
</style>
```

## Best Practices

### 1. Use Computed Properties

```typescript
import { ref, computed } from 'vue';

const quality = ref(85);
const isHighQuality = computed(() => quality.value >= 60);
```

### 2. Destructure with toRefs

```typescript
import { reactive, toRefs } from 'vue';

const state = reactive({
  loading: false,
  error: null,
});

const { loading, error } = toRefs(state);
```

### 3. Use watchEffect for Side Effects

```typescript
import { ref, watchEffect } from 'vue';

const userId = ref('');

watchEffect(() => {
  console.log('User ID changed:', userId.value);
});
```

### 4. Provide/Inject for Deep Component Trees

```typescript
// Parent component
import { provide } from 'vue';

const api = useFingerprintAPI(baseURL, apiKey);
provide('fingerprintAPI', api);

// Child component
import { inject } from 'vue';

const api = inject('fingerprintAPI');
```

## Next Steps

- [PHP Integration](./php.md) - Backend integration with PHP
- [API Reference](/docs/api-reference/rest-api) - Complete API documentation
- [Best Practices](/docs/guides/best-practices) - Advanced patterns

## Support

For issues or questions:
- Check the [Troubleshooting Guide](/docs/troubleshooting)
- Review [API Documentation](/docs/api-reference/rest-api)
- See [Error Codes](/docs/api-reference/error-codes)
