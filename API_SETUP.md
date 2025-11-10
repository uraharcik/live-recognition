# API Configuration Guide

## Connecting to Docker Backend on Another PC

If your backend is running on a different PC (via Docker) on the same WiFi network, follow these steps:

### 1. Find the IP Address of the PC Running Docker

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually something like `192.168.1.100`)

**On Mac:**
```bash
ifconfig | grep "inet "
```
Or check System Preferences → Network. Look for an IP like `192.168.1.100`

**On Linux:**
```bash
ip addr show
# or
hostname -I
```

### 2. Configure the Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and configure both the API URL and API key:
   ```env
   VITE_API_BASE_URL=https://192.168.1.100:8000/api/v1
   VITE_API_KEY=your-actual-api-key-here
   ```
   Replace:
   - `192.168.1.100` with the actual IP address from step 1
   - `your-actual-api-key-here` with the API key provided by your backend service

### 3. Make Sure Docker is Accessible

On the PC running Docker, ensure the container is bound to `0.0.0.0` (not just `127.0.0.1`):

```bash
docker run -p 0.0.0.0:8000:8000 your-image
```

Or in `docker-compose.yml`:
```yaml
ports:
  - "0.0.0.0:8000:8000"
```

### 4. Check Firewall Settings

Make sure the PC running Docker allows incoming connections on port 8000:

**Windows:**
- Windows Defender Firewall → Allow an app through firewall
- Add port 8000 for both Private and Public networks

**Mac:**
- System Preferences → Security & Privacy → Firewall → Firewall Options
- Unblock the application or allow incoming connections

**Linux:**
```bash
sudo ufw allow 8000
```

### 5. Start the Development Server

```bash
npm run dev
```

The app will now connect to the Docker backend on the other PC!

### Troubleshooting

**Connection refused:**
- Check if Docker container is running: `docker ps`
- Verify the IP address is correct
- Ping the Docker host: `ping 192.168.1.100`

**CORS errors:**
- Make sure your backend allows CORS from your frontend origin
- Backend should include appropriate CORS headers

**Timeout errors:**
- Both PCs must be on the same network
- Check firewall settings on the Docker host PC
