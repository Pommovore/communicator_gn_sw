#!/bin/bash
# Script d'installation automatique HTTPS pour Antigravity
# Usage: bash setup-https.sh votre@email.com

if [ -z "$1" ]; then
    echo "Usage: bash setup-https.sh votre@email.com"
    exit 1
fi

EMAIL=$1
DOMAIN="minimoi.mynetgear.com"

echo "=== Antigravity HTTPS Setup ==="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# 1. Installer Nginx et Certbot
echo "[1/5] Installing Nginx and Certbot..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# 2. Créer la configuration Nginx
echo "[2/5] Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/antigravity > /dev/null <<'EOF'
server {
    listen 80;
    server_name minimoi.mynetgear.com;
    
    # Temporairement pour Certbot
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name minimoi.mynetgear.com;

    ssl_certificate /etc/letsencrypt/live/minimoi.mynetgear.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/minimoi.mynetgear.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;

    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# 3. Activer la configuration
echo "[3/5] Enabling Nginx configuration..."
sudo ln -sf /etc/nginx/sites-available/antigravity /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "ERROR: Nginx configuration test failed!"
    exit 1
fi

# Redémarrer Nginx
sudo systemctl restart nginx

# 4. Ouvrir les ports dans le pare-feu
echo "[4/5] Opening firewall ports..."
sudo ufw allow 'Nginx Full'
sudo ufw allow 80
sudo ufw allow 443

# 5. Obtenir le certificat SSL
echo "[5/5] Obtaining SSL certificate..."
echo ""
echo "IMPORTANT: Make sure ports 80 and 443 are forwarded to this server in your router!"
echo "Press Enter to continue or Ctrl+C to cancel..."
read

sudo certbot certonly --nginx -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo "=== SUCCESS ==="
    echo "HTTPS is now configured!"
    echo "Access your application at: https://$DOMAIN"
    echo ""
    echo "Certificate will auto-renew. To test renewal:"
    echo "  sudo certbot renew --dry-run"
else
    echo ""
    echo "=== ERROR ==="
    echo "Certificate generation failed. Check:"
    echo "1. Port 80 and 443 are open and forwarded"
    echo "2. Domain $DOMAIN points to your public IP"
    echo "3. Logs: sudo tail -f /var/log/letsencrypt/letsencrypt.log"
fi
