#!/bin/bash
# Script de vérification du déploiement Antigravity
# Usage: ./check-deployment.sh

echo "=== Antigravity Deployment Check ==="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Vérifier si le serveur tourne
echo "[1/6] Checking if server is running..."
if ps aux | grep -v grep | grep "node index.js" > /dev/null; then
    echo -e "${GREEN}✓ Server process is running${NC}"
    PID=$(ps aux | grep -v grep | grep "node index.js" | awk '{print $2}')
    echo "  PID: $PID"
else
    echo -e "${RED}✗ Server is NOT running${NC}"
    echo "  To start: cd /mnt/data/communicator_gn_sw && nohup node index.js > server.log 2>&1 &"
fi

# 2. Vérifier le port 3333
echo ""
echo "[2/6] Checking port 3333..."
if netstat -tlnp 2>/dev/null | grep ":3333" > /dev/null; then
    echo -e "${GREEN}✓ Port 3333 is listening${NC}"
    netstat -tlnp 2>/dev/null | grep ":3333"
else
    echo -e "${RED}✗ Port 3333 is NOT listening${NC}"
fi

# 3. Tester l'accès local
echo ""
echo "[3/6] Testing local access..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3333 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Server responds locally (HTTP $HTTP_CODE)${NC}"
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}✗ Cannot connect to server${NC}"
else
    echo -e "${YELLOW}⚠ Server responds with HTTP $HTTP_CODE${NC}"
fi

# 4. Vérifier les fichiers
echo ""
echo "[4/6] Checking files..."
if [ -f "/mnt/data/communicator_gn_sw/index.js" ]; then
    echo -e "${GREEN}✓ index.js exists${NC}"
else
    echo -e "${RED}✗ index.js NOT found${NC}"
fi

if [ -d "/mnt/data/communicator_gn_sw/public" ]; then
    echo -e "${GREEN}✓ public/ directory exists${NC}"
    FILE_COUNT=$(find /mnt/data/communicator_gn_sw/public -type f | wc -l)
    echo "  Files in public/: $FILE_COUNT"
else
    echo -e "${RED}✗ public/ directory NOT found${NC}"
fi

if [ -f "/mnt/data/communicator_gn_sw/.env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    echo "  PORT=$(grep PORT /mnt/data/communicator_gn_sw/.env | cut -d'=' -f2)"
else
    echo -e "${RED}✗ .env file NOT found${NC}"
fi

# 5. Vérifier le pare-feu
echo ""
echo "[5/6] Checking firewall..."
if command -v ufw &> /dev/null; then
    if sudo ufw status 2>/dev/null | grep "3333" > /dev/null; then
        echo -e "${GREEN}✓ Port 3333 is allowed in firewall${NC}"
    else
        echo -e "${YELLOW}⚠ Port 3333 NOT found in firewall rules${NC}"
        echo "  To fix: sudo ufw allow 3333"
    fi
else
    echo -e "${YELLOW}⚠ UFW not installed${NC}"
fi

# 6. Afficher les derniers logs
echo ""
echo "[6/6] Recent logs (last 10 lines)..."
if [ -f "/mnt/data/communicator_gn_sw/server.log" ]; then
    echo "---"
    tail -10 /mnt/data/communicator_gn_sw/server.log
    echo "---"
else
    echo -e "${YELLOW}⚠ No log file found${NC}"
fi

# Résumé
echo ""
echo "=== Summary ==="
echo "Server directory: /mnt/data/communicator_gn_sw"
echo "Access URL: https://minimoi.mynetgear.com:3333"
echo ""
echo "Useful commands:"
echo "  View logs: tail -f /mnt/data/communicator_gn_sw/server.log"
echo "  Restart: pkill -f 'node index.js' && cd /mnt/data/communicator_gn_sw && nohup node index.js > server.log 2>&1 &"
echo "  Stop: pkill -f 'node index.js'"
