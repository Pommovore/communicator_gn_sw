#!/bin/bash
# Script de diagnostic et réparation automatique
# Usage: bash fix-server.sh

echo "=== Antigravity Auto-Fix Script ==="

# 1. Arrêter les processus existants
echo "[1/5] Stopping existing processes..."
pkill -f "node index.js" 2>/dev/null
sleep 1

# 2. Vérifier les fichiers
echo "[2/5] Checking files..."
cd /mnt/data/communicator_gn_sw

if [ ! -f "index.js" ]; then
    echo "ERROR: index.js not found!"
    exit 1
fi

if [ ! -d "public" ]; then
    echo "ERROR: public/ directory not found!"
    exit 1
fi

# 3. Vérifier que la ligne express.static existe
echo "[3/5] Checking express.static configuration..."
if ! grep -q "express.static(path.join(__dirname, 'public'))" index.js; then
    echo "Adding express.static for public directory..."
    sed -i "/app.use('\/uploads', express.static(UPLOAD_DIR));/a app.use(express.static(path.join(__dirname, 'public')));" index.js
fi

# 4. Démarrer le serveur
echo "[4/5] Starting server..."
cd /mnt/data/communicator_gn_sw
nohup node index.js > server.log 2>&1 &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

# 5. Attendre et vérifier
echo "[5/5] Waiting for server to start..."
sleep 3

# Vérifier que le processus tourne
if ps -p $SERVER_PID > /dev/null; then
    echo "✓ Server process is running (PID: $SERVER_PID)"
else
    echo "✗ Server process died! Checking logs..."
    tail -20 server.log
    exit 1
fi

# Vérifier que le port écoute
if netstat -tlnp 2>/dev/null | grep ":3333" > /dev/null; then
    echo "✓ Port 3333 is listening"
else
    echo "✗ Port 3333 is NOT listening"
    tail -20 server.log
    exit 1
fi

# Tester l'accès HTTP
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3333 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Server responds with HTTP 200"
    echo ""
    echo "=== SUCCESS ==="
    echo "Server is running and accessible!"
    echo "Access at: https://minimoi.mynetgear.com:3333"
    echo ""
    echo "To view logs: tail -f /mnt/data/communicator_gn_sw/server.log"
    echo "To stop: pkill -f 'node index.js'"
else
    echo "⚠ Server responds with HTTP $HTTP_CODE"
    echo "First 10 lines of response:"
    curl -s http://localhost:3333 | head -10
fi

echo ""
echo "Recent logs:"
tail -10 server.log
