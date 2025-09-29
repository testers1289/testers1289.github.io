const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const DATA_PATH = path.join(__dirname, 'data.json');

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

const app = express();
// Configure CORS to allow the frontend origin when provided (useful for GitHub Pages)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';
if (FRONTEND_ORIGIN) {
  app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
} else {
  app.use(cors());
}
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple auth: sessions stored in data.json as { token, username }
function findSession(req) {
  const token = req.cookies && req.cookies.session;
  if (!token) return null;
  const data = readData();
  if (!data.sessions) return null;
  return data.sessions.find(s => s.token === token) || null;
}

const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Ensure data.json has users/sessions fields
const raw = fs.readFileSync(DATA_PATH, 'utf8');
let tmp = JSON.parse(raw);
if (!tmp.users) tmp.users = [];
if (!tmp.sessions) tmp.sessions = [];
fs.writeFileSync(DATA_PATH, JSON.stringify(tmp, null, 2), 'utf8');

app.get('/api/channels', (req, res) => {
  const data = readData();
  res.json(data.channels);
});

app.post('/api/channels', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const data = readData();
  const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  if (data.channels.find(c => c.id === id)) {
    return res.status(409).json({ error: 'channel exists' });
  }
  // attach owner if user is logged in
  const token = req.cookies && req.cookies.session;
  let owner = null;
  if (token && data.sessions) {
    const s = data.sessions.find(x => x.token === token);
    if (s) owner = s.username;
  }
  const channel = { id, name, messages: [], owner };
  data.channels.push(channel);
  writeData(data);
  res.status(201).json(channel);
});

app.delete('/api/channels/:id', (req, res) => {
  const id = req.params.id;
  const data = readData();
  const idx = data.channels.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const channel = data.channels[idx];
  // only owner can delete
  const token = req.cookies && req.cookies.session;
  let username = null;
  if (token && data.sessions) {
    const s = data.sessions.find(x => x.token === token);
    if (s) username = s.username;
  }
  if (channel.owner && channel.owner !== username) {
    return res.status(403).json({ error: 'forbidden' });
  }
  data.channels.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

app.get('/api/channels/:id/messages', (req, res) => {
  const id = req.params.id;
  const data = readData();
  const channel = data.channels.find(c => c.id === id);
  if (!channel) return res.status(404).json({ error: 'channel not found' });
  res.json(channel.messages);
});

app.post('/api/channels/:id/messages', (req, res) => {
  const id = req.params.id;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const data = readData();
  const channel = data.channels.find(c => c.id === id);
  if (!channel) return res.status(404).json({ error: 'channel not found' });
  const message = { id: uuidv4(), text };
  channel.messages.push(message);
  writeData(data);
  res.status(201).json(message);
});

app.delete('/api/channels/:id/messages/:mid', (req, res) => {
  const { id, mid } = req.params;
  const data = readData();
  const channel = data.channels.find(c => c.id === id);
  if (!channel) return res.status(404).json({ error: 'channel not found' });
  const idx = channel.messages.findIndex(m => m.id === mid);
  if (idx === -1) return res.status(404).json({ error: 'message not found' });
  channel.messages.splice(idx, 1);
  writeData(data);
  res.json({ ok: true });
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const data = readData();
  if (!q) return res.json({ channels: data.channels, messages: [] });
  const channels = data.channels.filter(c => c.name.toLowerCase().includes(q));
  const messages = [];
  data.channels.forEach(c => {
    c.messages.forEach(m => {
      if (m.text.toLowerCase().includes(q)) messages.push(Object.assign({}, m, { channelId: c.id }));
    });
  });
  res.json({ channels, messages });
});

// Register (username only for demo)
app.post('/api/register', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const data = readData();
  if (!data.users) data.users = [];
  if (data.users.find(u => u.username === username)) return res.status(409).json({ error: 'exists' });
  data.users.push({ username });
  writeData(data);
  res.status(201).json({ username });
});

// Login: create session token cookie
app.post('/api/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const data = readData();
  if (!data.users) data.users = [];
  if (!data.users.find(u => u.username === username)) return res.status(404).json({ error: 'user not found' });
  const token = uuidv4();
  if (!data.sessions) data.sessions = [];
  data.sessions.push({ token, username });
  writeData(data);
  // cookie options: in production, set secure=true and SameSite=None if cross-site (Pages -> backend)
  const cookieOpts = { httpOnly: true };
  if (process.env.COOKIE_SECURE === 'true') cookieOpts.secure = true;
  if (process.env.COOKIE_SAMESITE === 'None') cookieOpts.sameSite = 'None';
  res.cookie('session', token, cookieOpts);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies && req.cookies.session;
  const data = readData();
  if (token && data.sessions) {
    data.sessions = data.sessions.filter(s => s.token !== token);
    writeData(data);
  }
  res.clearCookie('session');
  res.json({ ok: true });
});

// whoami
app.get('/api/me', (req, res) => {
  const s = findSession(req);
  if (!s) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, username: s.username });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
