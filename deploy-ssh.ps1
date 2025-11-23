<#
.SYNOPSIS
    Déploiement ROBUSTE Antigravity via SSH (Windows/PowerShell)
.DESCRIPTION
    Déploie l'application Antigravity sur un serveur Linux via SSH.
    Gère le build, le nettoyage, la sauvegarde des données et le redémarrage.
#>

param (
    [string]$Username = "jack",
    [string]$ServerHost = "minimoi.mynetgear.com",
    [string]$RemotePath = "/mnt/data/communicator_gn_sw",
    [string]$Port = "3333"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Antigravity Deployment (ROBUST) ===" -ForegroundColor Cyan

# 1. Build Client
Write-Host "[1/5] Building Client..." -ForegroundColor Yellow
Set-Location "client"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Client build failed!"; exit 1 }
Set-Location ".."

# 2. Préparation de l'archive
Write-Host "[2/5] Preparing deployment archive..." -ForegroundColor Yellow
$deployDir = "deploy_temp"
if (Test-Path $deployDir) { 
    Start-Sleep -Milliseconds 500
    try { Remove-Item $deployDir -Recurse -Force -ErrorAction SilentlyContinue } catch {}
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# Copier Server (sans node_modules ni .env local)
Copy-Item "server\*" -Destination $deployDir -Recurse
if (Test-Path "$deployDir\node_modules") { 
    try { Remove-Item "$deployDir\node_modules" -Recurse -Force -ErrorAction SilentlyContinue } catch {}
}
if (Test-Path "$deployDir\.env") { Remove-Item "$deployDir\.env" -Force }

# Copier Client Build dans public
if (Test-Path "$deployDir\public") { Remove-Item "$deployDir\public" -Recurse -Force }
New-Item -ItemType Directory -Path "$deployDir\public" | Out-Null
Copy-Item "client\dist\*" -Destination "$deployDir\public" -Recurse

# Créer l'archive tar
Write-Host "Creating tar.gz archive..."
tar -czf deploy.tar.gz -C $deployDir .

# 3. Transfert
Write-Host "[3/5] Uploading archive to $ServerHost..." -ForegroundColor Yellow
scp deploy.tar.gz "$Username@${ServerHost}:/tmp/antigravity_deploy.tar.gz"
if ($LASTEXITCODE -ne 0) { Write-Error "Upload failed!"; exit 1 }

# 4. Exécution distante
Write-Host "[4/5] Executing remote deployment script..." -ForegroundColor Yellow

$remoteScript = @"
set -e # Arrêter en cas d'erreur

echo '--- [REMOTE] Stopping Server ---'
pkill -f 'node index' || true
sleep 2
# Forcer si nécessaire
if pgrep -f 'node index' > /dev/null; then
    echo 'Force killing...'
    pkill -9 -f 'node index' || true
fi

echo '--- [REMOTE] Backing up data ---'
mkdir -p $RemotePath
cd $RemotePath

# Créer les dossiers s'ils n'existent pas
mkdir -p ssl uploads data

# Sauvegarder .env s'il existe
if [ -f .env ]; then
    cp .env .env.bak
fi

echo '--- [REMOTE] Cleaning old files ---'
# Supprimer tout SAUF les dossiers de données et config
find . -maxdepth 1 -not -name 'ssl' -not -name 'uploads' -not -name 'data' -not -name '.env' -not -name '.' -not -name '..' -exec rm -rf {} +

echo '--- [REMOTE] Extracting new version ---'
tar -xzf /tmp/antigravity_deploy.tar.gz -C .

echo '--- [REMOTE] Configuring Environment ---'
# S'assurer que .env contient les bonnes configs
if [ ! -f .env ]; then
    echo 'Creating default .env'
    echo 'PORT=$Port' > .env
    echo 'JWT_SECRET=antigravity_secret_key_change_me' >> .env
fi

# Ajouter config SSL si manquante
if ! grep -q 'SSL_KEY_PATH' .env; then
    echo '' >> .env
    echo 'SSL_KEY_PATH=$RemotePath/ssl/key.pem' >> .env
    echo 'SSL_CERT_PATH=$RemotePath/ssl/cert.pem' >> .env
fi

# S'assurer que le port est bon
sed -i 's/^PORT=.*/PORT=$Port/' .env

echo '--- [REMOTE] Installing Dependencies ---'
npm install --production --no-audit --no-fund

echo '--- [REMOTE] Starting Server ---'
nohup node index.js > server.log 2>&1 &

echo '--- [REMOTE] Verifying Deployment ---'
sleep 3
if pgrep -f 'node index' > /dev/null; then
    echo 'Server is RUNNING!'
    ps aux | grep 'node index' | grep -v grep
else
    echo 'Server FAILED to start!'
    cat server.log
    exit 1
fi
"@

# Conversion des fins de ligne pour Linux
$remoteScriptUnix = $remoteScript -replace "`r`n", "`n"
$remoteScriptUnix | ssh "$Username@$ServerHost" "bash -s"

# 5. Nettoyage local
Write-Host "[5/5] Cleaning up local files..." -ForegroundColor Yellow
Remove-Item $deployDir -Recurse -Force
Remove-Item deploy.tar.gz -Force

Write-Host "=== Deployment SUCCESS! ===" -ForegroundColor Green
Write-Host "URL: https://${ServerHost}:${Port}"
