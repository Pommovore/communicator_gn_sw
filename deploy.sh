#!/bin/bash
# Script de déploiement local (sans SSH)
# Usage: ./deploy.sh

echo "=== Antigravity Deployment Script ==="

# 1. Build du client
echo ""
echo "[1/5] Building client..."
cd client || exit 1
npm run build
if [ $? -ne 0 ]; then
    echo "Client build failed!"
    exit 1
fi
cd ..

# 2. Création du dossier de déploiement
echo ""
echo "[2/5] Preparing deployment directory..."
DEPLOY_DIR="./deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# 3. Copie des fichiers serveur
echo ""
echo "[3/5] Copying server files..."
rsync -a --exclude='node_modules' --exclude='*.db' server/ "$DEPLOY_DIR/"

# 4. Copie du build client
echo ""
echo "[4/5] Copying client build..."
mkdir -p "$DEPLOY_DIR/public"
cp -r client/dist/* "$DEPLOY_DIR/public/"

# 5. Configuration
echo ""
echo "[5/5] Configuring..."
cat > "$DEPLOY_DIR/.env" << 'EOF'
PORT=3333
JWT_SECRET=maytheforcebewithyou
EOF

# Créer le script de démarrage
cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
npm install --production
pm2 stop antigravity 2>/dev/null || true
pm2 delete antigravity 2>/dev/null || true
pm2 start server.js --name antigravity
pm2 save
echo "Antigravity started on port 3333"
EOF

chmod +x "$DEPLOY_DIR/start.sh"

echo ""
echo "=== Deployment Complete ==="
echo "Deployment directory: $DEPLOY_DIR"
echo ""
echo "Next steps:"
echo "  1. cd deploy"
echo "  2. npm install --production"
echo "  3. node server.js"
echo ""
echo "Or use PM2:"
echo "  ./start.sh"
