// Load .env file locally (Render sets env vars in dashboard)
try { require('dotenv').config(); } catch(e) { /* .env not found — using system env vars */ }

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { verifyToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

app.set('io', io);
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), onlineUsers: getOnlineCount() });
});

// ── Socket.IO — real-time ──
const onlineUsers = new Map(); // email → Set of socket IDs

function getOnlineCount() {
  return onlineUsers.size;
}

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // User authenticates via socket
  socket.on('authenticate', (token) => {
    try {
      const decoded = verifyToken(token);
      socket.userEmail = decoded.email;
      socket.isAdmin = decoded.isAdmin;

      if (!onlineUsers.has(decoded.email)) {
        onlineUsers.set(decoded.email, new Set());
      }
      onlineUsers.get(decoded.email).add(socket.id);

      // Update DB
      db.prepare("UPDATE users SET online = 1, socket_id = ?, last_seen = datetime('now') WHERE email = ?")
        .run(socket.id, decoded.email);

      if (decoded.isAdmin) {
        socket.join('admin_room');
      }

      // Broadcast online status
      io.to('admin_room').emit('user_online', { email: decoded.email, online: true });
      io.emit('online_count', getOnlineCount());

      console.log(`[socket] authenticated: ${decoded.email} (${decoded.isAdmin ? 'admin' : 'user'})`);
    } catch (e) {
      socket.emit('auth_error', { message: 'Invalid token' });
    }
  });

  // Admin joins admin room
  socket.on('join_admin', (token) => {
    try {
      const decoded = verifyToken(token);
      if (decoded.isAdmin) {
        socket.userEmail = decoded.email;
        socket.isAdmin = true;
        socket.join('admin_room');
        if (!onlineUsers.has(decoded.email)) {
          onlineUsers.set(decoded.email, new Set());
        }
        onlineUsers.get(decoded.email).add(socket.id);
        db.prepare("UPDATE users SET online = 1, last_seen = datetime('now') WHERE email = ?").run(decoded.email);
      }
    } catch (e) { /* ignore */ }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
    if (socket.userEmail) {
      const sockets = onlineUsers.get(socket.userEmail);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(socket.userEmail);
          db.prepare("UPDATE users SET online = 0, last_seen = datetime('now') WHERE email = ?")
            .run(socket.userEmail);
          io.to('admin_room').emit('user_offline', { email: socket.userEmail });
        }
      }
      io.emit('online_count', getOnlineCount());
    }
  });
});

// ── Serve admin panel ──
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ── API 404 handler (returns JSON, never HTML) ──
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint አልታቀቘሩ መልቡ፪ ' + req.method + ' ' + req.path });
});

// ── Serve frontend for all other routes ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler (always JSON) ──
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack || err.message);
  res.status(500).json({ error: 'የሰርቨር ስዝህት: ' + (err.message || 'Unknown error') });
});

// ── Start server ──
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
┕═══════════════════════════════════════════▌
║ ����️  ዮዲት ባክንድ ሰርቨር  🌬️              ║
║  Port: ${String(PORT).padEnd(30)} ║
║  Admin: http://localhost:${PORT}/admin     ║
║  API:   http://localhost:${PORT}/api       ║
╚══════════════════════════════════════════╎║
  `);
});
