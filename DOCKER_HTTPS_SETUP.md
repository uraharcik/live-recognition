# Docker Backend HTTPS Setup Guide

## Why HTTPS is Required

Your frontend runs on HTTPS and uses the camera (via `getUserMedia`), which browsers only allow over HTTPS. Therefore, the backend must also use HTTPS to avoid "Mixed Content" errors.

---

## Option 1: Self-Signed Certificate (Quick Setup for Development)

### Step 1: Generate Self-Signed Certificate

On the PC running Docker, create a directory for certificates:

```bash
mkdir -p ~/certs
cd ~/certs
```

Generate the certificate:

```bash
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout key.pem \
  -out cert.pem \
  -days 365 \
  -subj "/CN=172.31.46.109"
```

Replace `172.31.46.109` with your actual IP address.

### Step 2: Update Docker Configuration

If using **Docker Run**:

```bash
docker run -p 8000:8000 \
  -v ~/certs:/certs \
  -e SSL_CERT_FILE=/certs/cert.pem \
  -e SSL_KEY_FILE=/certs/key.pem \
  your-backend-image
```

If using **docker-compose.yml**:

```yaml
services:
  backend:
    image: your-backend-image
    ports:
      - "8000:8000"
    volumes:
      - ~/certs:/certs
    environment:
      - SSL_CERT_FILE=/certs/cert.pem
      - SSL_KEY_FILE=/certs/key.pem
```

### Step 3: Update Backend Code to Use HTTPS

Your backend application needs to be configured to use the SSL certificate. This depends on your framework:

**FastAPI/Uvicorn:**
```python
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        ssl_keyfile="/certs/key.pem",
        ssl_certfile="/certs/cert.pem"
    )
```

**Flask:**
```python
from flask import Flask
app = Flask(__name__)

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=8000,
        ssl_context=('/certs/cert.pem', '/certs/key.pem')
    )
```

### Step 4: Trust the Self-Signed Certificate

Since you're using a self-signed certificate, browsers will show a security warning. You need to accept it:

1. Visit `https://172.31.46.109:8000` in your browser
2. You'll see a warning: "Your connection is not private"
3. Click "Advanced" → "Proceed to 172.31.46.109 (unsafe)"
4. The certificate is now trusted for this session

**Make certificate permanently trusted:**

**On Mac:**
```bash
# Download the certificate
curl -k https://172.31.46.109:8000 > ~/certs/server.crt

# Add to keychain and trust
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/certs/cert.pem
```

**On Windows:**
1. Download `cert.pem` from the Docker host
2. Double-click the certificate
3. Click "Install Certificate"
4. Select "Local Machine" → "Place all certificates in the following store"
5. Choose "Trusted Root Certification Authorities"

---

## Option 2: Use NGINX as HTTPS Reverse Proxy (Recommended)

Instead of modifying your backend, use NGINX to handle HTTPS:

### Step 1: Create nginx.conf

Create `~/nginx-ssl/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 8000 ssl;
        server_name 172.31.46.109;

        ssl_certificate /etc/nginx/certs/cert.pem;
        ssl_certificate_key /etc/nginx/certs/key.pem;

        location / {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Step 2: Update docker-compose.yml

```yaml
version: '3'
services:
  backend:
    image: your-backend-image
    expose:
      - "8000"
    # Backend stays HTTP, NGINX handles HTTPS

  nginx:
    image: nginx:alpine
    ports:
      - "8000:8000"
    volumes:
      - ~/certs:/etc/nginx/certs
      - ~/nginx-ssl/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
```

### Step 3: Start the Services

```bash
docker-compose up -d
```

Now NGINX terminates SSL and forwards requests to your backend over HTTP internally.

---

## Option 3: Use mkcert (Easiest for Local Development)

### Step 1: Install mkcert

**On Mac:**
```bash
brew install mkcert
brew install nss  # For Firefox support
```

**On Windows:**
```bash
choco install mkcert
```

**On Linux:**
```bash
sudo apt install libnss3-tools
curl -Lo mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
chmod +x mkcert
sudo mv mkcert /usr/local/bin/
```

### Step 2: Install Local CA

```bash
mkcert -install
```

### Step 3: Generate Certificate

```bash
cd ~/certs
mkcert 172.31.46.109 localhost 127.0.0.1
```

This creates:
- `172.31.46.109+2.pem` (certificate)
- `172.31.46.109+2-key.pem` (private key)

### Step 4: Use with Docker

Follow the same Docker setup as Option 1, but use the mkcert-generated files:

```bash
docker run -p 8000:8000 \
  -v ~/certs:/certs \
  -e SSL_CERT_FILE=/certs/172.31.46.109+2.pem \
  -e SSL_KEY_FILE=/certs/172.31.46.109+2-key.pem \
  your-backend-image
```

**Advantage:** Browsers automatically trust mkcert certificates (no manual trust needed)!

---

## Testing the Setup

1. Restart the Docker backend with HTTPS enabled
2. Update `.env` to use `https://172.31.46.109:8000/api/v1`
3. Test the API directly: `curl -k https://172.31.46.109:8000/api/v1/health`
4. Run your frontend: `npm run dev`
5. Test camera access and image verification

---

## Troubleshooting

**"SSL certificate problem: self signed certificate"**
- Browser: Accept the certificate by visiting the URL manually
- curl: Use `-k` flag to skip verification

**"Connection refused"**
- Check Docker is listening on `0.0.0.0:8000`, not `127.0.0.1:8000`
- Verify firewall allows port 8000

**"Mixed Content" still appears**
- Make sure `.env` uses `https://` not `http://`
- Restart dev server after changing `.env`
- Clear browser cache

**Backend not accepting HTTPS connections**
- Verify SSL certificate files are mounted correctly in Docker
- Check backend logs for SSL configuration errors
- Make sure backend code reads SSL environment variables
