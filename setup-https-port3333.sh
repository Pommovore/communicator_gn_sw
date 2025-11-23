#!/bin/bash
# Script pour générer un certificat auto-signé et configurer HTTPS sur port 3333
# Usage: bash setup-https-selfsigned.sh

echo "=== Antigravity HTTPS Setup (Self-Signed Certificate) ==="

cd /mnt/data/communicator_gn_sw

# 1. Créer le dossier pour les certificats
mkdir -p ssl

# 2. Générer le certificat auto-signé
echo "[1/3] Generating self-signed certificate..."
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes \
  -subj "/C=FR/ST=France/L=Paris/O=Antigravity/CN=minimoi.mynetgear.com"

echo "✓ Certificate generated"

# 3. Créer le fichier index-https.js
echo "[2/3] Creating HTTPS server file..."
cat > index-https.js << 'EOF'
require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDatabase, verifyUser, getUserById, createUser, updateUser, getContacts, addContact, createDocument, getDocumentsForUser, getDocumentById, getAllDocuments, getAllUsers, grantPermission, revokePermission } = require('./database');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();

// Configuration HTTPS
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
};

const server = https.createServer(httpsOptions, app);
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
  destination: function (req, file, cb) { cb(null, UPLOAD_DIR) },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})
const upload = multer({ storage: storage });

app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
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
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
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

server.listen(PORT, async () => {
  console.log(`HTTPS Server running on port ${PORT}`);
  await initDatabase();
});
EOF

echo "✓ HTTPS server file created"

# 4. Redémarrer le serveur avec HTTPS
echo "[3/3] Restarting server with HTTPS..."
pkill -f "node index" 2>/dev/null
sleep 1
nohup node index-https.js > server.log 2>&1 &

sleep 2

# Vérifier
if ps aux | grep -v grep | grep "node index-https.js" > /dev/null; then
    echo "✓ HTTPS server is running"
    echo ""
    echo "=== SUCCESS ==="
    echo "Access your application at: https://minimoi.mynetgear.com:3333"
    echo ""
    echo "⚠ WARNING: This uses a self-signed certificate."
    echo "Your browser will show a security warning. Click 'Advanced' and 'Proceed'."
else
    echo "✗ Server failed to start. Check logs:"
    tail -20 server.log
fi
