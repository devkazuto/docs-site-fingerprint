---
sidebar_position: 1
title: Installation
description: Complete installation guide for Windows, macOS, and Linux
---

# Installation

This guide will walk you through installing the Fingerprint Background Service on your system.

## Prerequisites

Before installing, ensure you have:

- **Operating System**: Windows 10 or later (64-bit)
- **Hardware**: ZKTeco SLK20R fingerprint reader
- **Permissions**: Administrator privileges (recommended for automatic service setup)
- **Disk Space**: At least 500MB free space
- **Memory**: 2GB RAM minimum, 4GB recommended
- **Network**: Port 8080 available (default, configurable)

## Windows Installation

### Method 1: Using the Installer (Recommended)

#### With Administrator Privileges

1. **Download the installer**
   ```
   Fingerprint Service Installer-Setup-1.0.0.exe
   ```

2. **Run as Administrator**
   - Right-click the installer
   - Select **"Run as administrator"**

3. **Follow the installation wizard**

   **Step 1: Welcome Screen**
   - Click "Next" to begin installation

   **Step 2: Configuration**
   - **Port**: Default is 8080 (change if needed)
   - **API Key**: Generate a secure API key (save this!)
   - **Admin Credentials**: Set username and password for Web Admin

   **Step 3: Driver Installation**
   - The installer will automatically install ZKTeco device drivers
   - Click "Install Driver" when prompted

   **Step 4: Device Detection**
   - Connect your ZKTeco SLK20R fingerprint reader
   - The installer will detect and configure the device

   **Step 5: Service Installation**
   - The service will be installed to `C:\Program Files\Fingerprint Service`
   - Windows service will be registered as "Fingerprint Background Service"

   **Step 6: Service Start**
   - The service will start automatically
   - Service is configured to start on system boot

4. **Installation Complete!**
   - Service is running at `http://localhost:8080`
   - Web Admin available at `http://localhost:8080/admin`
   - Your API key is saved in the configuration

#### Without Administrator Privileges

If you don't have administrator privileges:

1. **Run the installer normally** (double-click)

2. **Complete the installation wizard**

3. **Note the message**:
   ```
   Service installed but not started.
   
   Administrator privileges are required to start the service.
   
   To start the service:
   1. Open Command Prompt as Administrator
   2. Run: sc.exe start FingerprintService
   
   Or restart your computer.
   ```

4. **Start the service manually**:
   
   Open Command Prompt as Administrator:
   ```cmd
   sc.exe start FingerprintService
   ```
   
   Or simply restart your computer.

### Method 2: Manual Installation

For advanced users who want more control:

1. **Extract the service files** to your preferred location:
   ```
   C:\YourPath\Fingerprint Service\
   ```

2. **Install dependencies**:
   ```cmd
   cd "C:\YourPath\Fingerprint Service"
   npm install --production
   ```

3. **Configure the service**:
   
   Edit `data/config.json`:
   ```json
   {
     "server": {
       "port": 8080,
       "host": "0.0.0.0"
     },
     "apiKeys": ["your-generated-api-key"],
     "admin": {
       "username": "admin",
       "password": "hashed-password"
     }
   }
   ```

4. **Register Windows service**:
   ```cmd
   sc.exe create FingerprintService binPath= "C:\YourPath\Fingerprint Service\service.exe" start= auto
   ```

5. **Start the service**:
   ```cmd
   sc.exe start FingerprintService
   ```

## macOS Installation

:::info
macOS support is currently in beta. Some features may be limited.
:::

### Using Homebrew

1. **Install the service**:
   ```bash
   brew tap your-org/fingerprint-service
   brew install fingerprint-service
   ```

2. **Start the service**:
   ```bash
   brew services start fingerprint-service
   ```

### Manual Installation

1. **Download and extract** the macOS package

2. **Install dependencies**:
   ```bash
   cd /path/to/fingerprint-service
   npm install --production
   ```

3. **Configure the service**:
   ```bash
   cp config.example.json config.json
   nano config.json
   ```

4. **Create launch daemon**:
   
   Create `/Library/LaunchDaemons/com.fingerprint.service.plist`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>com.fingerprint.service</string>
       <key>ProgramArguments</key>
       <array>
           <string>/path/to/fingerprint-service/service</string>
       </array>
       <key>RunAtLoad</key>
       <true/>
       <key>KeepAlive</key>
       <true/>
   </dict>
   </plist>
   ```

5. **Load and start**:
   ```bash
   sudo launchctl load /Library/LaunchDaemons/com.fingerprint.service.plist
   sudo launchctl start com.fingerprint.service
   ```

## Linux Installation

### Using Package Manager (Debian/Ubuntu)

1. **Add repository**:
   ```bash
   curl -fsSL https://your-repo.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/fingerprint-service.gpg
   echo "deb [signed-by=/usr/share/keyrings/fingerprint-service.gpg] https://your-repo.com/apt stable main" | sudo tee /etc/apt/sources.list.d/fingerprint-service.list
   ```

2. **Install**:
   ```bash
   sudo apt update
   sudo apt install fingerprint-service
   ```

3. **Start the service**:
   ```bash
   sudo systemctl start fingerprint-service
   sudo systemctl enable fingerprint-service
   ```

### Manual Installation

1. **Download and extract** the Linux package:
   ```bash
   wget https://your-repo.com/fingerprint-service-linux-x64.tar.gz
   tar -xzf fingerprint-service-linux-x64.tar.gz
   sudo mv fingerprint-service /opt/
   ```

2. **Install dependencies**:
   ```bash
   cd /opt/fingerprint-service
   npm install --production
   ```

3. **Configure the service**:
   ```bash
   sudo cp config.example.json config.json
   sudo nano config.json
   ```

4. **Create systemd service**:
   
   Create `/etc/systemd/system/fingerprint-service.service`:
   ```ini
   [Unit]
   Description=Fingerprint Background Service
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/fingerprint-service
   ExecStart=/opt/fingerprint-service/service
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

5. **Enable and start**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable fingerprint-service
   sudo systemctl start fingerprint-service
   ```

## Verification

After installation, verify the service is running correctly:

### Check Service Status

**Windows:**
```cmd
sc.exe query FingerprintService
```

**macOS:**
```bash
sudo launchctl list | grep fingerprint
```

**Linux:**
```bash
sudo systemctl status fingerprint-service
```

### Test API Endpoint

Test the health endpoint:

```bash
curl http://localhost:8080/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 120,
  "deviceStatus": "connected",
  "dbStatus": "operational",
  "version": "1.0.0"
}
```

### Access Web Admin

Open your browser and navigate to:
```
http://localhost:8080/admin
```

Login with the credentials you set during installation.

## Troubleshooting

### Service Won't Start

**Error: "Access is denied"**

**Solution**: Run with administrator/root privileges:

**Windows:**
```cmd
# Run Command Prompt as Administrator
sc.exe start FingerprintService
```

**Linux:**
```bash
sudo systemctl start fingerprint-service
```

---

**Error: "Service did not respond in time"**

**Solution**: Check the service logs:

**Windows:**
```cmd
type "C:\Program Files\Fingerprint Service\logs\service.log"
```

**Linux:**
```bash
sudo journalctl -u fingerprint-service -n 50
```

### Device Not Detected

**Possible causes:**
1. Device not connected
2. Driver not installed
3. Device in use by another application
4. USB port issue

**Solutions:**

1. **Reconnect the device**:
   - Unplug the fingerprint reader
   - Wait 5 seconds
   - Plug it back in
   - Restart the service

2. **Check device in Device Manager** (Windows):
   - Open Device Manager (Win + X → Device Manager)
   - Look for "ZKTeco" or "Biometric Devices"
   - If you see a yellow warning icon, reinstall the driver

3. **Verify USB connection**:
   - Try a different USB port
   - Avoid USB hubs if possible
   - Use USB 2.0 ports for better compatibility

4. **Check device permissions** (Linux):
   ```bash
   # Add user to dialout group
   sudo usermod -a -G dialout $USER
   
   # Create udev rule
   echo 'SUBSYSTEM=="usb", ATTRS{idVendor}=="1b55", MODE="0666"' | sudo tee /etc/udev/rules.d/99-zkfinger.rules
   sudo udevadm control --reload-rules
   ```

### Port Already in Use

**Error: "Port 8080 is already in use"**

**Solution**: Change the port in configuration:

1. **Edit configuration file**:

   **Windows:**
   ```cmd
   notepad "C:\Program Files\Fingerprint Service\data\config.json"
   ```

   **Linux:**
   ```bash
   sudo nano /opt/fingerprint-service/config.json
   ```

2. **Change the port**:
   ```json
   {
     "server": {
       "port": 8081
     }
   }
   ```

3. **Restart the service**:

   **Windows:**
   ```cmd
   sc.exe stop FingerprintService
   sc.exe start FingerprintService
   ```

   **Linux:**
   ```bash
   sudo systemctl restart fingerprint-service
   ```

### Installation Fails

**Error: "Installation failed - missing dependencies"**

**Solution**: Install required dependencies:

**Windows:**
- Install [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
- Install [.NET Framework 4.8](https://dotnet.microsoft.com/download/dotnet-framework/net48)

**Linux:**
```bash
# Debian/Ubuntu
sudo apt install libusb-1.0-0 libudev1

# RHEL/CentOS
sudo yum install libusb libudev
```

### Permission Issues

**Error: "Cannot write to installation directory"**

**Solution**: 

**Windows:**
- Run installer as Administrator
- Or install to user directory (e.g., `C:\Users\YourName\FingerprintService`)

**Linux:**
```bash
# Fix permissions
sudo chown -R $USER:$USER /opt/fingerprint-service
```

## Configuration

After installation, you can customize the service configuration:

### Configuration File Location

**Windows:**
```
C:\Program Files\Fingerprint Service\data\config.json
```

**macOS:**
```
/usr/local/etc/fingerprint-service/config.json
```

**Linux:**
```
/opt/fingerprint-service/config.json
```

### Common Configuration Options

```json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0"
  },
  "cors": {
    "origins": ["https://your-app.com"]
  },
  "fingerprint": {
    "qualityThreshold": {
      "enrollment": 60,
      "verification": 50
    }
  },
  "rateLimit": {
    "api": {
      "windowMs": 60000,
      "maxRequests": 100
    }
  }
}
```

After changing configuration, restart the service for changes to take effect.

## Uninstallation

### Windows

**Using the Installer:**
1. Run the installer again
2. Select "Uninstall" option
3. Choose whether to keep data

**Manual:**
```cmd
# Stop service
sc.exe stop FingerprintService

# Delete service
sc.exe delete FingerprintService

# Remove files
rmdir /s "C:\Program Files\Fingerprint Service"
```

### macOS

```bash
# Stop service
brew services stop fingerprint-service

# Uninstall
brew uninstall fingerprint-service
```

### Linux

**Using package manager:**
```bash
sudo apt remove fingerprint-service
```

**Manual:**
```bash
# Stop and disable service
sudo systemctl stop fingerprint-service
sudo systemctl disable fingerprint-service

# Remove files
sudo rm -rf /opt/fingerprint-service
sudo rm /etc/systemd/system/fingerprint-service.service
sudo systemctl daemon-reload
```

## Next Steps

Now that you have the service installed:

1. [Set up authentication](./authentication.md) - Create API keys for your applications
2. [Quick Start Guide](./quick-start.md) - Make your first API call
3. [Web Admin Guide](../guides/web-admin.md) - Explore the web interface

## Security Notes

- **API Keys**: Keep your API keys secure and never commit them to version control
- **Admin Password**: Change the default admin password immediately after installation
- **Encryption**: Fingerprint templates are encrypted at rest using AES-256
- **Firewall**: Configure your firewall to restrict access to the service port
- **HTTPS**: In production, use a reverse proxy (nginx, Apache) with SSL/TLS

## System Requirements Summary

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10 64-bit | Windows 11 64-bit |
| RAM | 2GB | 4GB |
| Disk Space | 500MB | 1GB |
| CPU | Dual-core 2GHz | Quad-core 2.5GHz |
| Network | 100Mbps | 1Gbps |

## Support

If you encounter issues not covered in this guide:

- Check the [Troubleshooting Guide](../troubleshooting.md)
- Review service logs for error messages
- Ensure your device is properly connected
- Verify all prerequisites are met
