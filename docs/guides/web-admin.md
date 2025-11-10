---
sidebar_position: 5
title: Web Admin Interface
description: Guide to using the Web Admin interface for managing the Fingerprint Service
---

# Web Admin Interface

The Fingerprint Service includes a web-based administration interface for managing devices, users, and system settings.

## Accessing the Web Admin

The Web Admin interface is available at:

```
http://localhost:3000/admin
```

By default, the interface runs on port 3000. You can configure this in the service settings.

## Features

### Device Management

- View connected fingerprint devices
- Monitor device status and health
- Configure device settings
- Test device connectivity

### User Management

- View enrolled users
- Manage fingerprint templates
- Delete user data
- Export/import user data

### System Settings

- Configure API keys
- Set up authentication
- Manage backup and restore
- View system logs

### Monitoring

- Real-time device status
- API usage statistics
- Error logs and diagnostics
- Performance metrics

## Authentication

The Web Admin interface requires authentication. Use your API key or admin credentials to log in.

## Configuration

You can customize the Web Admin interface through the service configuration file. See the [Configuration Guide](../getting-started/installation.md) for more details.

## Troubleshooting

If you encounter issues with the Web Admin interface:

1. Verify the service is running
2. Check that the correct port is configured
3. Ensure your firewall allows connections
4. Review the service logs for errors

For more help, see the [Troubleshooting Guide](../troubleshooting.md).
