# Guide de Déploiement SSH Automatisé

## Prérequis

### Sur votre machine Windows
1. **SSH Client** : Installé par défaut sur Windows 10/11
2. **Clé SSH** (recommandé) : Pour éviter de saisir le mot de passe à chaque fois

### Configuration de la clé SSH (optionnel mais recommandé)

```powershell
# Générer une clé SSH si vous n'en avez pas
ssh-keygen -t rsa -b 4096 -C "votre@email.com"

# Copier la clé sur le serveur
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh admin@minimoi.mynetgear.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Sur le serveur (minimoi.mynetgear.com)
1. **Node.js** installé
2. **PM2** installé globalement : `npm install -g pm2`
3. **Permissions** : L'utilisateur doit avoir accès en écriture à `/opt/communicator_gn_sw`

```bash
# Sur le serveur, créer le répertoire avec les bonnes permissions
sudo mkdir -p /opt/communicator_gn_sw
sudo chown $USER:$USER /opt/communicator_gn_sw
```

## Utilisation

### Déploiement Simple
```powershell
.\deploy-ssh.ps1
```

### Déploiement avec un utilisateur spécifique
```powershell
.\deploy-ssh.ps1 -Username votre_user
```

### Déploiement complet avec tous les paramètres
```powershell
.\deploy-ssh.ps1 -Username admin -ServerHost minimoi.mynetgear.com -RemotePath /opt/communicator_gn_sw
```

## Ce que fait le script

1. ✅ Build le client React
2. ✅ Prépare tous les fichiers dans `./deploy`
3. ✅ Configure le serveur pour le port 3333
4. ✅ Transfère les fichiers via SSH (rsync ou scp)
5. ✅ Installe les dépendances sur le serveur
6. ✅ Démarre/redémarre l'application avec PM2

## Commandes utiles après déploiement

### Voir les logs
```powershell
ssh admin@minimoi.mynetgear.com "pm2 logs antigravity"
```

### Redémarrer l'application
```powershell
ssh admin@minimoi.mynetgear.com "pm2 restart antigravity"
```

### Arrêter l'application
```powershell
ssh admin@minimoi.mynetgear.com "pm2 stop antigravity"
```

### Voir le status
```powershell
ssh admin@minimoi.mynetgear.com "pm2 status"
```

### Se connecter au serveur
```powershell
ssh admin@minimoi.mynetgear.com
```

## Optimisation : Installer rsync

Le script utilise `rsync` s'il est disponible (beaucoup plus rapide que `scp`).

### Via WSL (Windows Subsystem for Linux)
```powershell
wsl --install
# Puis dans WSL:
sudo apt install rsync
```

### Via Git Bash
Rsync est inclus avec Git for Windows.

## Dépannage

### "Permission denied"
- Vérifiez que vous avez les droits sur `/opt/communicator_gn_sw`
- Ou changez le `RemotePath` vers un dossier où vous avez les droits

### "Connection refused"
- Vérifiez que SSH est activé sur le serveur
- Vérifiez le pare-feu

### "pm2 command not found"
Sur le serveur :
```bash
npm install -g pm2
```

### Le port 3333 n'est pas accessible
- Vérifiez le pare-feu du serveur : `sudo ufw allow 3333`
- Vérifiez la configuration du routeur (port forwarding)

## Workflow de développement recommandé

1. **Développement local** : Utilisez `npm run dev` (client) et `npm start` (server)
2. **Test** : Testez localement avant de déployer
3. **Déploiement** : `.\deploy-ssh.ps1`
4. **Vérification** : Accédez à https://minimoi.mynetgear.com:3333

## Rollback en cas de problème

Si le nouveau déploiement pose problème :

```powershell
# Se connecter au serveur
ssh admin@minimoi.mynetgear.com

# Voir les logs
pm2 logs antigravity

# Si nécessaire, restaurer depuis une sauvegarde
# (pensez à faire des backups réguliers de /opt/communicator_gn_sw)
```
