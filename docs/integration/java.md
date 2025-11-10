---
sidebar_position: 10
title: Java Integration
description: Complete guide for integrating the Fingerprint Service with Java
---

# Java Integration

## Overview

This guide demonstrates how to integrate the Fingerprint Service API into Java applications using modern HTTP clients (HttpClient or OkHttp). We'll create a robust API client with builder patterns, proper error handling, and strongly-typed POJOs.

## Prerequisites

- Java 11 or higher (Java 17+ recommended)
- Maven or Gradle build tool
- Fingerprint Service running and accessible

## Installation

### Maven Dependencies

Add to your `pom.xml`:

```xml
<dependencies>
    <!-- Java 11+ HttpClient (built-in) -->
    
    <!-- Or use OkHttp -->
    <dependency>
        <groupId>com.squareup.okhttp3</groupId>
        <artifactId>okhttp</artifactId>
        <version>4.12.0</version>
    </dependency>

    <!-- JSON processing -->
    <dependency>
        <groupId>com.google.code.gson</groupId>
        <artifactId>gson</artifactId>
        <version>2.10.1</version>
    </dependency>

    <!-- Logging -->
    <dependency>
        <groupId>org.slf4j</groupId>
        <artifactId>slf4j-api</artifactId>
        <version>2.0.9</version>
    </dependency>
    <dependency>
        <groupId>ch.qos.logback</groupId>
        <artifactId>logback-classic</artifactId>
        <version>1.4.11</version>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.10.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Gradle Dependencies

Add to your `build.gradle`:

```gradle
dependencies {
    // OkHttp
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    
    // JSON processing
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Logging
    implementation 'org.slf4j:slf4j-api:2.0.9'
    implementation 'ch.qos.logback:logback-classic:1.4.11'
    
    // Testing
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'
}
```

## Implementation

### Models (POJOs)

Create `models/DeviceInfo.java`:

```java
package com.example.fingerprint.models;

import com.google.gson.annotations.SerializedName;

public class DeviceInfo {
    @SerializedName("id")
    private String id;

    @SerializedName("name")
    private String name;

    @SerializedName("status")
    private String status;

    @SerializedName("serialNumber")
    private String serialNumber;

    // Constructors
    public DeviceInfo() {}

    public DeviceInfo(String id, String name, String status) {
        this.id = id;
        this.name = name;
        this.status = status;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

    @Override
    public String toString() {
        return "DeviceInfo{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", status='" + status + '\'' +
                '}';
    }
}
```

Create `models/EnrollmentRequest.java`:

```java
package com.example.fingerprint.models;

import com.google.gson.annotations.SerializedName;
import java.util.Map;

public class EnrollmentRequest {
    @SerializedName("deviceId")
    private String deviceId;

    @SerializedName("userId")
    private String userId;

    @SerializedName("metadata")
    private Map<String, Object> metadata;

    // Constructors
    public EnrollmentRequest() {}

    public EnrollmentRequest(String deviceId, String userId) {
        this.deviceId = deviceId;
        this.userId = userId;
    }

    public EnrollmentRequest(String deviceId, String userId, Map<String, Object> metadata) {
        this.deviceId = deviceId;
        this.userId = userId;
        this.metadata = metadata;
    }

    // Getters and Setters
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}
```

Create `models/EnrollmentResult.java`:

```java
package com.example.fingerprint.models;

import com.google.gson.annotations.SerializedName;

public class EnrollmentResult {
    @SerializedName("template")
    private String template;

    @SerializedName("quality")
    private int quality;

    @SerializedName("deviceId")
    private String deviceId;

    // Constructors
    public EnrollmentResult() {}

    // Getters and Setters
    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }

    public int getQuality() { return quality; }
    public void setQuality(int quality) { this.quality = quality; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    @Override
    public String toString() {
        return "EnrollmentResult{" +
                "quality=" + quality +
                ", deviceId='" + deviceId + '\'' +
                '}';
    }
}
```

Create `models/VerificationRequest.java`:

```java
package com.example.fingerprint.models;

import com.google.gson.annotations.SerializedName;

public class VerificationRequest {
    @SerializedName("template")
    private String template;

    @SerializedName("userId")
    private String userId;

    @SerializedName("deviceId")
    private String deviceId;

    // Constructors
    public VerificationRequest() {}

    public VerificationRequest(String template, String userId, String deviceId) {
        this.template = template;
        this.userId = userId;
        this.deviceId = deviceId;
    }

    // Getters and Setters
    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
}
```

Create `models/VerificationResult.java`:

```java
package com.example.fingerprint.models;

import com.google.gson.annotations.SerializedName;

public class VerificationResult {
    @SerializedName("match")
    private boolean match;

    @SerializedName("confidence")
    private double confidence;

    @SerializedName("userId")
    private String userId;

    // Constructors
    public VerificationResult() {}

    // Getters and Setters
    public boolean isMatch() { return match; }
    public void setMatch(boolean match) { this.match = match; }

    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    @Override
    public String toString() {
        return "VerificationResult{" +
                "match=" + match +
                ", confidence=" + confidence +
                ", userId='" + userId + '\'' +
                '}';
    }
}
```

Create `models/ScanSession.java`:

```java
package com.example.fingerprint.models;

import com.google.gson.annotations.SerializedName;

public class ScanSession {
    @SerializedName("scanId")
    private String scanId;

    @SerializedName("deviceId")
    private String deviceId;

    @SerializedName("status")
    private String status;

    // Constructors
    public ScanSession() {}

    // Getters and Setters
    public String getScanId() { return scanId; }
    public void setScanId(String scanId) { this.scanId = scanId; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
```

Create `models/ScanStatus.java`:

```java
package com.example.fingerprint.models;

import com.google.gson.annotations.SerializedName;

public class ScanStatus {
    @SerializedName("scanId")
    private String scanId;

    @SerializedName("status")
    private String status;

    @SerializedName("template")
    private String template;

    @SerializedName("quality")
    private Integer quality;

    @SerializedName("error")
    private String error;

    // Constructors
    public ScanStatus() {}

    // Getters and Setters
    public String getScanId() { return scanId; }
    public void setScanId(String scanId) { this.scanId = scanId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTemplate() { return template; }
    public void setTemplate(String template) { this.template = template; }

    public Integer getQuality() { return quality; }
    public void setQuality(Integer quality) { this.quality = quality; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}
```

### Custom Exceptions

Create `exceptions/FingerprintException.java`:

```java
package com.example.fingerprint.exceptions;

public class FingerprintException extends Exception {
    private String errorCode;

    public FingerprintException(String message) {
        super(message);
    }

    public FingerprintException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    public FingerprintException(String message, Throwable cause) {
        super(message, cause);
    }

    public String getErrorCode() {
        return errorCode;
    }
}
```

Create `exceptions/DeviceException.java`:

```java
package com.example.fingerprint.exceptions;

public class DeviceException extends FingerprintException {
    public DeviceException(String message) {
        super(message);
    }

    public DeviceException(String message, String errorCode) {
        super(message, errorCode);
    }
}
```

Create `exceptions/FingerprintQualityException.java`:

```java
package com.example.fingerprint.exceptions;

public class FingerprintQualityException extends FingerprintException {
    private int quality;

    public FingerprintQualityException(String message, int quality) {
        super(message);
        this.quality = quality;
    }

    public int getQuality() {
        return quality;
    }
}
```

### API Client with OkHttp

Create `FingerprintApiClient.java`:

```java
package com.example.fingerprint;

import com.example.fingerprint.exceptions.*;
import com.example.fingerprint.models.*;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class FingerprintApiClient implements AutoCloseable {
    private static final Logger logger = LoggerFactory.getLogger(FingerprintApiClient.class);
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    private final OkHttpClient httpClient;
    private final String baseUrl;
    private final String apiKey;
    private final Gson gson;

    private FingerprintApiClient(Builder builder) {
        this.baseUrl = builder.baseUrl.replaceAll("/$", "");
        this.apiKey = builder.apiKey;
        this.gson = new GsonBuilder().create();

        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(builder.timeoutSeconds, TimeUnit.SECONDS)
                .readTimeout(builder.timeoutSeconds, TimeUnit.SECONDS)
                .writeTimeout(builder.timeoutSeconds, TimeUnit.SECONDS)
                .addInterceptor(chain -> {
                    Request original = chain.request();
                    Request request = original.newBuilder()
                            .header("X-API-Key", apiKey)
                            .header("Accept", "application/json")
                            .header("Content-Type", "application/json")
                            .method(original.method(), original.body())
                            .build();
                    return chain.proceed(request);
                })
                .build();
    }

    /**
     * Builder for FingerprintApiClient
     */
    public static class Builder {
        private String baseUrl = "http://localhost:8080";
        private String apiKey;
        private int timeoutSeconds = 30;

        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }

        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }

        public Builder timeout(int seconds) {
            this.timeoutSeconds = seconds;
            return this;
        }

        public FingerprintApiClient build() {
            if (apiKey == null || apiKey.isEmpty()) {
                throw new IllegalArgumentException("API key is required");
            }
            return new FingerprintApiClient(this);
        }
    }

    /**
     * List all connected fingerprint devices
     */
    public List<DeviceInfo> listDevices() throws FingerprintException {
        logger.info("Listing devices");

        Request request = new Request.Builder()
                .url(baseUrl + "/api/devices")
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            ensureSuccess(response, responseBody);

            Type listType = new TypeToken<List<DeviceInfo>>(){}.getType();
            return gson.fromJson(responseBody, listType);
        } catch (IOException e) {
            throw new FingerprintException("Failed to list devices", e);
        }
    }

    /**
     * Get information about a specific device
     */
    public DeviceInfo getDeviceInfo(String deviceId) throws FingerprintException {
        if (deviceId == null || deviceId.isEmpty()) {
            throw new IllegalArgumentException("Device ID cannot be null or empty");
        }

        logger.info("Getting device info for {}", deviceId);

        Request request = new Request.Builder()
                .url(baseUrl + "/api/devices/" + deviceId + "/info")
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            ensureSuccess(response, responseBody);

            return gson.fromJson(responseBody, DeviceInfo.class);
        } catch (IOException e) {
            throw new FingerprintException("Failed to get device info", e);
        }
    }

    /**
     * Test device connection
     */
    public boolean testDevice(String deviceId) throws FingerprintException {
        if (deviceId == null || deviceId.isEmpty()) {
            throw new IllegalArgumentException("Device ID cannot be null or empty");
        }

        logger.info("Testing device {}", deviceId);

        Request request = new Request.Builder()
                .url(baseUrl + "/api/devices/" + deviceId + "/test")
                .post(RequestBody.create("", JSON))
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            return response.isSuccessful();
        } catch (IOException e) {
            throw new FingerprintException("Failed to test device", e);
        }
    }

    /**
     * Enroll a new fingerprint
     */
    public EnrollmentResult enrollFingerprint(EnrollmentRequest enrollmentRequest) 
            throws FingerprintException {
        if (enrollmentRequest == null) {
            throw new IllegalArgumentException("Enrollment request cannot be null");
        }

        logger.info("Enrolling fingerprint for user {}", enrollmentRequest.getUserId());

        String json = gson.toJson(enrollmentRequest);
        RequestBody body = RequestBody.create(json, JSON);

        Request request = new Request.Builder()
                .url(baseUrl + "/api/fingerprint/enroll")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            ensureSuccess(response, responseBody);

            return gson.fromJson(responseBody, EnrollmentResult.class);
        } catch (IOException e) {
            throw new FingerprintException("Failed to enroll fingerprint", e);
        }
    }

    /**
     * Verify fingerprint (1:1 matching)
     */
    public VerificationResult verifyFingerprint(VerificationRequest verificationRequest) 
            throws FingerprintException {
        if (verificationRequest == null) {
            throw new IllegalArgumentException("Verification request cannot be null");
        }

        logger.info("Verifying fingerprint for user {}", verificationRequest.getUserId());

        String json = gson.toJson(verificationRequest);
        RequestBody body = RequestBody.create(json, JSON);

        Request request = new Request.Builder()
                .url(baseUrl + "/api/fingerprint/verify")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            ensureSuccess(response, responseBody);

            return gson.fromJson(responseBody, VerificationResult.class);
        } catch (IOException e) {
            throw new FingerprintException("Failed to verify fingerprint", e);
        }
    }

    /**
     * Identify fingerprint (1:N matching)
     */
    public VerificationResult identifyFingerprint(String template, String deviceId) 
            throws FingerprintException {
        if (template == null || template.isEmpty()) {
            throw new IllegalArgumentException("Template cannot be null or empty");
        }
        if (deviceId == null || deviceId.isEmpty()) {
            throw new IllegalArgumentException("Device ID cannot be null or empty");
        }

        logger.info("Identifying fingerprint");

        IdentificationRequest identificationRequest = new IdentificationRequest(template, deviceId);
        String json = gson.toJson(identificationRequest);
        RequestBody body = RequestBody.create(json, JSON);

        Request request = new Request.Builder()
                .url(baseUrl + "/api/fingerprint/identify")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            ensureSuccess(response, responseBody);

            return gson.fromJson(responseBody, VerificationResult.class);
        } catch (IOException e) {
            throw new FingerprintException("Failed to identify fingerprint", e);
        }
    }

    /**
     * Start a fingerprint scan session
     */
    public ScanSession startScan(String deviceId) throws FingerprintException {
        logger.info("Starting scan session");

        HttpUrl.Builder urlBuilder = HttpUrl.parse(baseUrl + "/api/fingerprint/scan/start").newBuilder();
        if (deviceId != null && !deviceId.isEmpty()) {
            urlBuilder.addQueryParameter("deviceId", deviceId);
        }

        Request request = new Request.Builder()
                .url(urlBuilder.build())
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            ensureSuccess(response, responseBody);

            return gson.fromJson(responseBody, ScanSession.class);
        } catch (IOException e) {
            throw new FingerprintException("Failed to start scan", e);
        }
    }

    /**
     * Get the status of a scan session
     */
    public ScanStatus getScanStatus(String scanId) throws FingerprintException {
        if (scanId == null || scanId.isEmpty()) {
            throw new IllegalArgumentException("Scan ID cannot be null or empty");
        }

        Request request = new Request.Builder()
                .url(baseUrl + "/api/fingerprint/scan/status/" + scanId)
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            ensureSuccess(response, responseBody);

            return gson.fromJson(responseBody, ScanStatus.class);
        } catch (IOException e) {
            throw new FingerprintException("Failed to get scan status", e);
        }
    }

    /**
     * Wait for scan completion with polling
     */
    public ScanStatus waitForScan(String scanId, int maxWaitSeconds, int pollIntervalMs) 
            throws FingerprintException {
        if (scanId == null || scanId.isEmpty()) {
            throw new IllegalArgumentException("Scan ID cannot be null or empty");
        }

        logger.info("Waiting for scan {} to complete", scanId);

        long startTime = System.currentTimeMillis();
        long maxWaitMs = maxWaitSeconds * 1000L;

        while (System.currentTimeMillis() - startTime < maxWaitMs) {
            ScanStatus status = getScanStatus(scanId);

            if ("complete".equals(status.getStatus())) {
                logger.info("Scan {} completed", scanId);
                return status;
            }

            if ("error".equals(status.getStatus())) {
                String errorMsg = status.getError() != null ? status.getError() : "Unknown error";
                logger.error("Scan {} failed: {}", scanId, errorMsg);
                throw new FingerprintException("Scan failed: " + errorMsg);
            }

            try {
                Thread.sleep(pollIntervalMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new FingerprintException("Scan wait interrupted", e);
            }
        }

        logger.error("Scan {} timed out", scanId);
        throw new FingerprintException("Scan timeout");
    }

    /**
     * Wait for scan with default parameters
     */
    public ScanStatus waitForScan(String scanId) throws FingerprintException {
        return waitForScan(scanId, 30, 500);
    }

    /**
     * Ensure HTTP response is successful
     */
    private void ensureSuccess(Response response, String responseBody) throws FingerprintException {
        if (response.isSuccessful()) {
            return;
        }

        String message = "HTTP " + response.code();
        String errorCode = String.valueOf(response.code());

        try {
            ApiErrorResponse errorResponse = gson.fromJson(responseBody, ApiErrorResponse.class);
            if (errorResponse != null && errorResponse.getError() != null) {
                message = errorResponse.getError().getMessage();
                errorCode = errorResponse.getError().getCode();
            }
        } catch (Exception e) {
            // Ignore JSON parsing errors
        }

        logger.error("API request failed: {} (Code: {})", message, errorCode);
        throw new FingerprintException(message, errorCode);
    }

    @Override
    public void close() {
        if (httpClient != null) {
            httpClient.dispatcher().executorService().shutdown();
            httpClient.connectionPool().evictAll();
        }
    }

    // Helper classes
    private static class IdentificationRequest {
        @com.google.gson.annotations.SerializedName("template")
        private String template;

        @com.google.gson.annotations.SerializedName("deviceId")
        private String deviceId;

        public IdentificationRequest(String template, String deviceId) {
            this.template = template;
            this.deviceId = deviceId;
        }
    }

    private static class ApiErrorResponse {
        @com.google.gson.annotations.SerializedName("error")
        private ApiError error;

        public ApiError getError() {
            return error;
        }
    }

    private static class ApiError {
        @com.google.gson.annotations.SerializedName("message")
        private String message;

        @com.google.gson.annotations.SerializedName("code")
        private String code;

        public String getMessage() {
            return message;
        }

        public String getCode() {
            return code;
        }
    }
}
```

## Usage Examples

### Basic Enrollment Flow

```java
package com.example.fingerprint;

import com.example.fingerprint.exceptions.FingerprintException;
import com.example.fingerprint.models.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class EnrollmentExample {
    private static final Logger logger = LoggerFactory.getLogger(EnrollmentExample.class);

    public static void main(String[] args) {
        // Create client using builder pattern
        try (FingerprintApiClient client = new FingerprintApiClient.Builder()
                .baseUrl("http://localhost:8080")
                .apiKey("your-api-key-here")
                .timeout(30)
                .build()) {

            // List available devices
            List<DeviceInfo> devices = client.listDevices();
            if (devices.isEmpty()) {
                logger.warn("No devices connected");
                return;
            }

            String deviceId = devices.get(0).getId();
            logger.info("Using device: {}", deviceId);

            // Prepare enrollment request
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("name", "John Doe");
            metadata.put("department", "Engineering");
            metadata.put("email", "john.doe@example.com");

            EnrollmentRequest request = new EnrollmentRequest(
                    deviceId,
                    "user-12345",
                    metadata
            );

            // Enroll fingerprint
            logger.info("Starting enrollment...");
            EnrollmentResult result = client.enrollFingerprint(request);

            logger.info("Enrollment successful!");
            logger.info("Quality: {}", result.getQuality());
            logger.info("Template: {}...", result.getTemplate().substring(0, 50));

            // Store the template in your database
            // saveToDatabase(result);

        } catch (FingerprintException e) {
            logger.error("Fingerprint Error: {} (Code: {})", e.getMessage(), e.getErrorCode());
        } catch (Exception e) {
            logger.error("Error: {}", e.getMessage(), e);
        }
    }
}
```

### Verification Flow

```java
package com.example.fingerprint;

import com.example.fingerprint.exceptions.FingerprintException;
import com.example.fingerprint.models.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class VerificationExample {
    private static final Logger logger = LoggerFactory.getLogger(VerificationExample.class);

    public static void main(String[] args) {
        try (FingerprintApiClient client = new FingerprintApiClient.Builder()
                .baseUrl("http://localhost:8080")
                .apiKey("your-api-key-here")
                .build()) {

            String deviceId = "device-001";
            String userId = "user-12345";

            // Get user's stored template from database
            // String storedTemplate = getTemplateFromDatabase(userId);

            // Start scan
            logger.info("Place finger on scanner...");
            ScanSession scan = client.startScan(deviceId);

            // Wait for scan completion
            ScanStatus scanResult = client.waitForScan(scan.getScanId());
            logger.info("Scan complete. Quality: {}", scanResult.getQuality());

            // Verify against stored template
            VerificationRequest request = new VerificationRequest(
                    scanResult.getTemplate(),
                    userId,
                    deviceId
            );

            VerificationResult verification = client.verifyFingerprint(request);

            if (verification.isMatch()) {
                logger.info("✓ Verification successful!");
                logger.info("Confidence: {}%", verification.getConfidence());
                // Grant access
            } else {
                logger.info("✗ Verification failed");
                // Deny access
            }

        } catch (FingerprintException e) {
            logger.error("Fingerprint Error: {}", e.getMessage());
        } catch (Exception e) {
            logger.error("Error: {}", e.getMessage(), e);
        }
    }
}
```

### Identification Flow

```java
package com.example.fingerprint;

import com.example.fingerprint.exceptions.FingerprintException;
import com.example.fingerprint.models.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class IdentificationExample {
    private static final Logger logger = LoggerFactory.getLogger(IdentificationExample.class);

    public static void main(String[] args) {
        try (FingerprintApiClient client = new FingerprintApiClient.Builder()
                .baseUrl("http://localhost:8080")
                .apiKey("your-api-key-here")
                .build()) {

            String deviceId = "device-001";

            // Start scan
            logger.info("Place finger on scanner...");
            ScanSession scan = client.startScan(deviceId);

            // Wait for scan completion
            ScanStatus scanResult = client.waitForScan(scan.getScanId());
            logger.info("Scan complete. Quality: {}", scanResult.getQuality());

            // Identify user
            VerificationResult identification = client.identifyFingerprint(
                    scanResult.getTemplate(),
                    deviceId
            );

            if (identification.isMatch()) {
                logger.info("✓ User identified!");
                logger.info("User ID: {}", identification.getUserId());
                logger.info("Confidence: {}%", identification.getConfidence());

                // Load user details from database
                // User user = getUserFromDatabase(identification.getUserId());
                // logger.info("Welcome, {}!", user.getName());
            } else {
                logger.info("✗ User not found in database");
            }

        } catch (FingerprintException e) {
            logger.error("Fingerprint Error: {}", e.getMessage());
        } catch (Exception e) {
            logger.error("Error: {}", e.getMessage(), e);
        }
    }
}
```


## Error Handling

### Retry Helper

Create `helpers/RetryHelper.java`:

```java
package com.example.fingerprint.helpers;

import com.example.fingerprint.exceptions.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.function.Supplier;

public class RetryHelper {
    private static final Logger logger = LoggerFactory.getLogger(RetryHelper.class);

    /**
     * Execute operation with retry logic
     */
    public static <T> T executeWithRetry(
            Supplier<T> operation,
            int maxRetries,
            int initialDelayMs,
            double backoffMultiplier) throws FingerprintException {

        int delay = initialDelayMs;
        FingerprintException lastException = null;

        for (int attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return operation.get();
            } catch (FingerprintQualityException e) {
                logger.warn("Low quality scan (attempt {}/{}). Please try again.",
                        attempt + 1, maxRetries);
                lastException = e;

                if (attempt < maxRetries - 1) {
                    sleep(delay);
                    delay = (int) (delay * backoffMultiplier);
                }
            } catch (DeviceException e) {
                // Don't retry device errors
                throw e;
            } catch (FingerprintException e) {
                logger.warn("Operation failed (attempt {}/{}): {}",
                        attempt + 1, maxRetries, e.getMessage());
                lastException = e;

                if (attempt < maxRetries - 1) {
                    sleep(delay);
                    delay = (int) (delay * backoffMultiplier);
                }
            }
        }

        throw lastException != null ? lastException :
                new FingerprintException("Max retries exceeded");
    }

    /**
     * Execute with default retry parameters
     */
    public static <T> T executeWithRetry(Supplier<T> operation) throws FingerprintException {
        return executeWithRetry(operation, 3, 1000, 2.0);
    }

    private static void sleep(int milliseconds) {
        try {
            Thread.sleep(milliseconds);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

### Usage with Retry

```java
import com.example.fingerprint.helpers.RetryHelper;

try (FingerprintApiClient client = new FingerprintApiClient.Builder()
        .baseUrl("http://localhost:8080")
        .apiKey("your-api-key-here")
        .build()) {

    EnrollmentRequest request = new EnrollmentRequest("device-001", "user-123");

    EnrollmentResult result = RetryHelper.executeWithRetry(
            () -> {
                try {
                    return client.enrollFingerprint(request);
                } catch (FingerprintException e) {
                    throw new RuntimeException(e);
                }
            },
            3,      // max retries
            1000,   // initial delay ms
            2.0     // backoff multiplier
    );

    logger.info("Enrollment successful! Quality: {}", result.getQuality());

} catch (FingerprintException e) {
    logger.error("Enrollment failed: {}", e.getMessage());
}
```

## Quality Validation

### Validator Class

Create `validators/FingerprintValidator.java`:

```java
package com.example.fingerprint.validators;

import com.example.fingerprint.exceptions.FingerprintQualityException;
import com.example.fingerprint.models.*;

public class FingerprintValidator {
    private static final int MIN_ENROLLMENT_QUALITY = 60;
    private static final int MIN_VERIFICATION_QUALITY = 50;
    private static final double MIN_CONFIDENCE = 80.0;

    /**
     * Validate enrollment quality
     */
    public static void validateEnrollmentQuality(EnrollmentResult result)
            throws FingerprintQualityException {
        if (result.getQuality() < MIN_ENROLLMENT_QUALITY) {
            throw new FingerprintQualityException(
                    String.format("Quality too low for enrollment: %d (minimum: %d)",
                            result.getQuality(), MIN_ENROLLMENT_QUALITY),
                    result.getQuality()
            );
        }
    }

    /**
     * Validate verification quality
     */
    public static void validateVerificationQuality(ScanStatus scanResult)
            throws FingerprintQualityException {
        if (scanResult.getQuality() != null &&
                scanResult.getQuality() < MIN_VERIFICATION_QUALITY) {
            throw new FingerprintQualityException(
                    String.format("Quality too low for verification: %d (minimum: %d)",
                            scanResult.getQuality(), MIN_VERIFICATION_QUALITY),
                    scanResult.getQuality()
            );
        }
    }

    /**
     * Validate confidence score
     */
    public static void validateConfidence(VerificationResult result)
            throws FingerprintQualityException {
        validateConfidence(result, MIN_CONFIDENCE);
    }

    /**
     * Validate confidence score with custom threshold
     */
    public static void validateConfidence(VerificationResult result, double minConfidence)
            throws FingerprintQualityException {
        if (result.getConfidence() < minConfidence) {
            throw new FingerprintQualityException(
                    String.format("Confidence too low: %.2f%% (minimum: %.2f%%)",
                            result.getConfidence(), minConfidence),
                    (int) result.getConfidence()
            );
        }
    }
}
```

### Usage with Validation

```java
import com.example.fingerprint.validators.FingerprintValidator;

try {
    EnrollmentResult result = client.enrollFingerprint(request);
    FingerprintValidator.validateEnrollmentQuality(result);
    logger.info("Enrollment successful with good quality!");
} catch (FingerprintQualityException e) {
    logger.error("Quality check failed: {}", e.getMessage());
}
```

## Complete Example: Authentication System

### Database Manager

Create `database/FingerprintDatabase.java`:

```java
package com.example.fingerprint.database;

import java.sql.*;
import java.util.Optional;

public class FingerprintDatabase implements AutoCloseable {
    private final Connection connection;

    public FingerprintDatabase(String jdbcUrl) throws SQLException {
        this.connection = DriverManager.getConnection(jdbcUrl);
        createTables();
    }

    private void createTables() throws SQLException {
        try (Statement stmt = connection.createStatement()) {
            // Users table
            stmt.execute(
                    "CREATE TABLE IF NOT EXISTS users (" +
                            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                            "username TEXT UNIQUE NOT NULL, " +
                            "email TEXT NOT NULL, " +
                            "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
            );

            // Fingerprint templates table
            stmt.execute(
                    "CREATE TABLE IF NOT EXISTS fingerprint_templates (" +
                            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                            "user_id INTEGER NOT NULL, " +
                            "template TEXT NOT NULL, " +
                            "quality INTEGER NOT NULL, " +
                            "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                            "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)"
            );

            // Authentication logs table
            stmt.execute(
                    "CREATE TABLE IF NOT EXISTS auth_logs (" +
                            "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                            "user_id INTEGER, " +
                            "confidence REAL, " +
                            "success BOOLEAN NOT NULL, " +
                            "timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                            "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)"
            );
        }
    }

    public int createUser(String username, String email) throws SQLException {
        String sql = "INSERT INTO users (username, email) VALUES (?, ?)";
        try (PreparedStatement stmt = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, username);
            stmt.setString(2, email);
            stmt.executeUpdate();

            try (ResultSet rs = stmt.getGeneratedKeys()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        }
        throw new SQLException("Failed to create user");
    }

    public Optional<User> getUser(int userId) throws SQLException {
        String sql = "SELECT * FROM users WHERE id = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, userId);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(new User(
                            rs.getInt("id"),
                            rs.getString("username"),
                            rs.getString("email")
                    ));
                }
            }
        }
        return Optional.empty();
    }

    public void saveTemplate(int userId, String template, int quality) throws SQLException {
        String sql = "INSERT INTO fingerprint_templates (user_id, template, quality) VALUES (?, ?, ?)";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, userId);
            stmt.setString(2, template);
            stmt.setInt(3, quality);
            stmt.executeUpdate();
        }
    }

    public Optional<FingerprintTemplate> getTemplate(int userId) throws SQLException {
        String sql = "SELECT * FROM fingerprint_templates WHERE user_id = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setInt(1, userId);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(new FingerprintTemplate(
                            rs.getInt("id"),
                            rs.getInt("user_id"),
                            rs.getString("template"),
                            rs.getInt("quality")
                    ));
                }
            }
        }
        return Optional.empty();
    }

    public void logAuthAttempt(Integer userId, boolean success, Double confidence) throws SQLException {
        String sql = "INSERT INTO auth_logs (user_id, success, confidence) VALUES (?, ?, ?)";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            if (userId != null) {
                stmt.setInt(1, userId);
            } else {
                stmt.setNull(1, Types.INTEGER);
            }
            stmt.setBoolean(2, success);
            if (confidence != null) {
                stmt.setDouble(3, confidence);
            } else {
                stmt.setNull(3, Types.DOUBLE);
            }
            stmt.executeUpdate();
        }
    }

    @Override
    public void close() throws SQLException {
        if (connection != null && !connection.isClosed()) {
            connection.close();
        }
    }

    // Helper classes
    public static class User {
        private final int id;
        private final String username;
        private final String email;

        public User(int id, String username, String email) {
            this.id = id;
            this.username = username;
            this.email = email;
        }

        public int getId() { return id; }
        public String getUsername() { return username; }
        public String getEmail() { return email; }
    }

    public static class FingerprintTemplate {
        private final int id;
        private final int userId;
        private final String template;
        private final int quality;

        public FingerprintTemplate(int id, int userId, String template, int quality) {
            this.id = id;
            this.userId = userId;
            this.template = template;
            this.quality = quality;
        }

        public int getId() { return id; }
        public int getUserId() { return userId; }
        public String getTemplate() { return template; }
        public int getQuality() { return quality; }
    }
}
```

### Authentication System

Create `auth/FingerprintAuthSystem.java`:

```java
package com.example.fingerprint.auth;

import com.example.fingerprint.FingerprintApiClient;
import com.example.fingerprint.database.FingerprintDatabase;
import com.example.fingerprint.database.FingerprintDatabase.User;
import com.example.fingerprint.exceptions.FingerprintException;
import com.example.fingerprint.models.*;
import com.example.fingerprint.validators.FingerprintValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class FingerprintAuthSystem {
    private static final Logger logger = LoggerFactory.getLogger(FingerprintAuthSystem.class);

    private final FingerprintApiClient client;
    private final FingerprintDatabase database;

    public FingerprintAuthSystem(FingerprintApiClient client, FingerprintDatabase database) {
        this.client = client;
        this.database = database;
    }

    /**
     * Register new user with fingerprint
     */
    public User registerUser(String username, String email, String deviceId)
            throws FingerprintException, SQLException {

        // Create user in database
        int userId = database.createUser(username, email);

        try {
            // Enroll fingerprint
            logger.info("Enrolling fingerprint for user {}", username);

            Map<String, Object> metadata = new HashMap<>();
            metadata.put("username", username);
            metadata.put("email", email);

            EnrollmentRequest request = new EnrollmentRequest(
                    deviceId,
                    "user-" + userId,
                    metadata
            );

            EnrollmentResult result = client.enrollFingerprint(request);

            // Validate quality
            FingerprintValidator.validateEnrollmentQuality(result);

            // Store template
            database.saveTemplate(userId, result.getTemplate(), result.getQuality());

            logger.info("User {} registered successfully! Quality: {}",
                    username, result.getQuality());

            return database.getUser(userId).orElseThrow(
                    () -> new SQLException("Failed to retrieve created user")
            );

        } catch (FingerprintException e) {
            // Rollback user creation if enrollment fails
            logger.error("Enrollment failed, rolling back user creation");
            throw e;
        }
    }

    /**
     * Authenticate user with fingerprint
     */
    public Optional<User> authenticateUser(String deviceId)
            throws FingerprintException, SQLException {

        try {
            // Start scan
            logger.info("Place finger on scanner...");
            ScanSession scan = client.startScan(deviceId);

            // Wait for scan completion
            ScanStatus scanResult = client.waitForScan(scan.getScanId());
            logger.info("Scan complete. Quality: {}", scanResult.getQuality());

            // Identify user
            VerificationResult identification = client.identifyFingerprint(
                    scanResult.getTemplate(),
                    deviceId
            );

            if (!identification.isMatch()) {
                logger.info("User not found");
                database.logAuthAttempt(null, false, null);
                return Optional.empty();
            }

            // Extract user ID from service user ID format
            String serviceUserId = identification.getUserId();
            int userId = Integer.parseInt(serviceUserId.replace("user-", ""));

            // Load user from database
            Optional<User> userOpt = database.getUser(userId);

            if (userOpt.isEmpty()) {
                logger.warn("User not found in database");
                return Optional.empty();
            }

            User user = userOpt.get();

            // Log successful authentication
            database.logAuthAttempt(userId, true, identification.getConfidence());

            logger.info("Welcome, {}! Confidence: {}%",
                    user.getUsername(), identification.getConfidence());

            return Optional.of(user);

        } catch (FingerprintException e) {
            logger.error("Authentication failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Verify specific user's fingerprint
     */
    public boolean verifyUser(int userId, String deviceId)
            throws FingerprintException, SQLException {

        Optional<FingerprintDatabase.FingerprintTemplate> templateOpt =
                database.getTemplate(userId);

        if (templateOpt.isEmpty()) {
            logger.warn("User does not have a fingerprint enrolled");
            return false;
        }

        try {
            // Start scan
            logger.info("Place finger on scanner...");
            ScanSession scan = client.startScan(deviceId);

            // Wait for scan completion
            ScanStatus scanResult = client.waitForScan(scan.getScanId());

            // Verify fingerprint
            VerificationRequest request = new VerificationRequest(
                    scanResult.getTemplate(),
                    "user-" + userId,
                    deviceId
            );

            VerificationResult verification = client.verifyFingerprint(request);

            // Log verification attempt
            database.logAuthAttempt(userId, verification.isMatch(),
                    verification.getConfidence());

            if (verification.isMatch()) {
                logger.info("Verification successful! Confidence: {}%",
                        verification.getConfidence());
                return true;
            } else {
                logger.info("Verification failed");
                return false;
            }

        } catch (FingerprintException e) {
            logger.error("Verification error: {}", e.getMessage());
            return false;
        }
    }
}
```

### Main Application

```java
package com.example.fingerprint;

import com.example.fingerprint.auth.FingerprintAuthSystem;
import com.example.fingerprint.database.FingerprintDatabase;
import com.example.fingerprint.database.FingerprintDatabase.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

public class Main {
    private static final Logger logger = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) {
        try (FingerprintDatabase database = new FingerprintDatabase("jdbc:sqlite:fingerprints.db");
             FingerprintApiClient client = new FingerprintApiClient.Builder()
                     .baseUrl("http://localhost:8080")
                     .apiKey("your-api-key-here")
                     .build()) {

            FingerprintAuthSystem authSystem = new FingerprintAuthSystem(client, database);

            // Register new user
            logger.info("=== User Registration ===");
            User user = authSystem.registerUser(
                    "johndoe",
                    "john@example.com",
                    "device-001"
            );
            logger.info("User registered with ID: {}", user.getId());

            // Authenticate user
            logger.info("\n=== User Authentication ===");
            Optional<User> authenticatedUser = authSystem.authenticateUser("device-001");

            if (authenticatedUser.isPresent()) {
                logger.info("Logged in as: {}", authenticatedUser.get().getUsername());
            } else {
                logger.info("Authentication failed");
            }

        } catch (Exception e) {
            logger.error("Error: {}", e.getMessage(), e);
        }
    }
}
```

## Testing

### Unit Tests with JUnit 5

Create `FingerprintApiClientTest.java`:

```java
package com.example.fingerprint;

import com.example.fingerprint.exceptions.FingerprintException;
import com.example.fingerprint.models.*;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.*;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class FingerprintApiClientTest {
    private MockWebServer mockServer;
    private FingerprintApiClient client;

    @BeforeEach
    void setUp() throws IOException {
        mockServer = new MockWebServer();
        mockServer.start();

        client = new FingerprintApiClient.Builder()
                .baseUrl(mockServer.url("/").toString())
                .apiKey("test-api-key")
                .build();
    }

    @AfterEach
    void tearDown() throws IOException {
        client.close();
        mockServer.shutdown();
    }

    @Test
    void testListDevices() throws FingerprintException {
        mockServer.enqueue(new MockResponse()
                .setBody("[{\"id\":\"device-001\",\"name\":\"Test Device\",\"status\":\"connected\"}]")
                .addHeader("Content-Type", "application/json"));

        List<DeviceInfo> devices = client.listDevices();

        assertEquals(1, devices.size());
        assertEquals("device-001", devices.get(0).getId());
        assertEquals("Test Device", devices.get(0).getName());
    }

    @Test
    void testEnrollFingerprint() throws FingerprintException {
        mockServer.enqueue(new MockResponse()
                .setBody("{\"template\":\"base64-template\",\"quality\":85,\"deviceId\":\"device-001\"}")
                .addHeader("Content-Type", "application/json"));

        EnrollmentRequest request = new EnrollmentRequest("device-001", "user-123");
        EnrollmentResult result = client.enrollFingerprint(request);

        assertEquals(85, result.getQuality());
        assertEquals("base64-template", result.getTemplate());
    }

    @Test
    void testErrorHandling() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(400)
                .setBody("{\"error\":{\"message\":\"Device not found\",\"code\":\"DEVICE_NOT_FOUND\"}}")
                .addHeader("Content-Type", "application/json"));

        assertThrows(FingerprintException.class, () -> client.listDevices());
    }
}
```

## Best Practices

1. **Use builder pattern** for flexible object construction
2. **Implement AutoCloseable** for proper resource management
3. **Use strongly-typed POJOs** for type safety
4. **Validate quality scores** before storing templates
5. **Implement retry logic** for transient errors
6. **Log all operations** using SLF4J for debugging and auditing
7. **Store API keys securely** using configuration files or environment variables
8. **Use HTTPS** in production environments
9. **Implement proper exception handling** with custom exceptions
10. **Write comprehensive unit tests** using JUnit and MockWebServer

## Troubleshooting

### SSL Certificate Errors

```java
// Development only - bypass SSL validation
OkHttpClient client = new OkHttpClient.Builder()
        .hostnameVerifier((hostname, session) -> true)
        .build();
```

### Timeout Issues

```java
// Increase timeout
FingerprintApiClient client = new FingerprintApiClient.Builder()
        .baseUrl("http://localhost:8080")
        .apiKey("your-api-key")
        .timeout(60)  // 60 seconds
        .build();
```

### JSON Parsing Issues

```java
// Configure Gson with custom settings
Gson gson = new GsonBuilder()
        .setDateFormat("yyyy-MM-dd'T'HH:mm:ss")
        .serializeNulls()
        .create();
```

## Next Steps

- [PHP Integration](php.md) - PHP implementation
- [Python Integration](python.md) - Python implementation
- [API Reference](../api-reference/rest-api.md) - Complete API documentation
- [Best Practices](../guides/best-practices.md) - Security and optimization tips
- [Error Codes](../api-reference/error-codes.md) - Complete error code reference
