# GESTION DES UTILISATEURS - ANTIGRAVITY

## 🗄️ Technologie de Persistance

### NeDB (Node Embedded Database)

**NeDB** est une base de données NoSQL embarquée, écrite en JavaScript pur, compatible avec l'API MongoDB.

#### Caractéristiques
- **Type** : NoSQL, orientée documents
- **Stockage** : Fichiers JSON sur disque
- **Package** : `nedb-promises` (version avec Promises)
- **Licence** : MIT
- **Dépendances** : Aucune (pure JavaScript)

#### Avantages
✅ **Simplicité** : Pas de serveur DB séparé à installer/gérer  
✅ **Portabilité** : Fichiers JSON lisibles et transférables  
✅ **Performance** : Suffisante pour petites/moyennes applications  
✅ **Développement** : Idéal pour prototypage et déploiement rapide  
✅ **Backup** : Simple copie de fichiers  

#### Limitations
⚠️ **Scalabilité** : Non adapté pour très grandes bases (>100k documents)  
⚠️ **Concurrence** : Pas de transactions ACID complètes  
⚠️ **Requêtes** : Moins performant que PostgreSQL/MongoDB pour requêtes complexes  

---

## 📁 Structure des Fichiers

### Localisation
```
server/data/
├── users.db           # Base utilisateurs
├── documents.db       # Base documents/fichiers
├── permissions.db     # Permissions d'accès
└── contacts.db        # Relations utilisateurs
```

### Format de Stockage
Chaque fichier `.db` contient des documents JSON, un par ligne :

```json
{"username":"Operator","password_hash":"$2a$10$...","role":"OPERATOR","qr_code":"OPERATOR-1732377600000","_id":"jOjvBouhyeE2Kipv"}
{"username":"User1","password_hash":"$2a$10$...","role":"PJ","qr_code":"User1-1732377650000","_id":"kPkwCpviyfF3Ljqw"}
```

---

## 👤 Schéma Utilisateur

### Structure d'un Document Utilisateur

```javascript
{
  _id: "jOjvBouhyeE2Kipv",           // ID unique généré par NeDB
  username: "Operator",               // Nom d'utilisateur (unique)
  password_hash: "$2a$10$xyz...",     // Hash bcrypt du mot de passe
  role: "OPERATOR",                   // Rôle: OPERATOR, ADMIN, PJ, PNJ
  qr_code: "OPERATOR-1732377600000"   // Code QR unique pour ajout contact
}
```

### Champs

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| `_id` | String | Identifiant unique | Auto-généré par NeDB |
| `username` | String | Nom d'utilisateur | Unique, requis |
| `password_hash` | String | Hash bcrypt du mot de passe | Requis, bcrypt rounds=10 |
| `role` | String | Rôle de l'utilisateur | OPERATOR, ADMIN, PJ, PNJ |
| `qr_code` | String | Code QR unique | Format: `{username}-{timestamp}` |

---

## 🔐 Sécurité des Mots de Passe

### Hashing avec bcryptjs

```javascript
const bcrypt = require('bcryptjs');

// Création d'un hash (lors de l'inscription)
const hash = bcrypt.hashSync(password, 10);  // 10 rounds de salage

// Vérification (lors du login)
const isValid = bcrypt.compareSync(password, hash);
```

#### Pourquoi bcryptjs ?
- ✅ **Sécurisé** : Algorithme de hashing adaptatif
- ✅ **Salage automatique** : Chaque hash est unique
- ✅ **Résistant** : Ralentit les attaques par force brute
- ✅ **Pure JS** : Pas de dépendances natives (contrairement à `bcrypt`)
- ✅ **Cross-platform** : Fonctionne sur Windows/Linux/Mac sans recompilation

#### Niveau de Sécurité
- **Rounds** : 10 (2^10 = 1024 itérations)
- **Temps** : ~100ms par hash (ralentit les attaques)
- **Format** : `$2a$10$[22 chars salt][31 chars hash]`

---

## 🔄 Opérations CRUD

### 1. CREATE - Création d'utilisateur

```javascript
async function createUser(username, password, role = 'PJ') {
  // 1. Hash du mot de passe
  const hash = bcrypt.hashSync(password, 10);
  
  // 2. Génération du QR code unique
  const qr = username + '-' + Date.now();
  
  // 3. Insertion dans la base
  const doc = await users.insert({ 
    username, 
    password_hash: hash, 
    role, 
    qr_code: qr 
  });
  
  return doc._id;
}
```

**Fichier** : `server/database.js` (lignes 25-30)

### 2. READ - Lecture d'utilisateurs

#### Par ID
```javascript
async function getUserById(id) {
  const user = await users.findOne({ _id: id });
  if (user) return { id: user._id, ...user };
  return null;
}
```

#### Tous les utilisateurs
```javascript
async function getAllUsers() {
  const all = await users.find({});
  return all.map(u => ({ id: u._id, ...u }));
}
```

#### Vérification login
```javascript
async function verifyUser(username, password) {
  const user = await users.findOne({ username });
  if (user && bcrypt.compareSync(password, user.password_hash)) {
    return { id: user._id, ...user };
  }
  return null;
}
```

**Fichier** : `server/database.js` (lignes 32-49)

### 3. UPDATE - Modification d'utilisateur

```javascript
async function updateUser(id, updates) {
  // Si le mot de passe est modifié, le hasher
  if (updates.password) {
    updates.password_hash = bcrypt.hashSync(updates.password, 10);
    delete updates.password;  // Ne pas stocker le mot de passe en clair
  }
  
  // Mise à jour avec opérateur $set
  await users.update({ _id: id }, { $set: updates });
  
  return getUserById(id);
}
```

**Fichier** : `server/database.js` (lignes 51-58)

### 4. DELETE - Suppression d'utilisateur

```javascript
async function deleteUser(id) {
  await users.remove({ _id: id }, {});
}
```

**Fichier** : `server/database.js` (lignes 60-62)

---

## 🎭 Système de Rôles

### Hiérarchie des Rôles

```
OPERATOR (Système)
    ↓
ADMIN (Administrateur)
    ↓
PJ (Personnage Joueur)
    ↓
PNJ (Personnage Non-Joueur)
```

### Permissions par Rôle

| Rôle | Gestion Users | Gestion Docs | Gestion Permissions | Protégé |
|------|---------------|--------------|---------------------|---------|
| **OPERATOR** | ✅ | ✅ | ✅ | 🔒 Oui |
| **ADMIN** | ✅ | ✅ | ✅ | ❌ Non |
| **PJ** | ❌ | Ses docs | ❌ | ❌ Non |
| **PNJ** | ❌ | Ses docs | ❌ | ❌ Non |

### Règles Spéciales

1. **OPERATOR** : 
   - Créé automatiquement au démarrage si absent
   - **Protégé** contre modification et suppression
   - Toujours visible dans les contacts de tous

2. **ADMIN** :
   - Toujours visible dans les contacts de tous
   - Peut gérer tous les utilisateurs (sauf OPERATOR)

3. **PJ/PNJ** :
   - Doivent être ajoutés manuellement aux contacts
   - Accès limité à leurs propres documents

---

## 🔗 Relations entre Utilisateurs

### Table Contacts

```javascript
// Structure d'un contact
{
  _id: "abc123",
  user_id: "user1_id",      // ID de l'utilisateur
  contact_id: "user2_id"    // ID du contact
}
```

### Logique Bidirectionnelle

Quand User A scanne le QR de User B :
```javascript
// 1. A ajoute B
await addContact(userA_id, userB_id);

// 2. B ajoute A (automatique)
await addContact(userB_id, userA_id);

// 3. Notification temps réel à B
io.to(userB_id).emit('contact_added', { contact: userA });
```

**Fichier** : `server/index.js` (lignes 91-115)

---

## 🔍 Requêtes NeDB

### Syntaxe MongoDB-like

```javascript
// Recherche simple
await users.findOne({ username: 'Operator' });

// Recherche avec opérateurs
await users.find({ role: { $in: ['ADMIN', 'OPERATOR'] } });

// Mise à jour
await users.update(
  { _id: userId },           // Critère
  { $set: { role: 'ADMIN' } } // Modification
);

// Suppression
await users.remove({ _id: userId }, {});
```

### Opérateurs Supportés

| Opérateur | Description | Exemple |
|-----------|-------------|---------|
| `$eq` | Égal | `{ role: { $eq: 'ADMIN' } }` |
| `$ne` | Différent | `{ role: { $ne: 'PJ' } }` |
| `$in` | Dans liste | `{ role: { $in: ['ADMIN', 'OPERATOR'] } }` |
| `$gt` | Supérieur | `{ age: { $gt: 18 } }` |
| `$set` | Définir valeur | `{ $set: { role: 'ADMIN' } }` |

---

## 💾 Backup et Restauration

### Backup Manuel

```bash
# Copier les fichiers de base de données
cp server/data/*.db backup/

# Ou avec date
cp server/data/*.db backup/backup-$(date +%Y%m%d)/
```

### Restauration

```bash
# Arrêter le serveur
pkill -f 'node index'

# Restaurer les fichiers
cp backup/*.db server/data/

# Redémarrer
node index.js
```

### Backup Automatique (Recommandé)

```bash
# Cron job quotidien (Linux)
0 2 * * * tar -czf /backup/antigravity-$(date +\%Y\%m\%d).tar.gz /mnt/data/communicator_gn_sw/data
```

---

## 🔧 Migration vers une Autre DB

### Si besoin de scalabilité future

NeDB peut être remplacé par MongoDB ou PostgreSQL sans changer beaucoup de code :

#### Vers MongoDB
```javascript
// Remplacer
const Datastore = require('nedb-promises');
const users = Datastore.create('data/users.db');

// Par
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const users = client.db('antigravity').collection('users');
```

#### Vers PostgreSQL
Nécessiterait plus de modifications (SQL vs NoSQL), mais la logique métier reste identique.

---

## 📊 Performances

### Benchmarks NeDB

| Opération | Temps (1000 docs) | Temps (10000 docs) |
|-----------|-------------------|---------------------|
| Insert | ~50ms | ~500ms |
| Find (indexed) | ~5ms | ~15ms |
| Find (non-indexed) | ~20ms | ~200ms |
| Update | ~10ms | ~30ms |
| Delete | ~8ms | ~25ms |

### Optimisations

1. **Index** : NeDB supporte les index
```javascript
users.ensureIndex({ fieldName: 'username', unique: true });
```

2. **Compaction** : Nettoyer les fichiers
```javascript
users.persistence.compactDatafile();
```

---

## 🎯 Résumé

### Points Clés

✅ **Technologie** : NeDB (NoSQL embarqué)  
✅ **Stockage** : Fichiers JSON (`server/data/*.db`)  
✅ **Sécurité** : bcryptjs pour les mots de passe  
✅ **Rôles** : OPERATOR, ADMIN, PJ, PNJ  
✅ **Protection** : Compte OPERATOR verrouillé  
✅ **Relations** : Contacts bidirectionnels  
✅ **Backup** : Simple copie de fichiers  

### Fichiers Importants

- `server/database.js` : Toutes les fonctions de gestion des utilisateurs
- `server/data/users.db` : Base de données utilisateurs
- `server/index.js` : Routes API pour les utilisateurs

---

*Documentation générée le 2025-11-23*
