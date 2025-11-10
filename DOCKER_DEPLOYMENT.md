# Docker Deployment Guide

This guide covers how to deploy the Live Recognition frontend application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (comes with Docker Desktop)
- SSL certificates (see [DOCKER_HTTPS_SETUP.md](./DOCKER_HTTPS_SETUP.md) for setup)

---

## Quick Start

### 1. Generate SSL Certificates

The app requires HTTPS for camera access. Generate certificates using mkcert (easiest):

```bash
# Install mkcert (if not already installed)
brew install mkcert  # Mac
# OR
choco install mkcert  # Windows
# OR
sudo apt install mkcert  # Linux

# Install local CA
mkcert -install

# Create certs directory and generate certificate
mkdir -p certs
cd certs
mkcert localhost 127.0.0.1 ::1 $(hostname -I | awk '{print $1}')
cd ..
```

This creates:
- `localhost+3.pem` (certificate)
- `localhost+3-key.pem` (private key)

Rename them for simplicity:
```bash
cd certs
mv localhost+*.pem cert.pem
mv localhost+*-key.pem key.pem
cd ..
```

### 2. Configure Environment

Create/update `.env` with your backend API URL:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=https://172.31.46.109:8000/api/v1
```

**Important:** The environment variables must be set at **build time** for Vite. If you change `.env`, you need to rebuild the Docker image.

### 3. Build and Run

```bash
# Build the Docker image
docker-compose build

# Start the container
docker-compose up -d

# View logs
docker-compose logs -f
```

The app will be available at:
- **https://localhost/live-recognition/** (if accessing locally)
- **https://YOUR_IP/live-recognition/** (if accessing from another device)

### 4. Access from Another Device

Find your machine's IP:
```bash
# Mac/Linux
hostname -I | awk '{print $1}'

# Windows
ipconfig | findstr IPv4
```

Then access: `https://YOUR_IP/live-recognition/`

You'll need to accept the self-signed certificate in your browser.

---

## Docker Commands

### Build the Image

```bash
docker-compose build
```

Or build directly with Docker:
```bash
docker build -t live-recognition-frontend .
```

### Run the Container

```bash
# Using docker-compose (recommended)
docker-compose up -d

# Or using docker directly
docker run -d \
  -p 443:443 \
  -v $(pwd)/certs:/etc/nginx/certs:ro \
  --name live-recognition-frontend \
  live-recognition-frontend
```

### View Logs

```bash
docker-compose logs -f
# OR
docker logs -f live-recognition-frontend
```

### Stop the Container

```bash
docker-compose down
# OR
docker stop live-recognition-frontend
```

### Rebuild After Code Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Or force rebuild
docker-compose build --no-cache
docker-compose up -d
```

---

## Environment Variables

Environment variables are **baked into the build** at build time. To change them:

1. Update `.env` file
2. Rebuild the image: `docker-compose build`
3. Restart container: `docker-compose up -d`

### Available Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000/api/v1` | `https://172.31.46.109:8000/api/v1` |

---

## Production Deployment

### Using a Reverse Proxy (Recommended)

For production, use a reverse proxy like Traefik or Caddy to handle SSL:

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: live-recognition-frontend
    expose:
      - "80"
    environment:
      - NODE_ENV=production
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.live-recognition.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.live-recognition.tls.certresolver=letsencrypt"
    restart: unless-stopped
    networks:
      - web

networks:
  web:
    external: true
```

### Using Let's Encrypt (Free SSL)

If you have a domain name, use Certbot for free SSL:

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./certs/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./certs/key.pem
sudo chmod 644 ./certs/*.pem
```

Then deploy normally with docker-compose.

---

## Troubleshooting

### "Certificate error" in browser

**Cause:** Self-signed certificate not trusted

**Solution:**
1. Visit `https://localhost/live-recognition/`
2. Click "Advanced" → "Proceed to localhost (unsafe)"
3. Or permanently trust the certificate (see [DOCKER_HTTPS_SETUP.md](./DOCKER_HTTPS_SETUP.md))

### "Connection refused" on port 443

**Cause:** Port 443 already in use or firewall blocking

**Solution:**
```bash
# Check what's using port 443
sudo lsof -i :443

# Or change to another port in docker-compose.yml
ports:
  - "8443:443"  # Access via https://localhost:8443/live-recognition/
```

### Camera not working

**Cause:** Not using HTTPS or wrong origin

**Solution:**
- Ensure you're accessing via `https://` (not `http://`)
- Browser must trust the SSL certificate
- Grant camera permissions when prompted

### API calls failing

**Cause:** Wrong API URL or backend not accessible

**Solution:**
1. Check `.env` has correct `VITE_API_BASE_URL`
2. Verify backend is running: `curl -k https://172.31.46.109:8000/api/v1/health`
3. Check CORS headers on backend allow your origin
4. Rebuild after changing `.env`: `docker-compose up -d --build`

### Changes not reflecting

**Cause:** Docker using cached build

**Solution:**
```bash
# Force rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

### Container exits immediately

**Cause:** SSL certificate files missing

**Solution:**
```bash
# Check certificates exist
ls -la certs/

# Should show:
# cert.pem
# key.pem

# Check container logs
docker-compose logs
```

---

## File Structure

```
.
├── Dockerfile              # Multi-stage build configuration
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore          # Files to exclude from build
├── nginx.conf             # NGINX server configuration
├── certs/                 # SSL certificates (not in git)
│   ├── cert.pem
│   └── key.pem
├── .env                   # Environment variables (not in git)
└── src/                   # Application source code
```

---

## Optimization Tips

### Reduce Image Size

The Dockerfile uses multi-stage builds, but you can optimize further:

```dockerfile
# Use Alpine Linux (smaller base image)
FROM node:20-alpine AS builder

# Install only production dependencies after build
RUN npm ci --only=production
```

### Enable Better Caching

```dockerfile
# Copy package files first (better layer caching)
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

### Use BuildKit

```bash
# Enable BuildKit for faster builds
DOCKER_BUILDKIT=1 docker-compose build
```

---

## Health Checks

The container includes a health check that runs every 30 seconds:

```bash
# Check container health
docker ps

# Should show "healthy" in STATUS column
```

If unhealthy:
```bash
# Inspect health check logs
docker inspect live-recognition-frontend | grep -A 10 Health
```

---

## Scaling

To run multiple instances (e.g., with load balancer):

```bash
# Scale to 3 instances
docker-compose up -d --scale frontend=3
```

You'll need a load balancer (like NGINX or HAProxy) in front.

---

## Security Checklist

- ✓ SSL/TLS enabled (HTTPS only)
- ✓ Security headers configured in nginx.conf
- ✓ No sensitive data in environment variables
- ✓ `.env` and `certs/` in `.gitignore`
- ✓ Container runs as non-root user (nginx)
- ✓ Multi-stage build (no build tools in final image)
- ✓ Health checks enabled

---

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify certificates: `ls -la certs/`
3. Test API connectivity: `curl -k $VITE_API_BASE_URL`
4. See [DOCKER_HTTPS_SETUP.md](./DOCKER_HTTPS_SETUP.md) for SSL issues
5. See [API_SETUP.md](./API_SETUP.md) for backend connection issues
