# Guide de configuration HTTPS pour Antigravity

## Prérequis
- Domaine : minimoi.mynetgear.com
- Port 80 et 443 ouverts sur le routeur (port forwarding)
- Accès sudo sur le serveur

## Étape 1 : Installer Nginx et Certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

## Étape 2 : Configurer Nginx

Créer le fichier de configuration :

```bash
sudo nano /etc/nginx/sites-available/antigravity
```

Coller cette configuration :

```nginx
server {
    listen 80;
    server_name minimoi.mynetgear.com;
    
    # Redirection HTTP vers HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name minimoi.mynetgear.com;

    # Les certificats seront générés par Certbot
    ssl_certificate /etc/letsencrypt/live/minimoi.mynetgear.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/minimoi.mynetgear.com/privkey.pem;
    
    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;

    # Proxy vers Node.js
    location / {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Support WebSocket pour Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3333;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Sauvegarder (Ctrl+O, Entrée, Ctrl+X)

## Étape 3 : Activer la configuration

```bash
# Créer un lien symbolique
sudo ln -s /etc/nginx/sites-available/antigravity /etc/nginx/sites-enabled/

# Désactiver le site par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Si OK, redémarrer Nginx
sudo systemctl restart nginx
```

## Étape 4 : Configurer le port forwarding sur le routeur

**IMPORTANT** : Avant de continuer, configurez votre routeur Netgear :

1. Port 80 (HTTP) → IP de minimoiserv:80
2. Port 443 (HTTPS) → IP de minimoiserv:443

## Étape 5 : Obtenir le certificat SSL

```bash
# Obtenir le certificat (remplacer par votre email)
sudo certbot --nginx -d minimoi.mynetgear.com --email votre@email.com --agree-tos --no-eff-email

# Le certificat se renouvellera automatiquement
```

## Étape 6 : Vérifier

Accédez à : **https://minimoi.mynetgear.com**

Le port 3333 n'est plus nécessaire !

## Renouvellement automatique

Le certificat se renouvelle automatiquement. Pour tester :

```bash
sudo certbot renew --dry-run
```

## Commandes utiles

```bash
# Redémarrer Nginx
sudo systemctl restart nginx

# Voir les logs Nginx
sudo tail -f /var/log/nginx/error.log

# Renouveler manuellement le certificat
sudo certbot renew
```

## Dépannage

Si Certbot échoue :
- Vérifiez que le port 80 est bien ouvert et redirigé
- Vérifiez que minimoi.mynetgear.com pointe bien vers votre IP publique
- Vérifiez les logs : `sudo tail -f /var/log/letsencrypt/letsencrypt.log`
