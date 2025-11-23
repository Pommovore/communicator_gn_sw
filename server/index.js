require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase, verifyUser, getUserById, createUser, updateUser, deleteUser, getContacts, addContact, createDocument, getDocumentsForUser, getDocumentById, getAllDocuments, getAllUsers, grantPermission, revokePermission } = require('./database');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();

const PORT = process.env.PORT || 3333;
const JWT_SECRET = process.env.JWT_SECRET || 'theforceisstrongwiththisone';
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

let server;
if (SSL_KEY_PATH && SSL_CERT_PATH && fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
  console.log('Starting server in HTTPS mode');
  const httpsOptions = {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH)
  };
  server = https.createServer(httpsOptions, app);
} else {
  console.log('Starting server in HTTP mode');
  server = http.createServer(app);
}

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

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
    // Add bidirectional contact relationship
    await addContact(req.user.id, contact.id);  // A adds B
    await addContact(contact.id, req.user.id);  // B adds A

    // Notify the contact (B) that they have a new contact (A)
    const currentUser = await getUserById(req.user.id);
    io.to(contact.id).emit('contact_added', {
      contact: {
        id: currentUser.id,
        username: currentUser.username,
        qr_code: currentUser.qr_code
      }
    });

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

  // Rename if recipient exists
  if (recipientId) {
    const sender = await getUserById(req.user.id);
    const recipient = await getUserById(recipientId);
    if (sender && recipient) {
      const ext = path.extname(req.file.originalname);
      // Sanitize usernames to be safe for filenames
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

  // Grant permission to recipient if exists
  if (recipientId) {
    await grantPermission(recipientId, docId);
  }

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
    // Vérifier si c'est le compte Operator
    const userToUpdate = await getUserById(req.params.id);
    if (userToUpdate && userToUpdate.role === 'OPERATOR') {
      return res.status(403).json({ message: 'Cannot modify the Operator account' });
    }
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

app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR') return res.sendStatus(403);
  try {
    // Vérifier si c'est le compte Operator
    const userToDelete = await getUserById(req.params.id);
    if (userToDelete && userToDelete.role === 'OPERATOR') {
      return res.status(403).json({ message: 'Cannot delete the Operator account' });
    }
    await deleteUser(req.params.id);
    res.sendStatus(200);
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
  res.json(docs.map(d => d.id)); // Return list of IDs
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
  console.log(`Server running on port ${PORT}`);
  await initDatabase();
});
