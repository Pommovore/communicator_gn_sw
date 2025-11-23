#!/bin/bash
# Script automatique pour configurer Let's Encrypt avec Node.js
# Usage: bash setup-letsencrypt-node.sh votre@email.com

if [ -z "$1" ]; then
    echo "Usage: bash setup-letsencrypt-node.sh votre@email.com"
    exit 1
fi

EMAIL=$1
DOMAIN="minimoi.mynetgear.com"
APP_DIR="/mnt/data/communicator_gn_sw"

echo "=== Antigravity Let's Encrypt Setup ==="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# 1. Vérifier si le certificat existe déjà
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "✓ Certificate already exists for $DOMAIN"
else
    echo "[1/4] Obtaining Let's Encrypt certificate..."
    sudo certbot certonly --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to obtain certificate"
        exit 1
    fi
fi

# 2. Créer le dossier SSL et copier les certificats
echo "[2/4] Copying certificates..."
mkdir -p $APP_DIR/ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $APP_DIR/ssl/key.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $APP_DIR/ssl/cert.pem
sudo chown jack:jack $APP_DIR/ssl/*.pem
chmod 600 $APP_DIR/ssl/*.pem

echo "✓ Certificates copied"

# 3. Créer le hook de renouvellement
echo "[3/4] Setting up auto-renewal hook..."
sudo tee /etc/letsencrypt/renewal-hooks/deploy/antigravity.sh > /dev/null <<EOF
#!/bin/bash
# Auto-renewal hook for Antigravity
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $APP_DIR/ssl/key.pem
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $APP_DIR/ssl/cert.pem
chown jack:jack $APP_DIR/ssl/*.pem
chmod 600 $APP_DIR/ssl/*.pem

# Restart server
pkill -f "node index-https.js"
cd $APP_DIR
sudo -u jack nohup node index-https.js > server.log 2>&1 &
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/antigravity.sh

echo "✓ Auto-renewal configured"

# 4. Vérifier que index-https.js existe, sinon le créer
if [ ! -f "$APP_DIR/index-https.js" ]; then
    echo "[4/4] Creating index-https.js..."
    # Le fichier sera créé par le script setup-https-port3333.sh
    echo "⚠ index-https.js not found. Run setup-https-port3333.sh first."
else
    echo "[4/4] Restarting server with Let's Encrypt certificate..."
    pkill -f "node index" 2>/dev/null
    sleep 1
    cd $APP_DIR
    nohup node index-https.js > server.log 2>&1 &
    
    sleep 2
    
    if ps aux | grep -v grep | grep "node index-https.js" > /dev/null; then
        echo "✓ Server is running"
        echo ""
        echo "=== SUCCESS ==="
        echo "Access your application at: https://$DOMAIN:3333"
        echo "Certificate will auto-renew every 90 days"
    else
        echo "✗ Server failed to start. Check logs:"
        tail -20 $APP_DIR/server.log
    fi
fi
