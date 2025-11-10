#!/bin/bash

# Live Recognition - Docker Deployment Script

set -e  # Exit on error

echo "🚀 Live Recognition - Docker Deployment"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ Please edit .env and set your backend API URL"
    echo "   Example: VITE_API_BASE_URL=https://172.31.46.109:8000/api/v1"
    read -p "Press Enter to continue after editing .env..."
fi

# Check if certs directory exists
if [ ! -d certs ]; then
    echo "⚠️  Warning: certs/ directory not found"
    echo "📝 Creating certs directory..."
    mkdir -p certs
fi

# Check if certificates exist
if [ ! -f certs/cert.pem ] || [ ! -f certs/key.pem ]; then
    echo "⚠️  Warning: SSL certificates not found"
    echo ""
    echo "🔐 Generating self-signed certificates..."

    # Check if mkcert is installed
    if command -v mkcert &> /dev/null; then
        echo "✅ Using mkcert to generate trusted certificates..."
        cd certs
        mkcert localhost 127.0.0.1 ::1
        # Rename to standard names
        mv localhost+*.pem cert.pem 2>/dev/null || true
        mv localhost+*-key.pem key.pem 2>/dev/null || true
        cd ..
    else
        echo "ℹ️  mkcert not found. Using openssl for self-signed certificate..."
        openssl req -x509 -newkey rsa:4096 -nodes \
            -keyout certs/key.pem \
            -out certs/cert.pem \
            -days 365 \
            -subj "/CN=localhost"
        echo "⚠️  Note: Browser will show security warning. Click 'Advanced' → 'Proceed'"
    fi
    echo "✅ Certificates generated"
fi

echo ""
echo "🔨 Building Docker image..."
docker-compose build

echo ""
echo "🚀 Starting container..."
docker-compose up -d

echo ""
echo "⏳ Waiting for container to be healthy..."
sleep 5

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Container is running!"
    echo ""
    echo "📱 Access the app at:"
    echo "   Local:   https://localhost/live-recognition/"

    # Try to get local IP
    if command -v hostname &> /dev/null; then
        LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
        if [ ! -z "$LOCAL_IP" ]; then
            echo "   Network: https://$LOCAL_IP/live-recognition/"
        fi
    fi

    echo ""
    echo "📋 Useful commands:"
    echo "   View logs:    docker-compose logs -f"
    echo "   Stop:         docker-compose down"
    echo "   Rebuild:      docker-compose up -d --build"
    echo "   Health check: docker ps"
else
    echo "❌ Error: Container failed to start"
    echo "📋 Check logs with: docker-compose logs"
    exit 1
fi

echo ""
echo "✅ Deployment complete!"
