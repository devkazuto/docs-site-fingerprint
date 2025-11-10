---
sidebar_position: 1
---

# Welcome to Fingerprint Service Documentation

Welcome to the comprehensive integration documentation for the Fingerprint Background Service. This documentation will guide you through integrating ZKTeco fingerprint reader functionality into your applications.

## What is Fingerprint Service?

The Fingerprint Background Service is a Windows service that provides a REST API and WebSocket interface for interacting with ZKTeco fingerprint readers. It enables developers to easily integrate fingerprint enrollment, verification, and identification capabilities into their applications without dealing with low-level SDK complexities.

## System Architecture

### High-Level Architecture (Cloud-Based)

```mermaid
graph TB
    subgraph "Cloud Infrastructure"
        WebApp[Web Application<br/>your-app.com]
        CloudBackend[Cloud Backend<br/>Orchestrator]
        Database[(PostgreSQL<br/>Database)]
    end
    
    subgraph "Location 1 - Office A"
        Agent1[Agent Service]
        Service1[Fingerprint Service<br/>Port 8080]
        Device1[ZKTeco Reader]
    end
    
    subgraph "Location 2 - Office B"
        Agent2[Agent Service]
        Service2[Fingerprint Service<br/>Port 8080]
        Device2[ZKTeco Reader]
    end
    
    subgraph "Location N - Remote"
        AgentN[Agent Service]
        ServiceN[Fingerprint Service<br/>Port 8080]
        DeviceN[ZKTeco Reader]
    end
    
    subgraph "Users"
        User1[User Browser]
        User2[Mobile App]
        User3[Admin Dashboard]
    end
    
    User1 -->|HTTPS| WebApp
    User2 -->|HTTPS| WebApp
    User3 -->|HTTPS| WebApp
    
    WebApp -->|REST API| CloudBackend
    WebApp <-->|WebSocket| CloudBackend
    
    CloudBackend <-->|WSS<br/>Outbound| Agent1
    CloudBackend <-->|WSS<br/>Outbound| Agent2
    CloudBackend <-->|WSS<br/>Outbound| AgentN
    
    CloudBackend -->|Store/Query| Database
    
    Agent1 --> Service1
    Service1 -->|USB| Device1
    
    Agent2 --> Service2
    Service2 -->|USB| Device2
    
    AgentN --> ServiceN
    ServiceN -->|USB| DeviceN
    
    style WebApp fill:#e1f5ff
    style CloudBackend fill:#c8e6c9
    style Agent1 fill:#fff4e6
    style Agent2 fill:#fff4e6
    style AgentN fill:#fff4e6
    style Database fill:#f3e5f5
```

**Key Components:**

- **Cloud Web App**: Hosted web application accessible from anywhere
- **Cloud Backend**: Orchestrator that manages all agents and routes commands
- **Agent Service**: Desktop service that connects to cloud backend (outbound connection only)
- **Fingerprint Service**: Local service that manages fingerprint hardware
- **Database**: Stores agent registry, commands, and audit logs

**Benefits:**
- ✅ Multi-location support
- ✅ Centralized management
- ✅ Secure (outbound connections only)
- ✅ Scalable architecture
- ✅ Real-time monitoring

> **Note:** For simpler use cases where the web app runs on the same machine as the fingerprint reader, see [Integration Architectures](./integration/architectures.md) for alternative deployment options.

### Integration Architecture

```mermaid
graph TB
    subgraph "User Layer"
        Browser[Web Browser]
        Mobile[Mobile App]
    end
    
    subgraph "Cloud Layer"
        WebApp[Web Application<br/>React/Vue/Angular]
        CloudAPI[Cloud Backend API<br/>Agent Management]
        CloudWS[WebSocket Server<br/>Real-time Events]
        CloudDB[(Database<br/>Commands & Logs)]
    end
    
    subgraph "Agent Layer - Location 1"
        Agent1[Cloud Connector<br/>WebSocket Client]
        LocalAPI1[Local Service API<br/>Port 8080]
        DeviceMgr1[Device Manager]
        FPReader1[Fingerprint Reader]
    end
    
    subgraph "Agent Layer - Location 2"
        Agent2[Cloud Connector<br/>WebSocket Client]
        LocalAPI2[Local Service API<br/>Port 8080]
        DeviceMgr2[Device Manager]
        FPReader2[Fingerprint Reader]
    end
    
    Browser -->|HTTPS| WebApp
    Mobile -->|HTTPS| WebApp
    
    WebApp -->|REST API| CloudAPI
    WebApp <-->|WebSocket| CloudWS
    
    CloudAPI --> CloudDB
    CloudWS --> CloudDB
    
    CloudAPI <-->|WSS<br/>Commands| Agent1
    CloudWS <-->|WSS<br/>Events| Agent1
    
    CloudAPI <-->|WSS<br/>Commands| Agent2
    CloudWS <-->|WSS<br/>Events| Agent2
    
    Agent1 --> LocalAPI1
    LocalAPI1 --> DeviceMgr1
    DeviceMgr1 -->|USB| FPReader1
    
    Agent2 --> LocalAPI2
    LocalAPI2 --> DeviceMgr2
    DeviceMgr2 -->|USB| FPReader2
    
    style WebApp fill:#e1f5ff
    style CloudAPI fill:#c8e6c9
    style CloudWS fill:#c8e6c9
    style Agent1 fill:#fff4e6
    style Agent2 fill:#fff4e6
    style FPReader1 fill:#f3e5f5
    style FPReader2 fill:#f3e5f5
```

**Architecture Layers:**

1. **User Layer**: Web browsers and mobile apps accessing the cloud application
2. **Cloud Layer**: Hosted web app and backend that orchestrates all operations
3. **Agent Layer**: Desktop services at various locations with fingerprint readers

**Data Flow:**
- Users interact with cloud web app
- Web app sends commands to cloud backend
- Cloud backend routes commands to appropriate agents via WebSocket
- Agents execute commands on local fingerprint hardware
- Results flow back through cloud backend to web app
- Real-time events broadcast to all connected clients

### Component Interaction Flow (Cloud-Based)

```mermaid
sequenceDiagram
    participant User as User Browser
    participant WebApp as Web App<br/>(Cloud)
    participant Backend as Cloud Backend
    participant DB as Database
    participant Agent as Agent<br/>(Office)
    participant Service as Local Service
    participant Device as FP Reader
    
    Note over User,Device: Agent Connection (On Startup)
    Agent->>Backend: WSS Connect (with API Key)
    Backend->>DB: Update agent status = online
    Backend-->>Agent: Connection accepted
    Agent->>Backend: Send agent info
    Backend->>DB: Store agent metadata
    
    Note over User,Device: User Requests Agent List
    User->>WebApp: Open fingerprint page
    WebApp->>Backend: GET /api/agents
    Backend->>DB: Query agents
    DB-->>Backend: Agent list
    Backend-->>WebApp: Available agents
    WebApp-->>User: Show agent selector
    
    Note over User,Device: WebSocket Connection
    WebApp->>Backend: Connect WebSocket
    Backend-->>WebApp: Connection established
    WebApp->>Backend: Subscribe to events
    
    Note over User,Device: Fingerprint Enrollment
    User->>WebApp: Click "Enroll" (select agent)
    WebApp->>Backend: POST /api/agents/:id/commands<br/>{command: "enroll"}
    Backend->>DB: Create command record
    Backend->>Agent: WS: command message
    Agent->>Service: Execute enroll command
    Service->>Device: Start fingerprint capture
    
    Device-->>Service: Fingerprint detected
    Service-->>Agent: Event: detected
    Agent->>Backend: WS: event message
    Backend->>WebApp: WS: broadcast event
    WebApp-->>User: Update UI "Scanning..."
    
    Device-->>Service: Capture complete
    Service-->>Agent: Result with template
    Agent->>Backend: WS: command result
    Backend->>DB: Update command status
    Backend->>WebApp: WS: result message
    WebApp-->>User: Show success + template
    
    User->>WebApp: Save template
    WebApp->>Backend: POST /api/users/:id/template
    Backend->>DB: Store template
    DB-->>Backend: Confirmation
    Backend-->>WebApp: Success
    WebApp-->>User: "Enrollment complete!"
    
    Note over User,Device: Cleanup
    User->>WebApp: Close page
    WebApp->>Backend: Disconnect WebSocket
    Backend-->>WebApp: Connection closed
```

**Key Interactions:**

1. **Agent Registration**: Agents connect to cloud backend on startup with API key authentication
2. **Agent Discovery**: Web app queries available agents from cloud backend
3. **Command Routing**: Cloud backend routes commands to appropriate agents via WebSocket
4. **Real-time Events**: Events flow from device → agent → cloud → web app for live updates
5. **Data Persistence**: Templates and audit logs stored in cloud database

## Key Features

- **REST API**: Simple HTTP endpoints for all fingerprint operations
- **WebSocket Support**: Real-time event notifications for fingerprint captures
- **Multi-Device Support**: Manage multiple fingerprint readers simultaneously
- **Cross-Platform Clients**: Integrate from any language or framework that supports HTTP
- **Template Management**: Store and manage fingerprint templates in your own database
- **Web Admin Interface**: Built-in web interface for device management and testing

## Quick Links

### Getting Started
- [Installation Guide](./getting-started/installation.md) - Install the service on Windows, macOS, or Linux
- [Authentication](./getting-started/authentication.md) - Learn how to authenticate API requests
- [Quick Start](./getting-started/quick-start.md) - Get up and running in 5 minutes

### Integration Guides
- [Integration Architectures](./integration/architectures.md) - Choose the right architecture for your deployment
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

Ready to get started? Head over to the [Installation Guide](./getting-started/installation.md) to install the Fingerprint Service, or jump straight to the [Quick Start](./getting-started/quick-start.md) if you already have it installed.
