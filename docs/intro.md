---
sidebar_position: 1
---

# Welcome to Fingerprint Service Documentation

Welcome to the comprehensive integration documentation for the Fingerprint Background Service. This documentation will guide you through integrating ZKTeco fingerprint reader functionality into your applications.

## What is Fingerprint Service?

The Fingerprint Background Service is a Windows service that provides a REST API and WebSocket interface for interacting with ZKTeco fingerprint readers. It enables developers to easily integrate fingerprint enrollment, verification, and identification capabilities into their applications without dealing with low-level SDK complexities.

## System Architecture

### High-Level Architecture (QZ Tray Style)

```mermaid
graph TB
    subgraph "Cloud"
        WebApp[Web Application<br/>HTTPS<br/>your-app.com]
    end
    
    subgraph "User's Computer"
        Browser[Web Browser]
        Service[Fingerprint Service<br/>wss://localhost:8080<br/>✅ SSL Certificate]
        Device[ZKTeco Reader]
    end
    
    subgraph "Your Backend"
        Backend[Your Backend API<br/>Store Templates]
        Database[(Your Database<br/>User Data & Templates)]
    end
    
    WebApp -->|Load Page| Browser
    Browser <-->|WSS<br/>Direct Connection| Service
    Service -->|USB| Device
    
    Browser <-->|HTTPS<br/>Save/Load Templates| Backend
    Backend <-->|Query| Database
    
    style WebApp fill:#e1f5ff
    style Browser fill:#c8e6c9
    style Service fill:#fff4e6
    style Device fill:#f3e5f5
    style Backend fill:#ffe0b2
```

**Key Components:**

- **Cloud Web App**: Your hosted web application (React, Vue, Angular, etc.)
- **Web Browser**: User's browser with trusted SSL certificate
- **Fingerprint Service**: Local Windows service with HTTPS/WSS enabled
- **ZKTeco Reader**: USB fingerprint device
- **Your Backend**: Your existing backend API (stores user data and templates)

**How It Works:**

1. **Certificate Trust**: Service generates self-signed certificate and installs it to system trust store
2. **Direct Connection**: Browser connects directly to local service via `wss://localhost:8080`
3. **No Warnings**: Because certificate is trusted by system, no security warnings appear
4. **Template Storage**: Your backend stores fingerprint templates (not the local service)

**Benefits:**
- ✅ **No cloud backend needed** for fingerprint operations
- ✅ **No browser extension** required
- ✅ **No security warnings** (after certificate install)
- ✅ **Low latency** - Direct local connection
- ✅ **Production-ready** - Same approach as QZ Tray
- ✅ **Cost-effective** - No additional infrastructure
- ✅ **Simple deployment** - Just install service + certificate

> **Note:** This is the same architecture used by popular tools like QZ Tray (printing), Ledger Live (crypto wallets), and Trezor Bridge (hardware wallets). For other deployment options including multi-location support, see [Integration Architectures](./integration/architectures.md).

### Integration Architecture

```mermaid
graph TB
    subgraph "Cloud"
        WebApp[Web Application<br/>HTTPS<br/>your-app.com]
        Backend[Your Backend API<br/>User Management]
        Database[(Your Database<br/>Users & Templates)]
    end
    
    subgraph "User's Browser"
        Page[Web Page]
        JS[JavaScript Client]
    end
    
    subgraph "User's Computer"
        Service[Fingerprint Service<br/>HTTPS/WSS<br/>localhost:8080]
        DeviceMgr[Device Manager]
        Reader[ZKTeco Reader]
    end
    
    WebApp -->|Load| Page
    Page -->|Initialize| JS
    
    JS <-->|HTTPS REST API<br/>Enroll/Verify| Service
    JS <-->|WSS<br/>Real-time Events| Service
    
    JS <-->|HTTPS<br/>Save/Load Templates| Backend
    Backend <-->|Store| Database
    
    Service --> DeviceMgr
    DeviceMgr -->|USB| Reader
    
    style WebApp fill:#e1f5ff
    style Page fill:#c8e6c9
    style Service fill:#fff4e6
    style Reader fill:#f3e5f5
    style Backend fill:#ffe0b2
```

**Architecture Layers:**

1. **Cloud Layer**: Your hosted web application and backend API
2. **Browser Layer**: User's browser running your JavaScript client
3. **Local Service Layer**: Fingerprint service running on user's computer

**Data Flow:**
1. User opens your web app (HTTPS)
2. JavaScript client connects to local service via WSS
3. User performs fingerprint operations (enroll/verify)
4. Service captures fingerprint and returns template
5. JavaScript saves template to your backend
6. Real-time events flow via WebSocket for live UI updates

### Component Interaction Flow (QZ Tray Style)

```mermaid
sequenceDiagram
    participant User as User
    participant Browser as Browser
    participant WebApp as Web App<br/>(Cloud)
    participant Service as Local Service<br/>(wss://localhost:8080)
    participant Device as FP Reader
    participant Backend as Your Backend<br/>(Cloud)
    participant DB as Your Database
    
    Note over User,DB: Initial Setup (One-time)
    User->>Service: Install service + certificate
    Service->>Service: Generate SSL cert
    Service->>Service: Install to trust store
    
    Note over User,DB: User Opens Web App
    User->>Browser: Open your-app.com
    Browser->>WebApp: Load page (HTTPS)
    WebApp-->>Browser: HTML + JavaScript
    
    Note over User,DB: Connect to Local Service
    Browser->>Service: WSS connect to localhost:8080
    Service-->>Browser: ✅ Connection established
    Browser->>Service: GET /api/devices
    Service-->>Browser: Device list
    
    Note over User,DB: Fingerprint Enrollment
    User->>Browser: Click "Enroll"
    Browser->>Service: POST /api/fingerprint/enroll
    Service->>Device: Start capture
    
    Device-->>Service: Fingerprint detected
    Service->>Browser: WS: event "detected"
    Browser-->>User: Update UI "Scanning..."
    
    Device-->>Service: Scan 1/3 complete
    Service->>Browser: WS: event "scan_complete" (1/3)
    Browser-->>User: "Scan 1/3 complete"
    
    Device-->>Service: Scan 2/3 complete
    Service->>Browser: WS: event "scan_complete" (2/3)
    Browser-->>User: "Scan 2/3 complete"
    
    Device-->>Service: Scan 3/3 complete
    Service->>Service: Merge templates
    Service->>Browser: WS: result with template
    Browser-->>User: Show success
    
    Note over User,DB: Save Template to Your Backend
    Browser->>Backend: POST /api/users/:id/fingerprint<br/>{template, quality}
    Backend->>DB: Store template
    DB-->>Backend: Success
    Backend-->>Browser: Confirmation
    Browser-->>User: "Enrollment complete!"
    
    Note over User,DB: Fingerprint Verification (Later)
    User->>Browser: Click "Login with Fingerprint"
    Browser->>Backend: GET /api/users/:id/fingerprint
    Backend->>DB: Retrieve template
    DB-->>Backend: Template data
    Backend-->>Browser: Template
    
    Browser->>Service: POST /api/fingerprint/verify<br/>{template}
    Service->>Device: Capture fingerprint
    Device-->>Service: Fingerprint captured
    Service->>Service: Compare with template
    Service->>Browser: Result {match: true, confidence: 95}
    Browser-->>User: "Login successful!"
```

**Key Interactions:**

1. **One-Time Setup**: User installs service and SSL certificate (requires admin once)
2. **Direct Connection**: Browser connects directly to local service via WSS (no intermediary)
3. **Real-Time Events**: Events flow directly from service to browser via WebSocket
4. **Template Storage**: Your backend stores templates (service doesn't store anything)
5. **Verification**: Browser retrieves template from your backend, sends to service for comparison

## Key Features

- **HTTPS/WSS Support**: Secure connections from cloud web apps to local service (QZ Tray style)
- **No Cloud Backend Needed**: Direct browser-to-service communication
- **No Browser Extension**: Works with standard browsers after certificate install
- **REST API**: Simple HTTPS endpoints for all fingerprint operations
- **WebSocket Support**: Real-time event notifications via WSS for fingerprint captures
- **Multi-Device Support**: Manage multiple fingerprint readers simultaneously
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Template Management**: Store and manage fingerprint templates in your own database
- **Production-Ready**: Same architecture as QZ Tray, Ledger Live, and Trezor Bridge

## Quick Links

### Getting Started
- [Installation Guide](./getting-started/installation.md) - Install the service on Windows, macOS, or Linux
- [SSL/WSS Setup](./integration/ssl-setup.md) - Setup HTTPS and WSS for cloud web apps (QZ Tray style)
- [Authentication](./getting-started/authentication.md) - Learn how to authenticate API requests
- [Quick Start](./getting-started/quick-start.md) - Get up and running in 5 minutes

### Integration Guides
- [SSL/WSS Setup](./integration/ssl-setup.md) - **⭐ Recommended** - Setup for cloud web apps
- [Integration Architectures](./integration/architectures.md) - Compare different deployment options
- [JavaScript/TypeScript](./integration/javascript-vanilla.md) - Integrate with vanilla JS, React, Angular, or Vue
- [Backend Languages](./integration/php.md) - Integrate with PHP, Python, .NET, or Java

### API Reference
- [REST API](./api-reference/rest-api.md) - Complete REST API documentation
- [WebSocket](./api-reference/websocket.md) - Real-time event handling
- [Error Codes](./api-reference/error-codes.md) - Error code reference

### Guides
- [Enrollment Flow](./guides/enrollment-flow.md) - Step-by-step enrollment process
- [Verification Flow](./guides/verification-flow.md) - 1:1 fingerprint verification
- [Best Practices](./guides/best-practices.md) - Tips for production deployments

### Examples
- [Login System](./examples/login-system.md) - Complete fingerprint authentication example
- [Attendance System](./examples/attendance-system.md) - Time tracking with fingerprints
- [Access Control](./examples/access-control.md) - Door access control system

## Documentation Structure

This documentation is organized into several sections:

1. **Getting Started**: Installation, authentication, and quick start guides
2. **Integration Guides**: Framework-specific integration examples for JavaScript/TypeScript and backend languages
3. **API Reference**: Complete API documentation with all endpoints and parameters
4. **Guides**: Detailed workflows and best practices for common use cases
5. **Examples**: Complete working applications demonstrating real-world implementations

## Need Help?

If you encounter any issues or have questions:

- Check the [Installation Guide](./getting-started/installation.md)
- Review the [Best Practices](./guides/best-practices.md)
- Examine the [Error Codes Reference](./api-reference/error-codes.md)

## Next Steps

Ready to get started?

1. **[Installation Guide](./getting-started/installation.md)** - Install the Fingerprint Service
2. **[SSL/WSS Setup](./integration/ssl-setup.md)** - Setup HTTPS/WSS for cloud web apps (QZ Tray style)
3. **[Quick Start](./getting-started/quick-start.md)** - Build your first integration

**For cloud web apps (recommended):** Follow the [SSL/WSS Setup Guide](./integration/ssl-setup.md) to enable secure connections from your hosted web application to the local service.
