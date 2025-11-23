# Script de déploiement Antigravity
# Usage: .\deploy.ps1

# Ajouter Node.js au PATH
$env:Path = "C:\Program Files\nodejs;" + $env:Path

Write-Host "=== Antigravity Deployment Script ===" -ForegroundColor Cyan

# 1. Build du client
Write-Host "`n[1/5] Building client..." -ForegroundColor Yellow
Set-Location client
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Client build failed!" -ForegroundColor Red
    exit 1
}
Set-Location ..

# 2. Création du dossier de déploiement
Write-Host "`n[2/5] Preparing deployment directory..." -ForegroundColor Yellow
$deployDir = ".\deploy"
if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

# 3. Copie des fichiers serveur
Write-Host "`n[3/5] Copying server files..." -ForegroundColor Yellow
Copy-Item -Path "server\*" -Destination $deployDir -Recurse -Exclude "node_modules","*.db"

# 4. Copie du build client dans le dossier serveur
Write-Host "`n[4/5] Copying client build..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$deployDir\public" -Force | Out-Null
Copy-Item -Path "client\dist\*" -Destination "$deployDir\public" -Recurse

# 5. Configuration pour le port 3333
Write-Host "`n[5/5] Configuring for port 3333..." -ForegroundColor Yellow
$envContent = @"
PORT=3333
JWT_SECRET=maytheforcebewithyou
"@
Set-Content -Path "$deployDir\.env" -Value $envContent

# Création du fichier de démarrage
$startScript = @"
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase, verifyUser, getUserById, createUser, updateUser, getContacts, addContact, createDocument, getDocumentsForUser, getDocumentById, getAllDocuments, getAllUsers, grantPermission, revokePermission } = require('./database');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3333;
const JWT_SECRET = process.env.JWT_SECRET || 'theforceisstrongwiththisone';
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Routes ---

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await verifyUser(username, password);
  if (user) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, qr_code: user.qr_code } });
  } else {
    res.status(401).json({ message: 'Authentication failed' });
  }
});

app.get('/api/me', authenticateToken, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (user) {
    res.json({ id: user.id, username: user.username, role: user.role, qr_code: user.qr_code });
  } else {
    res.sendStatus(404);
  }
});

app.get('/api/contacts', authenticateToken, async (req, res) => {
  const contacts = await getContacts(req.user.id);
  res.json(contacts);
});

app.post('/api/contacts', authenticateToken, async (req, res) => {
  const { qr_code } = req.body;
  const users = await getAllUsers();
  const contact = users.find(u => u.qr_code === qr_code);

  if (contact) {
    await addContact(req.user.id, contact.id);
    res.json({ message: 'Contact added', contact });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})
const upload = multer({ storage: storage });

app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  let filename = req.file.filename;
  const type = req.body.type || 'unknown'; 
  const recipientId = req.body.recipientId;

  if (recipientId) {
    const sender = await getUserById(req.user.id);
    const recipient = await getUserById(recipientId);
    if (sender && recipient) {
      const ext = path.extname(req.file.originalname);
      const safeSender = sender.username.replace(/[^a-z0-9]/gi, '_');
      const safeRecipient = recipient.username.replace(/[^a-z0-9]/gi, '_');
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timestamp = `${year}${month}${day}_${hours}${minutes}`;
      
      const newFilename = `${safeSender}_to_${safeRecipient}_${timestamp}${ext}`;
      const oldPath = path.join(UPLOAD_DIR, req.file.filename);
      const newPath = path.join(UPLOAD_DIR, newFilename);
      
      try {
        fs.renameSync(oldPath, newPath);
        filename = newFilename;
      } catch (err) {
        console.error("Error renaming file:", err);
      }
    }
  }

  const docId = await createDocument(req.user.id, type, filename);
  res.json({ id: docId, filename: filename, type });
});

app.get('/api/documents', authenticateToken, async (req, res) => {
  const docs = await getDocumentsForUser(req.user.id);
  res.json(docs);
});

// Admin Routes
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR') return res.sendStatus(403);
  const users = await getAllUsers();
  res.json(users);
});

app.put('/api/admin/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR') return res.sendStatus(403);
  try {
    const updated = await updateUser(req.params.id, req.body);
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.post('/api/admin/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR') return res.sendStatus(403);
  const { username, password, role } = req.body;
  try {
    const id = await createUser(username, password, role || 'PJ');
    res.json({ id, username, role });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.get('/api/admin/documents', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR') return res.sendStatus(403);
  const docs = await getAllDocuments();
  res.json(docs);
});

app.get('/api/admin/permissions/:userId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR') return res.sendStatus(403);
  const docs = await getDocumentsForUser(req.params.userId);
  res.json(docs.map(d => d.id));
});

app.post('/api/admin/permissions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR') return res.sendStatus(403);
  const { userId, documentId, grant } = req.body;
  if (grant) {
    await grantPermission(userId, documentId);
  } else {
    await revokePermission(userId, documentId);
  }
  res.sendStatus(200);
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('send_message', (data) => {
    console.log('Message to', data.to, data);
    io.to(data.to).emit('receive_message', {
      from: data.from,
      type: data.type,
      content: data.content,
      documentId: data.documentId
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initDatabase();
});
"@
Set-Content -Path "$deployDir\server.js" -Value $startScript

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Deployment directory: $deployDir" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. cd deploy" -ForegroundColor White
Write-Host "2. npm install --production" -ForegroundColor White
Write-Host "3. node server.js" -ForegroundColor White
Write-Host "`nOr use the start script:" -ForegroundColor Yellow
Write-Host ".\start-production.ps1" -ForegroundColor White
