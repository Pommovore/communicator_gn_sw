# Guide : Utiliser un certificat Let's Encrypt avec Node.js sur port 3333

## Étape 1 : Obtenir un certificat Let's Encrypt via Nginx

Si vous n'avez pas encore de certificat pour `minimoi.mynetgear.com`, obtenez-en un :

```bash
# Installer Certbot si pas déjà fait
sudo apt install certbot python3-certbot-nginx

# Obtenir le certificat (remplacez par votre email)
sudo certbot certonly --nginx -d minimoi.mynetgear.com --email votre@email.com --agree-tos
```

Le certificat sera créé dans : `/etc/letsencrypt/live/minimoi.mynetgear.com/`

## Étape 2 : Donner accès à l'utilisateur jack

Les certificats Let's Encrypt sont en lecture seule pour root. Nous devons donner accès à jack :

```bash
# Créer un groupe pour accéder aux certificats
sudo groupadd sslcerts

# Ajouter jack au groupe
sudo usermod -a -G sslcerts jack

# Donner les permissions au groupe
sudo chgrp -R sslcerts /etc/letsencrypt/live/
sudo chgrp -R sslcerts /etc/letsencrypt/archive/
sudo chmod -R g+rx /etc/letsencrypt/live/
sudo chmod -R g+rx /etc/letsencrypt/archive/

# Appliquer les changements (se déconnecter et reconnecter)
exit
# Puis se reconnecter : ssh jack@minimoi.mynetgear.com
```

## Étape 3 : Modifier index-https.js pour utiliser Let's Encrypt

Modifiez le fichier `/mnt/data/communicator_gn_sw/index-https.js` :

```javascript
// Remplacer ces lignes :
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
};

// Par :
const httpsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/minimoi.mynetgear.com/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/minimoi.mynetgear.com/fullchain.pem')
};
```

## Étape 4 : Redémarrer le serveur

```bash
cd /mnt/data/communicator_gn_sw
pkill -f "node index"
nohup node index-https.js > server.log 2>&1 &
```

## Étape 5 : Tester

Accédez à : **https://minimoi.mynetgear.com:3333**

Cette fois, **aucun avertissement de sécurité** ! Le certificat est reconnu par tous les navigateurs.

## Renouvellement automatique

Le certificat se renouvelle automatiquement tous les 90 jours. Pour que Node.js utilise le nouveau certificat, créez un hook de renouvellement :

```bash
# Créer le script de redémarrage
sudo nano /etc/letsencrypt/renewal-hooks/deploy/restart-antigravity.sh
```

Contenu :

```bash
#!/bin/bash
# Redémarrer Antigravity après renouvellement du certificat
pkill -f "node index-https.js"
cd /mnt/data/communicator_gn_sw
nohup node index-https.js > server.log 2>&1 &
```

Rendre exécutable :

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-antigravity.sh
```

## Alternative : Copier les certificats

Si vous préférez copier les certificats plutôt que donner accès direct :

```bash
# Créer un script de copie
sudo nano /etc/letsencrypt/renewal-hooks/deploy/copy-certs.sh
```

Contenu :

```bash
#!/bin/bash
# Copier les certificats pour Antigravity
cp /etc/letsencrypt/live/minimoi.mynetgear.com/privkey.pem /mnt/data/communicator_gn_sw/ssl/key.pem
cp /etc/letsencrypt/live/minimoi.mynetgear.com/fullchain.pem /mnt/data/communicator_gn_sw/ssl/cert.pem
chown jack:jack /mnt/data/communicator_gn_sw/ssl/*.pem
chmod 600 /mnt/data/communicator_gn_sw/ssl/*.pem

# Redémarrer le serveur
pkill -f "node index-https.js"
cd /mnt/data/communicator_gn_sw
sudo -u jack nohup node index-https.js > server.log 2>&1 &
```

Rendre exécutable et exécuter une première fois :

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/copy-certs.sh
sudo /etc/letsencrypt/renewal-hooks/deploy/copy-certs.sh
```

Puis modifiez `index-https.js` pour utiliser les certificats copiés :

```javascript
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
};
```
