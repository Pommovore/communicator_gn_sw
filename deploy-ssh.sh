#!/bin/bash
# Déploiement automatisé Antigravity via SSH (Linux/Mac)

USERNAME="jack"
HOST="minimoi.mynetgear.com"
REMOTE_PATH="/mnt/data/communicator_gn_sw"

echo "=== Antigravity Deployment (HTTPS) ==="

# 1. Build Client
echo "[1/4] Building Client..."
cd client
npm run build
cd ..

# 2. Créer l'archive
echo "[2/4] Creating archive..."
rm -rf deploy_temp
mkdir -p deploy_temp
cp -r server/* deploy_temp/
mkdir -p deploy_temp/public
cp -r client/dist/* deploy_temp/public/

tar -czf deploy.tar.gz -C deploy_temp .
rm -rf deploy_temp

# 3. Transfert
echo "[3/4] Uploading..."
scp deploy.tar.gz $USERNAME@$HOST:/tmp/antigravity_deploy.tar.gz
rm deploy.tar.gz

# 4. Exécution distante
echo "[4/4] Remote execution..."
ssh $USERNAME@$HOST << EOF
    echo '--- Stopping Server ---'
    pkill -f 'node index' || true

    echo '--- Backing up config ---'
    mkdir -p $REMOTE_PATH/ssl
    cp $REMOTE_PATH/.env $REMOTE_PATH/.env.bak 2>/dev/null || true

    echo '--- Cleaning old files (keeping ssl and uploads) ---'
    find $REMOTE_PATH -maxdepth 1 -not -name 'ssl' -not -name 'uploads' -not -name '.env' -not -name 'node_modules' -not -name '.' -not -name '..' -exec rm -rf {} +

    echo '--- Extracting new files ---'
    mkdir -p $REMOTE_PATH
    tar -xzf /tmp/antigravity_deploy.tar.gz -C $REMOTE_PATH

    echo '--- Configuring HTTPS ---'
    if ! grep -q 'SSL_KEY_PATH' $REMOTE_PATH/.env; then
        echo '' >> $REMOTE_PATH/.env
        echo 'SSL_KEY_PATH=$REMOTE_PATH/ssl/key.pem' >> $REMOTE_PATH/.env
        echo 'SSL_CERT_PATH=$REMOTE_PATH/ssl/cert.pem' >> $REMOTE_PATH/.env
    fi

    echo '--- Installing dependencies ---'
    cd $REMOTE_PATH
    npm install --production --no-audit --no-fund

    echo '--- Starting Server ---'
    nohup node index.js > server.log 2>&1 &
    sleep 2
    ps aux | grep 'node index' | grep -v grep
EOF

echo "=== Deployment Complete! ==="
