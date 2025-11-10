---
sidebar_position: 4
title: Angular Integration
description: Complete guide for integrating the Fingerprint Service with Angular
---

# Angular Integration

Learn how to integrate the Fingerprint Background Service into your Angular applications using services, dependency injection, and RxJS observables.

## Prerequisites

- Angular 15+
- Node.js 16+
- RxJS 7+
- Fingerprint Background Service running (default: `http://localhost:8080`)
- Valid API key

## Installation

```bash
ng new fingerprint-app
cd fingerprint-app
npm install rxjs
```

## Angular Service with Dependency Injection

Create a service to handle all fingerprint operations:

```typescript
// services/fingerprint.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';

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

@Injectable({
  providedIn: 'root'
})
export class FingerprintService {
  private baseURL = 'http://localhost:8080/api';
  private apiKey = 'your-api-key-here';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => new Error(error.error?.message || 'API request failed'));
  }

  // Device Management
  getDevices(): Observable<Device[]> {
    return this.http.get<Device[]>(`${this.baseURL}/devices`, {
      headers: this.getHeaders()
    }).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  getDeviceInfo(deviceId: string): Observable<any> {
    return this.http.get(`${this.baseURL}/devices/${deviceId}/info`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  testDevice(deviceId: string): Observable<any> {
    return this.http.post(`${this.baseURL}/devices/${deviceId}/test`, {}, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Fingerprint Operations
  enrollFingerprint(request: EnrollmentRequest): Observable<EnrollmentResult> {
    return this.http.post<EnrollmentResult>(
      `${this.baseURL}/fingerprint/enroll`,
      request,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  verifyFingerprint(request: VerificationRequest): Observable<VerificationResult> {
    return this.http.post<VerificationResult>(
      `${this.baseURL}/fingerprint/verify`,
      request,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  identifyFingerprint(request: IdentificationRequest): Observable<IdentificationResult> {
    return this.http.post<IdentificationResult>(
      `${this.baseURL}/fingerprint/identify`,
      request,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }
}
```

## RxJS Observables for API Calls

### Advanced Service with RxJS Operators

```typescript
// services/fingerprint-advanced.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, of } from 'rxjs';
import {
  catchError,
  map,
  retry,
  retryWhen,
  mergeMap,
  finalize,
  shareReplay,
  tap
} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FingerprintAdvancedService {
  private baseURL = 'http://localhost:8080/api';
  private apiKey = 'your-api-key-here';
  
  private devicesCache$: Observable<Device[]> | null = null;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders() {
    return {
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    };
  }

  // Cached device list with automatic refresh
  getDevicesCached(): Observable<Device[]> {
    if (!this.devicesCache$) {
      this.devicesCache$ = this.http.get<Device[]>(
        `${this.baseURL}/devices`,
        this.getHeaders()
      ).pipe(
        shareReplay({ bufferSize: 1, refCount: true }),
        catchError(error => {
          this.devicesCache$ = null;
          throw error;
        })
      );
    }
    return this.devicesCache$;
  }

  invalidateDeviceCache(): void {
    this.devicesCache$ = null;
  }

  // Enrollment with retry logic
  enrollWithRetry(
    request: EnrollmentRequest,
    maxAttempts: number = 3
  ): Observable<EnrollmentResult> {
    this.loadingSubject.next(true);

    return this.http.post<EnrollmentResult>(
      `${this.baseURL}/fingerprint/enroll`,
      request,
      this.getHeaders()
    ).pipe(
      retryWhen(errors =>
        errors.pipe(
          mergeMap((error, index) => {
            if (index >= maxAttempts - 1) {
              return throwError(() => error);
            }
            
            // Retry on specific error codes
            if (error.error?.code === 2001) { // LOW_QUALITY
              console.log(`Retry ${index + 1}/${maxAttempts}`);
              return timer(1000);
            }
            
            return throwError(() => error);
          })
        )
      ),
      tap(result => {
        if (result.quality < 60) {
          throw new Error(`Low quality: ${result.quality}`);
        }
      }),
      finalize(() => this.loadingSubject.next(false)),
      catchError(error => {
        console.error('Enrollment failed:', error);
        return throwError(() => error);
      })
    );
  }

  // Verification with confidence check
  verifyWithConfidence(
    request: VerificationRequest,
    minConfidence: number = 70
  ): Observable<boolean> {
    return this.http.post<VerificationResult>(
      `${this.baseURL}/fingerprint/verify`,
      request,
      this.getHeaders()
    ).pipe(
      map(result => result.match && result.confidence >= minConfidence),
      catchError(() => of(false))
    );
  }
}
```

## HttpClient Interceptor for API Key Authentication

Create an interceptor to automatically add API key to requests:

```typescript
// interceptors/api-key.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ApiKeyInterceptor implements HttpInterceptor {
  private apiKey = 'your-api-key-here';

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Only add API key to fingerprint service requests
    if (request.url.includes('/api/')) {
      request = request.clone({
        setHeaders: {
          'X-API-Key': this.apiKey
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.error('Invalid API key');
        } else if (error.status === 429) {
          console.error('Rate limit exceeded');
        }
        return throwError(() => error);
      })
    );
  }
}

// Register in app.module.ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';

@NgModule({
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiKeyInterceptor,
      multi: true
    }
  ]
})
export class AppModule { }
```

## Component Examples with Angular Forms

### Enrollment Component

```typescript
// components/fingerprint-enrollment/fingerprint-enrollment.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FingerprintService, EnrollmentResult } from '../../services/fingerprint.service';

@Component({
  selector: 'app-fingerprint-enrollment',
  templateUrl: './fingerprint-enrollment.component.html',
  styleUrls: ['./fingerprint-enrollment.component.css']
})
export class FingerprintEnrollmentComponent implements OnInit {
  enrollmentForm: FormGroup;
  isEnrolling = false;
  result: EnrollmentResult | null = null;
  error: string | null = null;
  progress = 0;

  constructor(
    private fb: FormBuilder,
    private fingerprintService: FingerprintService
  ) {
    this.enrollmentForm = this.fb.group({
      userId: ['', Validators.required],
      userName: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  onEnroll(): void {
    if (this.enrollmentForm.invalid) {
      return;
    }

    const { userId, userName } = this.enrollmentForm.value;
    this.isEnrolling = true;
    this.error = null;
    this.progress = 0;

    this.fingerprintService.enrollFingerprint({
      userId,
      metadata: { name: userName }
    }).subscribe({
      next: (result) => {
        this.result = result;
        this.progress = 100;
        this.isEnrolling = false;
        this.enrollmentForm.reset();
      },
      error: (error) => {
        this.error = error.message;
        this.isEnrolling = false;
        this.progress = 0;
      }
    });
  }

  reset(): void {
    this.result = null;
    this.error = null;
    this.progress = 0;
  }
}
```

```html
<!-- fingerprint-enrollment.component.html -->
<div class="enrollment-container">
  <h2>Fingerprint Enrollment</h2>

  <form [formGroup]="enrollmentForm" (ngSubmit)="onEnroll()" *ngIf="!result">
    <div class="form-group">
      <label for="userId">User ID</label>
      <input
        id="userId"
        type="text"
        formControlName="userId"
        [disabled]="isEnrolling"
        class="form-control"
      />
    </div>

    <div class="form-group">
      <label for="userName">User Name</label>
      <input
        id="userName"
        type="text"
        formControlName="userName"
        [disabled]="isEnrolling"
        class="form-control"
      />
    </div>

    <button
      type="submit"
      [disabled]="enrollmentForm.invalid || isEnrolling"
      class="btn btn-primary"
    >
      {{ isEnrolling ? 'Enrolling...' : 'Enroll Fingerprint' }}
    </button>
  </form>

  <div *ngIf="isEnrolling" class="progress-container">
    <div class="progress-bar" [style.width.%]="progress"></div>
    <p>Please place your finger on the scanner...</p>
  </div>

  <div *ngIf="error" class="alert alert-error">
    <p>{{ error }}</p>
    <button (click)="reset()" class="btn btn-secondary">Try Again</button>
  </div>

  <div *ngIf="result" class="alert alert-success">
    <p>✓ Enrollment successful!</p>
    <p>Quality: {{ result.quality }}</p>
    <p>Scans completed: {{ result.scansCompleted }}</p>
    <button (click)="reset()" class="btn btn-secondary">Enroll Another</button>
  </div>
</div>
```

### Verification Component

```typescript
// components/fingerprint-verification/fingerprint-verification.component.ts
import { Component, Input } from '@angular/core';
import { FingerprintService, VerificationResult } from '../../services/fingerprint.service';

@Component({
  selector: 'app-fingerprint-verification',
  templateUrl: './fingerprint-verification.component.html',
  styleUrls: ['./fingerprint-verification.component.css']
})
export class FingerprintVerificationComponent {
  @Input() userId!: string;
  @Input() template!: string;

  isVerifying = false;
  result: VerificationResult | null = null;
  error: string | null = null;

  constructor(private fingerprintService: FingerprintService) {}

  onVerify(): void {
    this.isVerifying = true;
    this.error = null;
    this.result = null;

    this.fingerprintService.verifyFingerprint({
      userId: this.userId,
      template: this.template
    }).subscribe({
      next: (result) => {
        this.result = result;
        this.isVerifying = false;
      },
      error: (error) => {
        this.error = error.message;
        this.isVerifying = false;
      }
    });
  }

  reset(): void {
    this.result = null;
    this.error = null;
  }

  get isSuccessful(): boolean {
    return this.result?.match && this.result.confidence >= 70 || false;
  }
}
```

```html
<!-- fingerprint-verification.component.html -->
<div class="verification-container">
  <h2>Fingerprint Verification</h2>

  <button
    *ngIf="!result && !error"
    (click)="onVerify()"
    [disabled]="isVerifying"
    class="btn btn-primary"
  >
    {{ isVerifying ? 'Verifying...' : 'Verify Fingerprint' }}
  </button>

  <div *ngIf="isVerifying" class="status">
    <p>Please place your finger on the scanner...</p>
  </div>

  <div *ngIf="error" class="alert alert-error">
    <p>Verification failed: {{ error }}</p>
    <button (click)="reset()" class="btn btn-secondary">Try Again</button>
  </div>

  <div *ngIf="result" [class]="isSuccessful ? 'alert alert-success' : 'alert alert-error'">
    <ng-container *ngIf="isSuccessful">
      <p>✓ Verification successful!</p>
      <p>Confidence: {{ result.confidence }}%</p>
    </ng-container>
    <ng-container *ngIf="!isSuccessful">
      <p>✗ Verification failed</p>
      <p>Fingerprint does not match</p>
    </ng-container>
    <button (click)="reset()" class="btn btn-secondary">Verify Again</button>
  </div>
</div>
```

### Device Status Component

```typescript
// components/device-status/device-status.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';
import { FingerprintService, Device } from '../../services/fingerprint.service';

@Component({
  selector: 'app-device-status',
  templateUrl: './device-status.component.html',
  styleUrls: ['./device-status.component.css']
})
export class DeviceStatusComponent implements OnInit, OnDestroy {
  devices: Device[] = [];
  loading = true;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(private fingerprintService: FingerprintService) {}

  ngOnInit(): void {
    // Poll for devices every 5 seconds
    interval(5000).pipe(
      startWith(0),
      switchMap(() => this.fingerprintService.getDevices()),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (devices) => {
        this.devices = devices;
        this.loading = false;
        this.error = null;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;
    this.fingerprintService.getDevices().subscribe({
      next: (devices) => {
        this.devices = devices;
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message;
        this.loading = false;
      }
    });
  }
}
```

```html
<!-- device-status.component.html -->
<div class="device-status">
  <h3>Connected Devices</h3>

  <div *ngIf="loading" class="loading">
    Loading devices...
  </div>

  <div *ngIf="error" class="alert alert-error">
    <p>Error: {{ error }}</p>
    <button (click)="refresh()" class="btn btn-secondary">Retry</button>
  </div>

  <div *ngIf="!loading && !error && devices.length === 0" class="no-devices">
    <p>No fingerprint devices detected</p>
    <button (click)="refresh()" class="btn btn-secondary">Refresh</button>
  </div>

  <div *ngIf="devices.length > 0" class="device-list">
    <div *ngFor="let device of devices" class="device-item">
      <span class="status-indicator" [class.connected]="device.status === 'connected'"></span>
      <div class="device-info">
        <p class="device-model">{{ device.model }}</p>
        <p class="device-serial">{{ device.serialNumber }}</p>
        <p class="device-status">{{ device.status }}</p>
      </div>
    </div>
    <button (click)="refresh()" class="btn btn-secondary">Refresh</button>
  </div>
</div>
```

## Complete Example: Login Application

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';
import { FingerprintService } from './services/fingerprint.service';

interface User {
  id: string;
  name: string;
  template?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  users: User[] = [];
  mode: 'enroll' | 'verify' = 'enroll';
  selectedUser: User | null = null;

  constructor(private fingerprintService: FingerprintService) {}

  ngOnInit(): void {
    // Load users from localStorage
    const stored = localStorage.getItem('users');
    if (stored) {
      this.users = JSON.parse(stored);
    }
  }

  onEnrollSuccess(userId: string, userName: string, template: string): void {
    const user: User = { id: userId, name: userName, template };
    this.users.push(user);
    this.saveUsers();
    alert(`Enrollment successful for ${userName}!`);
  }

  onVerifySuccess(userId: string): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      alert(`Welcome back, ${user.name}!`);
    }
  }

  onVerifyFailure(): void {
    alert('Verification failed');
  }

  private saveUsers(): void {
    localStorage.setItem('users', JSON.stringify(this.users));
  }

  setMode(mode: 'enroll' | 'verify'): void {
    this.mode = mode;
  }
}
```

```html
<!-- app.component.html -->
<div class="app-container">
  <h1>Fingerprint Login System</h1>

  <app-device-status></app-device-status>

  <div class="mode-selector">
    <button
      (click)="setMode('enroll')"
      [class.active]="mode === 'enroll'"
      class="btn"
    >
      Enroll
    </button>
    <button
      (click)="setMode('verify')"
      [class.active]="mode === 'verify'"
      class="btn"
    >
      Verify
    </button>
  </div>

  <app-enrollment-form
    *ngIf="mode === 'enroll'"
    (enrollSuccess)="onEnrollSuccess($event.userId, $event.userName, $event.template)"
  ></app-enrollment-form>

  <app-verification-form
    *ngIf="mode === 'verify'"
    [users]="users"
    (verifySuccess)="onVerifySuccess($event)"
    (verifyFailure)="onVerifyFailure()"
  ></app-verification-form>

  <div class="user-list">
    <h2>Enrolled Users</h2>
    <p *ngIf="users.length === 0">No users enrolled yet</p>
    <ul *ngIf="users.length > 0">
      <li *ngFor="let user of users">
        {{ user.name }} ({{ user.id }})
        <span *ngIf="user.template" class="enrolled">✓ Enrolled</span>
      </li>
    </ul>
  </div>
</div>
```

## Module Configuration

```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { FingerprintEnrollmentComponent } from './components/fingerprint-enrollment/fingerprint-enrollment.component';
import { FingerprintVerificationComponent } from './components/fingerprint-verification/fingerprint-verification.component';
import { DeviceStatusComponent } from './components/device-status/device-status.component';
import { FingerprintService } from './services/fingerprint.service';
import { ApiKeyInterceptor } from './interceptors/api-key.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    FingerprintEnrollmentComponent,
    FingerprintVerificationComponent,
    DeviceStatusComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [
    FingerprintService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiKeyInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

## Best Practices

### 1. Use Async Pipe

```html
<!-- Automatically subscribes and unsubscribes -->
<div *ngIf="devices$ | async as devices">
  <div *ngFor="let device of devices">
    {{ device.model }}
  </div>
</div>
```

```typescript
devices$ = this.fingerprintService.getDevices();
```

### 2. Unsubscribe from Observables

```typescript
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class MyComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.fingerprintService.getDevices()
      .pipe(takeUntil(this.destroy$))
      .subscribe(devices => {
        // Handle devices
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 3. Use RxJS Operators for Complex Logic

```typescript
import { combineLatest, merge } from 'rxjs';
import { map, filter, debounceTime } from 'rxjs/operators';

// Combine multiple observables
combineLatest([
  this.fingerprintService.getDevices(),
  this.userService.getUsers()
]).pipe(
  map(([devices, users]) => ({ devices, users }))
).subscribe(data => {
  // Handle combined data
});

// Debounce user input
this.searchControl.valueChanges.pipe(
  debounceTime(300),
  filter(value => value.length >= 3)
).subscribe(searchTerm => {
  // Perform search
});
```

### 4. Error Handling with Retry

```typescript
import { retry, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

this.fingerprintService.getDevices().pipe(
  retry(3),
  catchError(error => {
    console.error('Failed after 3 retries:', error);
    return of([]); // Return empty array as fallback
  })
).subscribe(devices => {
  this.devices = devices;
});
```

## Testing

### Unit Testing Services

```typescript
// fingerprint.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FingerprintService } from './fingerprint.service';

describe('FingerprintService', () => {
  let service: FingerprintService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FingerprintService]
    });
    service = TestBed.inject(FingerprintService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get devices', () => {
    const mockDevices = [
      { id: 'device-001', serialNumber: 'SLK20R-12345', model: 'ZKTeco', status: 'connected' }
    ];

    service.getDevices().subscribe(devices => {
      expect(devices).toEqual(mockDevices);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/devices');
    expect(req.request.method).toBe('GET');
    req.flush(mockDevices);
  });

  it('should enroll fingerprint', () => {
    const mockResult = {
      template: 'mock-template',
      quality: 85,
      enrollmentId: 'enroll-123',
      scansCompleted: 3,
      message: 'Success'
    };

    service.enrollFingerprint({ userId: 'user-123' }).subscribe(result => {
      expect(result).toEqual(mockResult);
    });

    const req = httpMock.expectOne('http://localhost:8080/api/fingerprint/enroll');
    expect(req.request.method).toBe('POST');
    req.flush(mockResult);
  });
});
```

### Component Testing

```typescript
// fingerprint-enrollment.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { FingerprintEnrollmentComponent } from './fingerprint-enrollment.component';
import { FingerprintService } from '../../services/fingerprint.service';

describe('FingerprintEnrollmentComponent', () => {
  let component: FingerprintEnrollmentComponent;
  let fixture: ComponentFixture<FingerprintEnrollmentComponent>;
  let mockService: jasmine.SpyObj<FingerprintService>;

  beforeEach(async () => {
    mockService = jasmine.createSpyObj('FingerprintService', ['enrollFingerprint']);

    await TestBed.configureTestingModule({
      declarations: [FingerprintEnrollmentComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: FingerprintService, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FingerprintEnrollmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should enroll successfully', () => {
    const mockResult = {
      template: 'mock-template',
      quality: 85,
      enrollmentId: 'enroll-123',
      scansCompleted: 3,
      message: 'Success'
    };

    mockService.enrollFingerprint.and.returnValue(of(mockResult));

    component.enrollmentForm.patchValue({
      userId: 'user-123',
      userName: 'John Doe'
    });

    component.onEnroll();

    expect(mockService.enrollFingerprint).toHaveBeenCalled();
    expect(component.result).toEqual(mockResult);
    expect(component.isEnrolling).toBe(false);
  });

  it('should handle enrollment error', () => {
    mockService.enrollFingerprint.and.returnValue(
      throwError(() => new Error('Enrollment failed'))
    );

    component.enrollmentForm.patchValue({
      userId: 'user-123',
      userName: 'John Doe'
    });

    component.onEnroll();

    expect(component.error).toBe('Enrollment failed');
    expect(component.isEnrolling).toBe(false);
  });
});
```

## Next Steps

- [Vue Integration](./vue.md) - Use Vue 3 composables
- [API Reference](/docs/api-reference/rest-api) - Complete API documentation
- [Best Practices](/docs/guides/best-practices) - Advanced patterns

## Support

For issues or questions:
- Check the [Troubleshooting Guide](/docs/troubleshooting)
- Review [API Documentation](/docs/api-reference/rest-api)
- See [Error Codes](/docs/api-reference/error-codes)
