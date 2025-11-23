const Datastore = require('nedb-promises');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = (name) => path.join(__dirname, `data/${name}.db`);

let users, documents, permissions, contacts;

async function initDatabase() {
  users = Datastore.create(dbPath('users'));
  documents = Datastore.create(dbPath('documents'));
  permissions = Datastore.create(dbPath('permissions'));
  contacts = Datastore.create(dbPath('contacts'));

  // Create Operator if not exists
  const operator = await users.findOne({ role: 'OPERATOR' });
  if (!operator) {
    const hash = bcrypt.hashSync('r2d2+C3PO=SW', 10);
    const qr = 'OPERATOR-' + Date.now();
    await users.insert({ username: 'Operator', password_hash: hash, role: 'OPERATOR', qr_code: qr });
    console.log('Operator account created.');
  }
}

async function createUser(username, password, role = 'PJ') {
  const hash = bcrypt.hashSync(password, 10);
  const qr = username + '-' + Date.now();
  const doc = await users.insert({ username, password_hash: hash, role, qr_code: qr });
  return doc._id;
}

async function verifyUser(username, password) {
  const user = await users.findOne({ username });
  if (user && bcrypt.compareSync(password, user.password_hash)) {
    return { id: user._id, ...user };
  }
  return null;
}

async function getUserById(id) {
  const user = await users.findOne({ _id: id });
  if (user) return { id: user._id, ...user };
  return null;
}

async function getAllUsers() {
  const all = await users.find({});
  return all.map(u => ({ id: u._id, ...u }));
}

async function updateUser(id, updates) {
  if (updates.password) {
    updates.password_hash = bcrypt.hashSync(updates.password, 10);
    delete updates.password;
  }
  await users.update({ _id: id }, { $set: updates });
  return getUserById(id);
}

async function deleteUser(id) {
  await users.remove({ _id: id }, {});
}

async function addContact(userId, contactId) {
  // Check if exists
  const exists = await contacts.findOne({ user_id: userId, contact_id: contactId });
  if (!exists) {
    await contacts.insert({ user_id: userId, contact_id: contactId });
  }
}

async function getContacts(userId) {
  // Explicit contacts
  const myContacts = await contacts.find({ user_id: userId });
  const contactIds = myContacts.map(c => c.contact_id);

  // Admins/Operators
  const admins = await users.find({ role: { $in: ['ADMIN', 'OPERATOR'] } });
  const adminIds = admins.map(a => a._id).filter(id => id !== userId);

  const allIds = [...new Set([...contactIds, ...adminIds])];

  const result = await users.find({ _id: { $in: allIds } });
  return result.map(u => ({ id: u._id, ...u }));
}

async function createDocument(ownerId, type, filename) {
  const doc = await documents.insert({ owner_id: ownerId, type, filename, created_at: new Date() });
  await permissions.insert({ user_id: ownerId, document_id: doc._id });
  return doc._id;
}

async function getDocumentsForUser(userId) {
  const perms = await permissions.find({ user_id: userId });
  const docIds = perms.map(p => p.document_id);
  const docs = await documents.find({ _id: { $in: docIds } });
  return docs.map(d => ({ id: d._id, ...d }));
}

async function getDocumentById(docId) {
  const doc = await documents.findOne({ _id: docId });
  if (doc) return { id: doc._id, ...doc };
  return null;
}

async function getAllDocuments() {
  const docs = await documents.find({});
  return docs.map(d => ({ id: d._id, ...d }));
}

async function grantPermission(userId, docId) {
  const exists = await permissions.findOne({ user_id: userId, document_id: docId });
  if (!exists) {
    await permissions.insert({ user_id: userId, document_id: docId });
  }
}

async function revokePermission(userId, docId) {
  await permissions.remove({ user_id: userId, document_id: docId }, { multi: true });
}

module.exports = {
  initDatabase,
  createUser,
  verifyUser,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  addContact,
  getContacts,
  createDocument,
  getDocumentsForUser,
  getDocumentById,
  getAllDocuments,
  grantPermission,
  revokePermission
};
