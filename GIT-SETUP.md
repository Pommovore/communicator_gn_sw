# Configuration Git et Commit Initial

## 📝 Étapes pour finaliser le dépôt Git

### 1. Configurer votre identité Git

Exécutez ces commandes en remplaçant par vos informations :

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

Ou pour ce projet uniquement (sans --global) :

```bash
cd c:/Users/jchod/dev/communicator_gn_sw
git config user.name "Votre Nom"
git config user.email "votre.email@example.com"
```

### 2. Faire le commit initial

```bash
git commit -m "Initial commit - Antigravity Secure Communication Platform

Features:
- User authentication with JWT
- Role-based access control (OPERATOR, ADMIN, PJ, PNJ)
- Bidirectional contacts via QR codes
- Document sharing with permissions
- Real-time notifications (Socket.IO)
- Media capture (camera, microphone)
- Admin panel
- HTTPS support with Let's Encrypt
- Operator account protection
- Automated deployment scripts

Tech stack:
- Frontend: React + Vite
- Backend: Node.js + Express + Socket.IO
- Database: NeDB (embedded NoSQL)
- Security: bcryptjs + JWT

All functional tests passing (17/17)"
```

### 3. Vérifier le commit

```bash
git log --oneline
git status
```

### 4. (Optionnel) Créer un dépôt distant

#### Sur GitHub

1. Aller sur https://github.com/new
2. Créer un nouveau repository "antigravity" ou "communicator_gn_sw"
3. Ne pas initialiser avec README (on a déjà le code)
4. Copier l'URL du repository

#### Lier au dépôt distant

```bash
git remote add origin https://github.com/VOTRE_USERNAME/antigravity.git
git branch -M main
git push -u origin main
```

#### Ou avec SSH (si configuré)

```bash
git remote add origin git@github.com:VOTRE_USERNAME/antigravity.git
git branch -M main
git push -u origin main
```

### 5. (Optionnel) Créer des branches

```bash
# Branche de développement
git checkout -b develop

# Branche de fonctionnalité
git checkout -b feature/nouvelle-fonctionnalite

# Retour à main
git checkout main
```

---

## 📊 État Actuel du Dépôt

### Fichiers versionnés (42 fichiers)

✅ **Code source**
- Client React (composants, styles)
- Serveur Node.js (API, database)
- Scripts de déploiement

✅ **Documentation**
- README.md (principal)
- USER-MANAGEMENT.md
- OPERATOR-PROTECTION.md
- VALIDATION-REPORT.md
- Guides de déploiement

✅ **Configuration**
- .gitignore (configuré)
- package.json (client + server)
- vite.config.js

✅ **Tests**
- test-functional.js
- test-operator-protection.js

### Fichiers exclus (.gitignore)

❌ **Données sensibles**
- server/data/*.db (bases de données)
- .env (variables d'environnement)
- server/ssl/*.pem (certificats)

❌ **Fichiers générés**
- node_modules/
- client/dist/
- deploy_temp/
- *.log

❌ **Fichiers utilisateurs**
- server/uploads/* (sauf .gitkeep)

---

## 🔄 Workflow Git Recommandé

### Développement quotidien

```bash
# 1. Vérifier l'état
git status

# 2. Ajouter les modifications
git add .

# 3. Commit avec message descriptif
git commit -m "feat: ajouter fonctionnalité X"

# 4. Push vers le dépôt distant
git push
```

### Convention de messages de commit

```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: modification documentation
style: formatage code (pas de changement logique)
refactor: refactorisation
test: ajout/modification tests
chore: tâches maintenance
```

### Exemples

```bash
git commit -m "feat: ajouter export PDF des documents"
git commit -m "fix: corriger bug affichage QR code"
git commit -m "docs: mettre à jour README avec nouvelles routes API"
git commit -m "refactor: optimiser requêtes base de données"
```

---

## 🚀 Commandes Git Utiles

### Voir l'historique

```bash
git log --oneline --graph --all
git log --author="Votre Nom"
git log --since="2 weeks ago"
```

### Annuler des modifications

```bash
# Annuler modifications non commitées
git checkout -- fichier.js

# Annuler dernier commit (garder les modifications)
git reset --soft HEAD~1

# Annuler dernier commit (supprimer les modifications)
git reset --hard HEAD~1
```

### Branches

```bash
# Lister les branches
git branch -a

# Créer et basculer
git checkout -b nouvelle-branche

# Fusionner une branche
git checkout main
git merge feature-branch

# Supprimer une branche
git branch -d feature-branch
```

### Synchronisation

```bash
# Récupérer les modifications
git pull

# Voir les différences
git diff
git diff --staged

# Voir les fichiers modifiés
git status
```

---

## 📦 Backup et Restauration

### Créer une archive

```bash
git archive --format=zip --output=antigravity-backup.zip HEAD
```

### Cloner le dépôt ailleurs

```bash
git clone /chemin/vers/depot /nouveau/chemin
```

---

## ✅ Checklist Post-Configuration

- [ ] Git configuré (user.name et user.email)
- [ ] Commit initial effectué
- [ ] .gitignore vérifié
- [ ] README.md à jour
- [ ] (Optionnel) Dépôt distant créé et lié
- [ ] (Optionnel) Premier push effectué

---

*Guide créé le 2025-11-23*
