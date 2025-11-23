# Antigravity - Scripts de Déploiement

Ce projet contient des scripts de déploiement pour **Windows** et **Linux/macOS**.

## 📁 Scripts disponibles

### Windows (PowerShell)
- `deploy.ps1` - Déploiement local
- `deploy-ssh.ps1` - Déploiement automatique via SSH
- `start-production.ps1` - Démarrage en production

### Linux/macOS (Bash)
- `deploy.sh` - Déploiement local
- `deploy-ssh.sh` - Déploiement automatique via SSH

## 🚀 Utilisation

### Sur Windows
```powershell
# Déploiement local
.\deploy.ps1

# Déploiement SSH automatique
.\deploy-ssh.ps1

# Avec paramètres personnalisés
.\deploy-ssh.ps1 -Username admin -ServerHost minimoi.mynetgear.com
```

### Sur Linux/macOS
```bash
# Rendre les scripts exécutables (première fois seulement)
chmod +x deploy.sh deploy-ssh.sh

# Déploiement local
./deploy.sh

# Déploiement SSH automatique
./deploy-ssh.sh

# Avec paramètres personnalisés
./deploy-ssh.sh admin minimoi.mynetgear.com /opt/communicator_gn_sw
```

## 📖 Documentation complète

- **Windows** : Voir `README-SSH-DEPLOYMENT.md`
- **Linux/macOS** : Les mêmes instructions s'appliquent

## 🔧 Prérequis

### Machine de développement
- Node.js installé
- SSH client (inclus par défaut sur Linux/macOS/Windows 10+)
- rsync (recommandé, inclus sur Linux/macOS)

### Serveur de production (Ubuntu 20)
```bash
# Installation de Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installation de PM2
sudo npm install -g pm2

# Création du répertoire
sudo mkdir -p /opt/communicator_gn_sw
sudo chown $USER:$USER /opt/communicator_gn_sw

# Ouverture du port
sudo ufw allow 3333
```

## 🌐 Accès après déploiement

L'application sera accessible à :
**https://minimoi.mynetgear.com:3333**

Login Opérateur :
- Username: `Operator`
- Password: `r2d2+C3PO=SW`

## 🔄 Workflow recommandé

1. **Développement** : `npm run dev` (client) + `npm start` (server)
2. **Test local** : Tester avant de déployer
3. **Déploiement** : `./deploy-ssh.sh` (Linux) ou `.\deploy-ssh.ps1` (Windows)
4. **Vérification** : Accéder à l'URL de production
