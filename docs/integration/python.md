---
sidebar_position: 8
title: Python Integration
description: Complete guide for integrating the Fingerprint Service with Python
---

# Python Integration

## Overview

This guide demonstrates how to integrate the Fingerprint Service API into Python applications using the `requests` library for synchronous operations and `aiohttp` for asynchronous operations. We'll create a robust API client with proper error handling, type hints, and context managers.

## Prerequisites

- Python 3.8 or higher (Python 3.10+ recommended)
- pip package manager
- Fingerprint Service running and accessible

## Installation

### Install Required Packages

```bash
# For synchronous client
pip install requests

# For async client (optional)
pip install aiohttp

# For type checking (optional)
pip install mypy
```

### Requirements File

Create `requirements.txt`:

```txt
requests>=2.31.0
aiohttp>=3.9.0
typing-extensions>=4.8.0
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Implementation 1: Synchronous Client

### API Client Class

Create a file `fingerprint_client.py`:

```python
"""
Fingerprint Service API Client for Python
"""

import time
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class FingerprintException(Exception):
    """Base exception for fingerprint operations"""
    
    def __init__(self, message: str, code: int = 0):
        self.message = message
        self.code = code
        super().__init__(self.message)


class FingerprintClient:
    """Synchronous API client for Fingerprint Service"""
    
    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: int = 30,
        max_retries: int = 3
    ):
        """
        Initialize the Fingerprint API client.
        
        Args:
            base_url: Base URL of the fingerprint service
            api_key: API key for authentication
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        
        # Create session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PUT", "DELETE"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set default headers
        self.session.headers.update({
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup resources"""
        self.close()
    
    def close(self) -> None:
        """Close the session and cleanup resources"""
        self.session.close()
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request to the API.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint path
            data: Request body data
            params: Query parameters
            
        Returns:
            Response data as dictionary
            
        Raises:
            FingerprintException: If request fails
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=self.timeout
            )
            
            # Check for HTTP errors
            if response.status_code >= 400:
                error_data = response.json() if response.content else {}
                message = error_data.get('error', {}).get('message', 'Unknown error')
                code = error_data.get('error', {}).get('code', response.status_code)
                raise FingerprintException(message, code)
            
            return response.json() if response.content else {}
            
        except requests.exceptions.RequestException as e:
            raise FingerprintException(f"Request failed: {str(e)}")
    
    def list_devices(self) -> List[Dict[str, Any]]:
        """
        List all connected fingerprint devices.
        
        Returns:
            List of device information dictionaries
        """
        return self._request('GET', '/api/devices')
    
    def get_device_info(self, device_id: str) -> Dict[str, Any]:
        """
        Get information about a specific device.
        
        Args:
            device_id: Device identifier
            
        Returns:
            Device information dictionary
        """
        return self._request('GET', f'/api/devices/{device_id}/info')
    
    def test_device(self, device_id: str) -> Dict[str, Any]:
        """
        Test device connection.
        
        Args:
            device_id: Device identifier
            
        Returns:
            Test result dictionary
        """
        return self._request('POST', f'/api/devices/{device_id}/test')
    
    def enroll_fingerprint(
        self,
        device_id: str,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enroll a new fingerprint.
        
        Args:
            device_id: Device identifier
            user_id: User identifier
            metadata: Optional metadata dictionary
            
        Returns:
            Enrollment result with template and quality
        """
        data = {
            'deviceId': device_id,
            'userId': user_id
        }
        
        if metadata is not None:
            data['metadata'] = metadata
        
        return self._request('POST', '/api/fingerprint/enroll', data=data)
    
    def verify_fingerprint(
        self,
        template: str,
        user_id: str,
        device_id: str
    ) -> Dict[str, Any]:
        """
        Verify fingerprint (1:1 matching).
        
        Args:
            template: Base64-encoded fingerprint template
            user_id: User identifier to verify against
            device_id: Device identifier
            
        Returns:
            Verification result with match status and confidence
        """
        data = {
            'template': template,
            'userId': user_id,
            'deviceId': device_id
        }
        
        return self._request('POST', '/api/fingerprint/verify', data=data)
    
    def identify_fingerprint(
        self,
        template: str,
        device_id: str
    ) -> Dict[str, Any]:
        """
        Identify fingerprint (1:N matching).
        
        Args:
            template: Base64-encoded fingerprint template
            device_id: Device identifier
            
        Returns:
            Identification result with match status, user ID, and confidence
        """
        data = {
            'template': template,
            'deviceId': device_id
        }
        
        return self._request('POST', '/api/fingerprint/identify', data=data)
    
    def start_scan(self, device_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Start a fingerprint scan session.
        
        Args:
            device_id: Optional device identifier
            
        Returns:
            Scan session information with scan ID
        """
        params = {'deviceId': device_id} if device_id else None
        return self._request('GET', '/api/fingerprint/scan/start', params=params)
    
    def get_scan_status(self, scan_id: str) -> Dict[str, Any]:
        """
        Get the status of a scan session.
        
        Args:
            scan_id: Scan session identifier
            
        Returns:
            Scan status information
        """
        return self._request('GET', f'/api/fingerprint/scan/status/{scan_id}')
    
    def wait_for_scan(
        self,
        scan_id: str,
        max_wait_seconds: int = 30,
        poll_interval: float = 0.5
    ) -> Dict[str, Any]:
        """
        Wait for scan completion with polling.
        
        Args:
            scan_id: Scan session identifier
            max_wait_seconds: Maximum time to wait in seconds
            poll_interval: Time between polls in seconds
            
        Returns:
            Completed scan result
            
        Raises:
            FingerprintException: If scan fails or times out
        """
        start_time = time.time()
        
        while time.time() - start_time < max_wait_seconds:
            status = self.get_scan_status(scan_id)
            
            if status['status'] == 'complete':
                return status
            
            if status['status'] == 'error':
                error_msg = status.get('error', 'Unknown error')
                raise FingerprintException(f'Scan failed: {error_msg}')
            
            time.sleep(poll_interval)
        
        raise FingerprintException('Scan timeout')
    
    def get_health(self) -> Dict[str, Any]:
        """
        Get service health status.
        
        Returns:
            Health status information
        """
        return self._request('GET', '/api/health')
```

### Usage Examples

#### Basic Enrollment Flow

```python
from fingerprint_client import FingerprintClient, FingerprintException

# Using context manager for automatic cleanup
with FingerprintClient('http://localhost:8080', 'your-api-key-here') as client:
    try:
        # List available devices
        devices = client.list_devices()
        if not devices:
            print("No devices connected")
            exit(1)
        
        device_id = devices[0]['id']
        print(f"Using device: {device_id}")
        
        # Enroll fingerprint
        user_id = 'user-12345'
        metadata = {
            'name': 'John Doe',
            'department': 'Engineering',
            'email': 'john.doe@example.com'
        }
        
        print(f"Starting enrollment for user: {user_id}")
        result = client.enroll_fingerprint(device_id, user_id, metadata)
        
        print("Enrollment successful!")
        print(f"Quality: {result['quality']}")
        print(f"Template: {result['template'][:50]}...")
        
        # Store the template in your database
        # save_to_database(user_id, result['template'], metadata)
        
    except FingerprintException as e:
        print(f"Fingerprint Error: {e.message} (Code: {e.code})")
    except Exception as e:
        print(f"Error: {str(e)}")
```

#### Verification Flow

```python
from fingerprint_client import FingerprintClient, FingerprintException

def verify_user(user_id: str, stored_template: str):
    """Verify a user's fingerprint"""
    
    with FingerprintClient('http://localhost:8080', 'your-api-key-here') as client:
        try:
            # Start scan
            scan = client.start_scan()
            print("Place finger on scanner...")
            
            # Wait for scan completion
            scan_result = client.wait_for_scan(scan['scanId'])
            print(f"Scan complete. Quality: {scan_result['quality']}")
            
            # Verify against stored template
            verification = client.verify_fingerprint(
                scan_result['template'],
                user_id,
                scan['deviceId']
            )
            
            if verification['match']:
                print("✓ Verification successful!")
                print(f"Confidence: {verification['confidence']}%")
                return True
            else:
                print("✗ Verification failed")
                return False
                
        except FingerprintException as e:
            print(f"Fingerprint Error: {e.message}")
            return False

# Usage
# stored_template = get_template_from_database('user-12345')
# if verify_user('user-12345', stored_template):
#     print("Access granted")
# else:
#     print("Access denied")
```

#### Identification Flow

```python
from fingerprint_client import FingerprintClient, FingerprintException

def identify_user():
    """Identify a user from fingerprint scan"""
    
    with FingerprintClient('http://localhost:8080', 'your-api-key-here') as client:
        try:
            # Start scan
            scan = client.start_scan()
            print("Place finger on scanner...")
            
            # Wait for scan completion
            scan_result = client.wait_for_scan(scan['scanId'])
            print(f"Scan complete. Quality: {scan_result['quality']}")
            
            # Identify user
            identification = client.identify_fingerprint(
                scan_result['template'],
                scan['deviceId']
            )
            
            if identification['match']:
                print("✓ User identified!")
                print(f"User ID: {identification['userId']}")
                print(f"Confidence: {identification['confidence']}%")
                
                # Load user details from database
                # user = get_user_from_database(identification['userId'])
                # print(f"Welcome, {user['name']}!")
                
                return identification['userId']
            else:
                print("✗ User not found in database")
                return None
                
        except FingerprintException as e:
            print(f"Fingerprint Error: {e.message}")
            return None

# Usage
# user_id = identify_user()
# if user_id:
#     print(f"Authenticated as: {user_id}")
```


## Implementation 2: Asynchronous Client

### Async API Client Class

Create a file `async_fingerprint_client.py`:

```python
"""
Asynchronous Fingerprint Service API Client for Python
"""

import asyncio
from typing import Optional, Dict, Any, List
import aiohttp


class AsyncFingerprintClient:
    """Asynchronous API client for Fingerprint Service"""
    
    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: int = 30
    ):
        """
        Initialize the async Fingerprint API client.
        
        Args:
            base_url: Base URL of the fingerprint service
            api_key: API key for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def connect(self) -> None:
        """Create the aiohttp session"""
        if self.session is None:
            self.session = aiohttp.ClientSession(
                headers={
                    'X-API-Key': self.api_key,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout=self.timeout
            )
    
    async def close(self) -> None:
        """Close the session and cleanup resources"""
        if self.session:
            await self.session.close()
            self.session = None
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make async HTTP request to the API.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint path
            data: Request body data
            params: Query parameters
            
        Returns:
            Response data as dictionary
            
        Raises:
            FingerprintException: If request fails
        """
        if self.session is None:
            await self.connect()
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with self.session.request(
                method=method,
                url=url,
                json=data,
                params=params
            ) as response:
                # Check for HTTP errors
                if response.status >= 400:
                    error_data = await response.json() if response.content_length else {}
                    message = error_data.get('error', {}).get('message', 'Unknown error')
                    code = error_data.get('error', {}).get('code', response.status)
                    raise FingerprintException(message, code)
                
                return await response.json() if response.content_length else {}
                
        except aiohttp.ClientError as e:
            raise FingerprintException(f"Request failed: {str(e)}")
    
    async def list_devices(self) -> List[Dict[str, Any]]:
        """List all connected fingerprint devices"""
        return await self._request('GET', '/api/devices')
    
    async def get_device_info(self, device_id: str) -> Dict[str, Any]:
        """Get information about a specific device"""
        return await self._request('GET', f'/api/devices/{device_id}/info')
    
    async def test_device(self, device_id: str) -> Dict[str, Any]:
        """Test device connection"""
        return await self._request('POST', f'/api/devices/{device_id}/test')
    
    async def enroll_fingerprint(
        self,
        device_id: str,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Enroll a new fingerprint"""
        data = {
            'deviceId': device_id,
            'userId': user_id
        }
        
        if metadata is not None:
            data['metadata'] = metadata
        
        return await self._request('POST', '/api/fingerprint/enroll', data=data)
    
    async def verify_fingerprint(
        self,
        template: str,
        user_id: str,
        device_id: str
    ) -> Dict[str, Any]:
        """Verify fingerprint (1:1 matching)"""
        data = {
            'template': template,
            'userId': user_id,
            'deviceId': device_id
        }
        
        return await self._request('POST', '/api/fingerprint/verify', data=data)
    
    async def identify_fingerprint(
        self,
        template: str,
        device_id: str
    ) -> Dict[str, Any]:
        """Identify fingerprint (1:N matching)"""
        data = {
            'template': template,
            'deviceId': device_id
        }
        
        return await self._request('POST', '/api/fingerprint/identify', data=data)
    
    async def start_scan(self, device_id: Optional[str] = None) -> Dict[str, Any]:
        """Start a fingerprint scan session"""
        params = {'deviceId': device_id} if device_id else None
        return await self._request('GET', '/api/fingerprint/scan/start', params=params)
    
    async def get_scan_status(self, scan_id: str) -> Dict[str, Any]:
        """Get the status of a scan session"""
        return await self._request('GET', f'/api/fingerprint/scan/status/{scan_id}')
    
    async def wait_for_scan(
        self,
        scan_id: str,
        max_wait_seconds: int = 30,
        poll_interval: float = 0.5
    ) -> Dict[str, Any]:
        """
        Wait for scan completion with polling.
        
        Args:
            scan_id: Scan session identifier
            max_wait_seconds: Maximum time to wait in seconds
            poll_interval: Time between polls in seconds
            
        Returns:
            Completed scan result
            
        Raises:
            FingerprintException: If scan fails or times out
        """
        start_time = asyncio.get_event_loop().time()
        
        while asyncio.get_event_loop().time() - start_time < max_wait_seconds:
            status = await self.get_scan_status(scan_id)
            
            if status['status'] == 'complete':
                return status
            
            if status['status'] == 'error':
                error_msg = status.get('error', 'Unknown error')
                raise FingerprintException(f'Scan failed: {error_msg}')
            
            await asyncio.sleep(poll_interval)
        
        raise FingerprintException('Scan timeout')
    
    async def get_health(self) -> Dict[str, Any]:
        """Get service health status"""
        return await self._request('GET', '/api/health')
```

### Async Usage Examples

#### Async Enrollment Flow

```python
import asyncio
from async_fingerprint_client import AsyncFingerprintClient, FingerprintException

async def enroll_user_async():
    """Async enrollment example"""
    
    async with AsyncFingerprintClient('http://localhost:8080', 'your-api-key-here') as client:
        try:
            # List available devices
            devices = await client.list_devices()
            if not devices:
                print("No devices connected")
                return
            
            device_id = devices[0]['id']
            print(f"Using device: {device_id}")
            
            # Enroll fingerprint
            user_id = 'user-12345'
            metadata = {
                'name': 'Jane Smith',
                'department': 'Sales'
            }
            
            print(f"Starting enrollment for user: {user_id}")
            result = await client.enroll_fingerprint(device_id, user_id, metadata)
            
            print("Enrollment successful!")
            print(f"Quality: {result['quality']}")
            
        except FingerprintException as e:
            print(f"Error: {e.message}")

# Run the async function
asyncio.run(enroll_user_async())
```

#### Concurrent Operations

```python
import asyncio
from async_fingerprint_client import AsyncFingerprintClient

async def process_multiple_users():
    """Process multiple users concurrently"""
    
    async with AsyncFingerprintClient('http://localhost:8080', 'your-api-key-here') as client:
        # Get device info for multiple devices concurrently
        device_ids = ['device-001', 'device-002', 'device-003']
        
        tasks = [client.get_device_info(device_id) for device_id in device_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for device_id, result in zip(device_ids, results):
            if isinstance(result, Exception):
                print(f"Error for {device_id}: {result}")
            else:
                print(f"{device_id}: {result['name']}")

asyncio.run(process_multiple_users())
```

## Error Handling

### Custom Exception Classes

```python
class FingerprintException(Exception):
    """Base exception for fingerprint operations"""
    
    def __init__(self, message: str, code: int = 0):
        self.message = message
        self.code = code
        super().__init__(self.message)


class DeviceException(FingerprintException):
    """Device-related errors"""
    pass


class FingerprintQualityException(FingerprintException):
    """Fingerprint quality or matching errors"""
    pass


class AuthenticationException(FingerprintException):
    """Authentication errors"""
    pass


class RateLimitException(FingerprintException):
    """Rate limiting errors"""
    pass
```

### Retry Logic with Exponential Backoff

```python
import time
from typing import Callable, TypeVar, Any

T = TypeVar('T')

def retry_with_backoff(
    func: Callable[..., T],
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0
) -> T:
    """
    Retry a function with exponential backoff.
    
    Args:
        func: Function to retry
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        backoff_factor: Multiplier for delay after each retry
        
    Returns:
        Function result
        
    Raises:
        Exception: If all retries fail
    """
    delay = initial_delay
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            return func()
        except FingerprintQualityException as e:
            print(f"Low quality scan (attempt {attempt + 1}/{max_retries}). Please try again.")
            last_exception = e
            if attempt < max_retries - 1:
                time.sleep(delay)
                delay *= backoff_factor
        except RateLimitException as e:
            print(f"Rate limit exceeded. Waiting {delay} seconds...")
            last_exception = e
            if attempt < max_retries - 1:
                time.sleep(delay)
                delay *= backoff_factor
        except DeviceException as e:
            # Don't retry device errors
            raise e
    
    raise last_exception or Exception("Max retries exceeded")


# Usage
def enroll_with_retry():
    with FingerprintClient('http://localhost:8080', 'your-api-key-here') as client:
        result = retry_with_backoff(
            lambda: client.enroll_fingerprint('device-001', 'user-123'),
            max_retries=3
        )
        return result
```

## Quality Validation

### Validator Class

```python
class FingerprintValidator:
    """Validate fingerprint quality and confidence"""
    
    MIN_ENROLLMENT_QUALITY = 60
    MIN_VERIFICATION_QUALITY = 50
    MIN_CONFIDENCE = 80.0
    
    @classmethod
    def validate_enrollment_quality(cls, result: Dict[str, Any]) -> None:
        """
        Validate enrollment quality.
        
        Args:
            result: Enrollment result dictionary
            
        Raises:
            FingerprintQualityException: If quality is too low
        """
        quality = result.get('quality', 0)
        if quality < cls.MIN_ENROLLMENT_QUALITY:
            raise FingerprintQualityException(
                f"Quality too low for enrollment: {quality} "
                f"(minimum: {cls.MIN_ENROLLMENT_QUALITY})"
            )
    
    @classmethod
    def validate_verification_quality(cls, result: Dict[str, Any]) -> None:
        """Validate verification quality"""
        quality = result.get('quality', 0)
        if quality < cls.MIN_VERIFICATION_QUALITY:
            raise FingerprintQualityException(
                f"Quality too low for verification: {quality} "
                f"(minimum: {cls.MIN_VERIFICATION_QUALITY})"
            )
    
    @classmethod
    def validate_confidence(
        cls,
        result: Dict[str, Any],
        min_confidence: Optional[float] = None
    ) -> None:
        """Validate confidence score"""
        min_conf = min_confidence or cls.MIN_CONFIDENCE
        confidence = result.get('confidence', 0.0)
        
        if confidence < min_conf:
            raise FingerprintQualityException(
                f"Confidence too low: {confidence}% (minimum: {min_conf}%)"
            )


# Usage
try:
    result = client.enroll_fingerprint('device-001', 'user-123')
    FingerprintValidator.validate_enrollment_quality(result)
    print("Enrollment successful with good quality!")
except FingerprintQualityException as e:
    print(f"Quality check failed: {e.message}")
```


## Complete Example: User Authentication System

### Database Setup

```python
import sqlite3
from typing import Optional, Dict, Any
from datetime import datetime

class FingerprintDatabase:
    """Database manager for fingerprint templates"""
    
    def __init__(self, db_path: str = 'fingerprints.db'):
        """Initialize database connection"""
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.create_tables()
    
    def create_tables(self) -> None:
        """Create database tables"""
        cursor = self.conn.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Fingerprint templates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS fingerprint_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                template TEXT NOT NULL,
                quality INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Authentication logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS auth_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                confidence REAL,
                success BOOLEAN NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        self.conn.commit()
    
    def create_user(self, username: str, email: str) -> int:
        """Create a new user"""
        cursor = self.conn.cursor()
        cursor.execute(
            'INSERT INTO users (username, email) VALUES (?, ?)',
            (username, email)
        )
        self.conn.commit()
        return cursor.lastrowid
    
    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def save_template(
        self,
        user_id: int,
        template: str,
        quality: int
    ) -> int:
        """Save fingerprint template"""
        cursor = self.conn.cursor()
        cursor.execute(
            'INSERT INTO fingerprint_templates (user_id, template, quality) VALUES (?, ?, ?)',
            (user_id, template, quality)
        )
        self.conn.commit()
        return cursor.lastrowid
    
    def get_template(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user's fingerprint template"""
        cursor = self.conn.cursor()
        cursor.execute(
            'SELECT * FROM fingerprint_templates WHERE user_id = ?',
            (user_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def log_auth_attempt(
        self,
        user_id: Optional[int],
        success: bool,
        confidence: Optional[float] = None
    ) -> None:
        """Log authentication attempt"""
        cursor = self.conn.cursor()
        cursor.execute(
            'INSERT INTO auth_logs (user_id, success, confidence) VALUES (?, ?, ?)',
            (user_id, success, confidence)
        )
        self.conn.commit()
    
    def close(self) -> None:
        """Close database connection"""
        self.conn.close()
```

### Authentication System

```python
from fingerprint_client import FingerprintClient, FingerprintException
from typing import Optional, Dict, Any

class FingerprintAuthSystem:
    """Complete fingerprint authentication system"""
    
    def __init__(
        self,
        client: FingerprintClient,
        database: FingerprintDatabase
    ):
        """
        Initialize authentication system.
        
        Args:
            client: Fingerprint API client
            database: Database manager
        """
        self.client = client
        self.db = database
    
    def register_user(
        self,
        username: str,
        email: str,
        device_id: str
    ) -> Dict[str, Any]:
        """
        Register new user with fingerprint.
        
        Args:
            username: Username
            email: Email address
            device_id: Device identifier
            
        Returns:
            Registration result dictionary
        """
        try:
            # Create user in database
            user_id = self.db.create_user(username, email)
            
            # Enroll fingerprint
            print(f"Enrolling fingerprint for {username}...")
            result = self.client.enroll_fingerprint(
                device_id,
                f"user-{user_id}",
                {'username': username, 'email': email}
            )
            
            # Validate quality
            FingerprintValidator.validate_enrollment_quality(result)
            
            # Store template
            self.db.save_template(user_id, result['template'], result['quality'])
            
            print(f"✓ User registered successfully! Quality: {result['quality']}")
            
            return {
                'success': True,
                'user_id': user_id,
                'quality': result['quality']
            }
            
        except FingerprintException as e:
            # Rollback user creation if enrollment fails
            print(f"✗ Enrollment failed: {e.message}")
            raise
    
    def authenticate_user(self, device_id: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user with fingerprint.
        
        Args:
            device_id: Device identifier
            
        Returns:
            User information if authenticated, None otherwise
        """
        try:
            # Start scan
            print("Place finger on scanner...")
            scan = self.client.start_scan(device_id)
            scan_result = self.client.wait_for_scan(scan['scanId'])
            
            print(f"Scan complete. Quality: {scan_result['quality']}")
            
            # Identify user
            identification = self.client.identify_fingerprint(
                scan_result['template'],
                device_id
            )
            
            if not identification['match']:
                print("✗ User not found")
                self.db.log_auth_attempt(None, False)
                return None
            
            # Extract user ID from service user ID format
            service_user_id = identification['userId']
            user_id = int(service_user_id.replace('user-', ''))
            
            # Load user from database
            user = self.db.get_user(user_id)
            
            if not user:
                print("✗ User not found in database")
                return None
            
            # Log successful authentication
            self.db.log_auth_attempt(
                user_id,
                True,
                identification['confidence']
            )
            
            print(f"✓ Welcome, {user['username']}!")
            print(f"Confidence: {identification['confidence']}%")
            
            return {
                'user_id': user_id,
                'username': user['username'],
                'email': user['email'],
                'confidence': identification['confidence']
            }
            
        except FingerprintException as e:
            print(f"✗ Authentication failed: {e.message}")
            return None
    
    def verify_user(self, user_id: int, device_id: str) -> bool:
        """
        Verify a specific user's fingerprint.
        
        Args:
            user_id: User identifier
            device_id: Device identifier
            
        Returns:
            True if verified, False otherwise
        """
        try:
            # Get stored template
            template_data = self.db.get_template(user_id)
            if not template_data:
                print("✗ User does not have a fingerprint enrolled")
                return False
            
            # Start scan
            print("Place finger on scanner...")
            scan = self.client.start_scan(device_id)
            scan_result = self.client.wait_for_scan(scan['scanId'])
            
            # Verify fingerprint
            verification = self.client.verify_fingerprint(
                scan_result['template'],
                f"user-{user_id}",
                device_id
            )
            
            # Log verification attempt
            self.db.log_auth_attempt(
                user_id,
                verification['match'],
                verification.get('confidence')
            )
            
            if verification['match']:
                print(f"✓ Verification successful! Confidence: {verification['confidence']}%")
                return True
            else:
                print("✗ Verification failed")
                return False
                
        except FingerprintException as e:
            print(f"✗ Verification error: {e.message}")
            return False


# Usage Example
def main():
    """Main application entry point"""
    
    # Initialize components
    db = FingerprintDatabase('fingerprints.db')
    
    with FingerprintClient('http://localhost:8080', 'your-api-key-here') as client:
        auth_system = FingerprintAuthSystem(client, db)
        
        # Register new user
        print("=== User Registration ===")
        try:
            result = auth_system.register_user(
                'johndoe',
                'john@example.com',
                'device-001'
            )
            print(f"User ID: {result['user_id']}")
        except Exception as e:
            print(f"Registration failed: {e}")
        
        # Authenticate user
        print("\n=== User Authentication ===")
        user = auth_system.authenticate_user('device-001')
        
        if user:
            print(f"Logged in as: {user['username']}")
        else:
            print("Authentication failed")
    
    db.close()


if __name__ == '__main__':
    main()
```

## Advanced Features

### Configuration Management

```python
from dataclasses import dataclass
from typing import Optional
import os
import json

@dataclass
class FingerprintConfig:
    """Configuration for fingerprint client"""
    
    base_url: str
    api_key: str
    timeout: int = 30
    max_retries: int = 3
    min_enrollment_quality: int = 60
    min_verification_quality: int = 50
    min_confidence: float = 80.0
    scan_timeout: int = 30
    
    @classmethod
    def from_env(cls) -> 'FingerprintConfig':
        """Load configuration from environment variables"""
        return cls(
            base_url=os.getenv('FINGERPRINT_BASE_URL', 'http://localhost:8080'),
            api_key=os.getenv('FINGERPRINT_API_KEY', ''),
            timeout=int(os.getenv('FINGERPRINT_TIMEOUT', '30')),
            max_retries=int(os.getenv('FINGERPRINT_MAX_RETRIES', '3')),
            min_enrollment_quality=int(os.getenv('FINGERPRINT_MIN_ENROLLMENT_QUALITY', '60')),
            min_verification_quality=int(os.getenv('FINGERPRINT_MIN_VERIFICATION_QUALITY', '50')),
            min_confidence=float(os.getenv('FINGERPRINT_MIN_CONFIDENCE', '80.0')),
            scan_timeout=int(os.getenv('FINGERPRINT_SCAN_TIMEOUT', '30'))
        )
    
    @classmethod
    def from_file(cls, filepath: str) -> 'FingerprintConfig':
        """Load configuration from JSON file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return cls(**data)
    
    def to_file(self, filepath: str) -> None:
        """Save configuration to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(self.__dict__, f, indent=2)


# Usage
config = FingerprintConfig.from_env()
client = FingerprintClient(config.base_url, config.api_key, config.timeout)
```

### Logging

```python
import logging
from typing import Any, Dict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fingerprint.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('fingerprint')


class LoggingFingerprintClient(FingerprintClient):
    """Fingerprint client with logging"""
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make HTTP request with logging"""
        logger.info(f"Request: {method} {endpoint}")
        
        try:
            result = super()._request(method, endpoint, data, params)
            logger.info(f"Response: {method} {endpoint} - Success")
            return result
        except FingerprintException as e:
            logger.error(f"Request failed: {method} {endpoint} - {e.message}")
            raise


# Usage
client = LoggingFingerprintClient('http://localhost:8080', 'your-api-key-here')
```

### Caching

```python
from functools import lru_cache
from typing import List, Dict, Any
import time

class CachedFingerprintClient(FingerprintClient):
    """Fingerprint client with caching"""
    
    def __init__(self, *args, cache_ttl: int = 300, **kwargs):
        """
        Initialize client with caching.
        
        Args:
            cache_ttl: Cache time-to-live in seconds
        """
        super().__init__(*args, **kwargs)
        self.cache_ttl = cache_ttl
        self._cache: Dict[str, tuple[Any, float]] = {}
    
    def _get_cached(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self.cache_ttl:
                return value
            else:
                del self._cache[key]
        return None
    
    def _set_cached(self, key: str, value: Any) -> None:
        """Set value in cache"""
        self._cache[key] = (value, time.time())
    
    def list_devices(self) -> List[Dict[str, Any]]:
        """List devices with caching"""
        cached = self._get_cached('devices')
        if cached is not None:
            return cached
        
        devices = super().list_devices()
        self._set_cached('devices', devices)
        return devices
    
    def get_device_info(self, device_id: str) -> Dict[str, Any]:
        """Get device info with caching"""
        cache_key = f'device:{device_id}'
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        
        info = super().get_device_info(device_id)
        self._set_cached(cache_key, info)
        return info
    
    def clear_cache(self) -> None:
        """Clear all cached data"""
        self._cache.clear()


# Usage
client = CachedFingerprintClient(
    'http://localhost:8080',
    'your-api-key-here',
    cache_ttl=300  # 5 minutes
)
```

## Testing

### Unit Tests with unittest

```python
import unittest
from unittest.mock import Mock, patch, MagicMock
from fingerprint_client import FingerprintClient, FingerprintException

class TestFingerprintClient(unittest.TestCase):
    """Unit tests for FingerprintClient"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.client = FingerprintClient(
            'http://localhost:8080',
            'test-api-key'
        )
    
    def tearDown(self):
        """Clean up after tests"""
        self.client.close()
    
    @patch('requests.Session.request')
    def test_list_devices(self, mock_request):
        """Test listing devices"""
        # Mock response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {'id': 'device-001', 'name': 'Test Device'}
        ]
        mock_response.content = True
        mock_request.return_value = mock_response
        
        # Call method
        devices = self.client.list_devices()
        
        # Assertions
        self.assertEqual(len(devices), 1)
        self.assertEqual(devices[0]['id'], 'device-001')
    
    @patch('requests.Session.request')
    def test_enroll_fingerprint(self, mock_request):
        """Test fingerprint enrollment"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'template': 'base64-template',
            'quality': 85
        }
        mock_response.content = True
        mock_request.return_value = mock_response
        
        result = self.client.enroll_fingerprint(
            'device-001',
            'user-123',
            {'name': 'Test User'}
        )
        
        self.assertEqual(result['quality'], 85)
        self.assertIn('template', result)
    
    @patch('requests.Session.request')
    def test_error_handling(self, mock_request):
        """Test error handling"""
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.json.return_value = {
            'error': {
                'message': 'Device not found',
                'code': 'DEVICE_NOT_FOUND'
            }
        }
        mock_response.content = True
        mock_request.return_value = mock_response
        
        with self.assertRaises(FingerprintException) as context:
            self.client.list_devices()
        
        self.assertIn('Device not found', str(context.exception))


if __name__ == '__main__':
    unittest.main()
```

### Integration Tests with pytest

```python
import pytest
from fingerprint_client import FingerprintClient, FingerprintException

@pytest.fixture
def client():
    """Create client fixture"""
    client = FingerprintClient('http://localhost:8080', 'test-api-key')
    yield client
    client.close()

def test_list_devices(client):
    """Test listing devices"""
    devices = client.list_devices()
    assert isinstance(devices, list)

def test_enroll_and_verify(client):
    """Test enrollment and verification flow"""
    # Get first device
    devices = client.list_devices()
    assert len(devices) > 0
    device_id = devices[0]['id']
    
    # Enroll fingerprint
    result = client.enroll_fingerprint(device_id, 'test-user-123')
    assert 'template' in result
    assert result['quality'] > 0
    
    # Verify fingerprint
    verification = client.verify_fingerprint(
        result['template'],
        'test-user-123',
        device_id
    )
    assert verification['match'] is True

def test_invalid_api_key():
    """Test with invalid API key"""
    client = FingerprintClient('http://localhost:8080', 'invalid-key')
    
    with pytest.raises(FingerprintException):
        client.list_devices()
    
    client.close()
```

## Best Practices

1. **Always use context managers** for automatic resource cleanup
2. **Validate quality scores** before storing templates
3. **Implement retry logic** for transient errors
4. **Log all authentication attempts** for security auditing
5. **Store API keys securely** using environment variables
6. **Use HTTPS** in production environments
7. **Implement rate limiting** on your application side
8. **Cache device information** to reduce API calls
9. **Use type hints** for better code documentation
10. **Write comprehensive tests** for all operations

## Troubleshooting

### SSL Certificate Errors

```python
# Disable SSL verification (development only!)
import requests
session = requests.Session()
session.verify = False
```

### Timeout Issues

```python
# Increase timeout for slow operations
client = FingerprintClient(
    'http://localhost:8080',
    'api-key',
    timeout=60  # 60 seconds
)
```

### Connection Pool Issues

```python
# Configure connection pool
from requests.adapters import HTTPAdapter

adapter = HTTPAdapter(
    pool_connections=10,
    pool_maxsize=20
)
client.session.mount('http://', adapter)
client.session.mount('https://', adapter)
```

## Next Steps

- [.NET Integration](dotnet.md) - C# implementation
- [Java Integration](java.md) - Java implementation
- [API Reference](../api-reference/rest-api.md) - Complete API documentation
- [Best Practices](../guides/best-practices.md) - Security and optimization tips
- [Error Codes](../api-reference/error-codes.md) - Complete error code reference
