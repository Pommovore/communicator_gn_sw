# Guide de Déploiement Antigravity

## Déploiement sur https://minimoi.mynetgear.com:3333

### Prérequis
- Node.js installé sur le serveur
- Accès au serveur via SSH ou bureau à distance
- Port 3333 ouvert sur le routeur/firewall

### Étapes de Déploiement

#### 1. Préparation locale
```powershell
# Exécuter le script de déploiement
.\deploy.ps1
```

Ce script va :
- Builder le client React
- Copier tous les fichiers nécessaires dans `./deploy`
- Configurer le serveur pour le port 3333
- Créer un serveur unifié qui sert à la fois l'API et le client

#### 2. Transfert vers le serveur
Transférez le contenu du dossier `deploy` vers votre serveur :
```powershell
# Exemple avec SCP (si disponible)
scp -r deploy/* user@minimoi.mynetgear.com:/path/to/antigravity/
```

Ou utilisez un client FTP/SFTP comme FileZilla.

#### 3. Installation sur le serveur
Sur le serveur, dans le dossier de déploiement :
```bash
npm install --production
```

#### 4. Démarrage du serveur

**Option A : Démarrage simple**
```bash
node server.js
```

**Option B : Avec PM2 (recommandé pour production)**
```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer l'application
pm2 start server.js --name antigravity

# Sauvegarder la configuration
pm2 save

# Configurer le démarrage automatique
pm2 startup
```

**Option C : Avec Windows (si serveur Windows)**
```powershell
# Utiliser le script fourni
.\start-production.ps1
```

### Configuration HTTPS

Pour utiliser HTTPS avec votre domaine `minimoi.mynetgear.com`, vous avez deux options :

#### Option 1 : Reverse Proxy (Recommandé)
Utilisez nginx ou Apache comme reverse proxy avec SSL :

**Nginx exemple :**
```nginx
server {
    listen 3333 ssl;
    server_name minimoi.mynetgear.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option 2 : HTTPS Direct dans Node.js
Modifiez `server.js` pour utiliser HTTPS :
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/path/to/key.pem'),
  cert: fs.readFileSync('/path/to/cert.pem')
};

const server = https.createServer(options, app);
```

### Accès à l'application
Une fois déployé, l'application sera accessible à :
- **URL** : https://minimoi.mynetgear.com:3333
- **Login Opérateur** : 
  - Username: `Operator`
  - Password: `r2d2+C3PO=SW`

### Maintenance

**Voir les logs (avec PM2) :**
```bash
pm2 logs antigravity
```

**Redémarrer l'application :**
```bash
pm2 restart antigravity
```

**Arrêter l'application :**
```bash
pm2 stop antigravity
```

### Mise à jour
Pour mettre à jour l'application :
1. Exécutez `.\deploy.ps1` localement
2. Transférez les nouveaux fichiers
3. Redémarrez le serveur avec `pm2 restart antigravity`

### Dépannage

**Le serveur ne démarre pas :**
- Vérifiez que le port 3333 n'est pas déjà utilisé : `netstat -ano | findstr :3333`
- Vérifiez les logs d'erreur

**Impossible d'accéder depuis l'extérieur :**
- Vérifiez que le port 3333 est ouvert dans le pare-feu
- Vérifiez la configuration du routeur (port forwarding)
- Vérifiez que le serveur écoute sur 0.0.0.0 et non localhost

**WebSocket ne fonctionne pas :**
- Assurez-vous que le reverse proxy (si utilisé) supporte WebSocket
- Vérifiez la configuration CORS dans `server.js`
