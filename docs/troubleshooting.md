---
sidebar_position: 100
title: Troubleshooting
description: Common issues and solutions for the Fingerprint Service
---

# Troubleshooting

This guide covers common issues you might encounter when using the Fingerprint Service and their solutions.

## Installation Issues

### Service Won't Start

**Problem**: The service fails to start or crashes immediately.

**Solutions**:
1. Check that all dependencies are installed
2. Verify the device is properly connected
3. Review the service logs for error messages
4. Ensure no other application is using the fingerprint device

### Device Not Detected

**Problem**: The fingerprint reader is not recognized by the service.

**Solutions**:
1. Verify the device is properly connected via USB
2. Check that device drivers are installed
3. Try a different USB port
4. Restart the service after connecting the device

## API Issues

### Authentication Errors

**Problem**: API requests return 401 Unauthorized errors.

**Solutions**:
1. Verify your API key is correct
2. Ensure the API key is included in the request headers
3. Check that the API key hasn't expired
4. Generate a new API key if needed

### Connection Refused

**Problem**: Cannot connect to the API endpoint.

**Solutions**:
1. Verify the service is running
2. Check the correct port is being used (default: 3000)
3. Ensure firewall rules allow connections
4. Try accessing from localhost first

### Timeout Errors

**Problem**: API requests timeout or take too long.

**Solutions**:
1. Check network connectivity
2. Verify the device is responding
3. Reduce the number of concurrent requests
4. Increase timeout values in your client

## Fingerprint Operations

### Enrollment Fails

**Problem**: Unable to enroll fingerprints successfully.

**Solutions**:
1. Ensure the finger is clean and dry
2. Press firmly but not too hard on the sensor
3. Try different fingers
4. Increase the number of capture attempts
5. Check device sensor for dirt or damage

### Low Quality Scores

**Problem**: Fingerprint captures have low quality scores.

**Solutions**:
1. Clean the sensor surface
2. Ensure proper finger placement
3. Ask user to clean their finger
4. Adjust capture settings if available
5. Try multiple captures and use the best one

### Verification Fails

**Problem**: Valid fingerprints are not being verified.

**Solutions**:
1. Lower the confidence threshold
2. Re-enroll the fingerprint
3. Ensure the same finger is being used
4. Check for sensor degradation
5. Verify the template data is not corrupted

### Identification is Slow

**Problem**: 1:N identification takes too long.

**Solutions**:
1. Reduce the database size if possible
2. Implement database indexing
3. Use verification (1:1) instead when possible
4. Optimize your database queries
5. Consider hardware upgrades

## WebSocket Issues

### Connection Drops

**Problem**: WebSocket connection disconnects frequently.

**Solutions**:
1. Implement automatic reconnection logic
2. Check network stability
3. Increase connection timeout
4. Use heartbeat/ping messages
5. Review firewall and proxy settings

### Events Not Received

**Problem**: Not receiving real-time events via WebSocket.

**Solutions**:
1. Verify WebSocket connection is established
2. Check event subscription is correct
3. Review event filtering settings
4. Ensure proper authentication
5. Check for JavaScript errors in console

## Performance Issues

### High Memory Usage

**Problem**: Service consumes excessive memory.

**Solutions**:
1. Restart the service periodically
2. Reduce cache sizes
3. Limit concurrent operations
4. Check for memory leaks in custom code
5. Upgrade system RAM if needed

### High CPU Usage

**Problem**: Service uses too much CPU.

**Solutions**:
1. Reduce polling frequency
2. Optimize database queries
3. Limit concurrent fingerprint operations
4. Check for infinite loops in event handlers
5. Profile the application to find bottlenecks

## Database Issues

### Corrupted Database

**Problem**: Database file is corrupted or unreadable.

**Solutions**:
1. Restore from backup
2. Use database repair tools
3. Re-initialize the database
4. Check disk space and health
5. Implement regular backups

### Slow Queries

**Problem**: Database operations are slow.

**Solutions**:
1. Add indexes to frequently queried fields
2. Optimize query structure
3. Reduce database size
4. Use connection pooling
5. Consider database migration

## Getting Help

If you continue to experience issues:

1. Check the [API Reference](./api-reference/rest-api.md) for correct usage
2. Review the [Best Practices Guide](./guides/best-practices.md)
3. Enable debug logging for more details
4. Check the GitHub issues for similar problems
5. Contact support with detailed error logs

## Diagnostic Commands

### Check Service Status

```bash
# Windows
sc query FingerprintService

# Linux
systemctl status fingerprint-service
```

### View Logs

```bash
# Check service logs
tail -f /var/log/fingerprint-service.log

# Windows Event Viewer
eventvwr.msc
```

### Test Device Connection

```bash
# Use the API to check device status
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/devices
```

## Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 1001 | Device not found | Check device connection |
| 1002 | Device busy | Wait and retry |
| 2001 | Capture failed | Clean sensor and retry |
| 2002 | Low quality | Improve finger placement |
| 3001 | Template not found | Verify user ID |
| 3002 | Match failed | Lower threshold or re-enroll |
| 4001 | Database error | Check database connection |
| 5001 | Invalid API key | Verify authentication |

For a complete list of error codes, see the [Error Codes Reference](./api-reference/error-codes.md).
