# Script de démarrage pour la production
# Usage: .\start-production.ps1

Write-Host "=== Starting Antigravity Production Server ===" -ForegroundColor Cyan

# Vérifier si le dossier deploy existe
if (-not (Test-Path ".\deploy")) {
    Write-Host "Deployment directory not found. Please run .\deploy.ps1 first." -ForegroundColor Red
    exit 1
}

# Aller dans le dossier deploy
Set-Location deploy

# Installer les dépendances si nécessaire
if (-not (Test-Path ".\node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install --production
}

# Démarrer le serveur
Write-Host "`nStarting server on port 3333..." -ForegroundColor Green
Write-Host "Access at: https://minimoi.mynetgear.com:3333" -ForegroundColor Cyan
node server.js
