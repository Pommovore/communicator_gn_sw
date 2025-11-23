# 🚀 Antigravity - Secure Communication Platform

[![GitHub](https://img.shields.io/badge/GitHub-Pommovore%2Fcommunicator__gn__sw-blue?logo=github)](https://github.com/Pommovore/communicator_gn_sw)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue?logo=react)](https://reactjs.org/)
[![Tests](https://img.shields.io/badge/Tests-17%2F17%20passing-success)](./VALIDATION-REPORT.md)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

Application de communication sécurisée avec gestion de contacts, documents et permissions, inspirée de l'univers Star Wars.

## ✨ Fonctionnalités

- 🔐 **Authentification sécurisée** avec JWT
- 👥 **Gestion d'utilisateurs** avec rôles (OPERATOR, ADMIN, PJ, PNJ)
- 📱 **Contacts bidirectionnels** via QR codes
- 📁 **Partage de documents** (texte, image, vidéo, audio)
- 🎥 **Capture média** (caméra, micro)
- 🔒 **Permissions granulaires** sur les documents
- 🌐 **Interface admin** complète
- 🔄 **Notifications temps réel** (Socket.IO)
- 🔐 **HTTPS** avec Let's Encrypt

## 🛠️ Stack Technique

### Frontend
- **React** 18.x
- **Vite** 5.x (build tool)
- **Socket.IO Client** (temps réel)
- **QRCode** (génération QR codes)

### Backend
- **Node.js** 18+
- **Express** 4.x
- **Socket.IO** (WebSocket)
- **NeDB** (base de données embarquée)
- **bcryptjs** (hashing mots de passe)
- **JWT** (authentification)
- **Multer** (upload fichiers)

## 📋 Prérequis

- Node.js 18+ et npm
- Git
- (Production) Serveur Linux avec accès SSH

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd communicator_gn_sw
```

### 2. Installer les dépendances

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 3. Configuration

Créer un fichier `.env` dans le dossier `server/` :

```env
PORT=3333
JWT_SECRET=votre_secret_jwt_tres_securise
SSL_KEY_PATH=/chemin/vers/ssl/key.pem
SSL_CERT_PATH=/chemin/vers/ssl/cert.pem
```

## 🏃 Démarrage

### Mode Développement

```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend
cd client
npm run dev
```

Accès : http://localhost:5173

### Mode Production

```bash
# Build du client
cd client
npm run build

# Copier le build dans server/public
cp -r dist/* ../server/public/

# Démarrer le serveur
cd ../server
npm install --production
node index.js
```

Accès : https://votre-domaine.com:3333

## 📦 Déploiement

### Déploiement SSH Automatisé

```bash
# Windows (PowerShell)
.\deploy-ssh.ps1

# Linux/Mac (Bash)
./deploy-ssh.sh
```

Voir [README-SSH-DEPLOYMENT.md](README-SSH-DEPLOYMENT.md) pour les détails.

### Configuration HTTPS

Voir [OPERATOR-PROTECTION.md](OPERATOR-PROTECTION.md) et les guides de déploiement.

## 👤 Compte par Défaut

**Username**: `Operator`  
**Password**: `r2d2+C3PO=SW`  
**Rôle**: OPERATOR (compte système protégé)

⚠️ **Important** : Changez le mot de passe en production !

## 📚 Documentation

- [USER-MANAGEMENT.md](USER-MANAGEMENT.md) - Gestion des utilisateurs et persistance
- [OPERATOR-PROTECTION.md](OPERATOR-PROTECTION.md) - Protection du compte système
- [VALIDATION-REPORT.md](VALIDATION-REPORT.md) - Rapport de tests fonctionnels
- [README-SSH-DEPLOYMENT.md](README-SSH-DEPLOYMENT.md) - Guide de déploiement SSH
- [README-DEPLOYMENT.md](README-DEPLOYMENT.md) - Guide de déploiement général

## 🧪 Tests

### Tests Fonctionnels

```bash
# Lancer tous les tests
node test-functional.js

# Test de protection Operator
node test-operator-protection.js
```

Résultats : 17/17 tests passés ✅

## 🗂️ Structure du Projet

```
communicator_gn_sw/
├── client/                 # Application React
│   ├── src/
│   │   ├── components/    # Composants React
│   │   ├── styles/        # CSS
│   │   └── App.jsx        # Point d'entrée
│   └── package.json
├── server/                # Backend Node.js
│   ├── data/             # Base de données NeDB
│   ├── uploads/          # Fichiers uploadés
│   ├── ssl/              # Certificats SSL
│   ├── database.js       # Gestion BDD
│   ├── index.js          # Serveur Express
│   └── package.json
├── deploy-ssh.ps1        # Script déploiement Windows
├── deploy-ssh.sh         # Script déploiement Linux/Mac
└── README.md
```

## 🔒 Sécurité

- ✅ Mots de passe hashés avec bcryptjs (10 rounds)
- ✅ Authentification JWT
- ✅ HTTPS obligatoire en production
- ✅ Compte Operator protégé contre modification/suppression
- ✅ Validation des entrées
- ✅ CORS configuré

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT.

## 🙏 Remerciements

- Inspiré par l'univers Star Wars
- Interface holographique style SW

---

**Développé avec ❤️ pour une expérience de communication immersive**
