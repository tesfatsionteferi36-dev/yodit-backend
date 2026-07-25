const express = require('express');
const { pool } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Get all users with full data ──
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT u.name, u.email, u.approved, u.blocked, u.online, u.last_seen, u.created_at,
        d.data_json as user_data, d.updated_at as data_updated
      FROM users u
      LEFT JOIN user_data d ON d.email = u.email
      WHERE u.email != 'admin@yodit.app'
      ORDER BY u.created_at DESC
    `);

    // Parse user_data JSON and extract key fields
    const enriched = users.map(u => {
      let health = {};
      try { health = JSON.parse(u.user_data || '{}'); } catch(e) {}
      return {
        name: u.name,
        email: u.email,
        approved: u.approved,
        blocked: u.blocked,
        online: u.online,
        last_seen: u.last_seen,
        created_at: u.created_at,
        data_updated: u.data_updated,
        streak: health.streak || 0,
        best: health.best || 0,
        phase: health.phase || 0,
        history_count: health.history ? Object.keys(health.history).length : 0,
        has_data: !!u.user_data
      };
    });

    res.json(enriched);
  } catch(e) {
    console.error('[admin/users]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Approve user + generate 4-digit verification code ──
router.post('/users/:email/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const email = req.params.email;
    const [result] = await pool.execute(
      'UPDATE users SET approved = 1 WHERE email = ? AND email != ?',
      [email, 'admin@yodit.app']
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'ተጠቃሚ አልተገኘም' });
    }

    // Generate 4-digit verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute('UPDATE verification_codes SET used = 1 WHERE user_email = ? AND used = 0', [email]);
    await pool.execute(
      'INSERT INTO verification_codes (user_email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt]
    );

    const io = req.app.get('io');
    if (io) {
      const sockets = io.sockets.sockets;
      sockets.forEach(s => {
        if (s.userEmail === email) {
          s.emit('account_approved', { message: 'መለያዎ ጸድቋል!' });
          s.emit('verification_code', { code, expiresIn: 600 });
        }
      });
    }

    res.json({ message: 'ተጠቃሚው ጸድቋል ✓', code: code, email: email });
  } catch(e) {
    console.error('[admin/approve]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Admin resend verification code ──
router.post('/users/:email/resend-code', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const email = req.params.email;
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ error: 'ተጠቃሚ አልተገኘም' });

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute('UPDATE verification_codes SET used = 1 WHERE user_email = ? AND used = 0', [email]);
    await pool.execute(
      'INSERT INTO verification_codes (user_email, code, expires_at) VALUES (?, ?, ?)',
      [email, code, expiresAt]
    );

    const io = req.app.get('io');
    if (io) {
      const sockets = io.sockets.sockets;
      sockets.forEach(s => {
        if (s.userEmail === email) {
          s.emit('verification_code', { code, expiresIn: 600 });
        }
      });
    }

    res.json({ message: 'አዲስ ኮድ ተፈጥሯል', code: code, email: email });
  } catch(e) {
    console.error('[admin/resend-code]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Block user ──
router.post('/users/:email/block', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE users SET blocked = 1, online = 0 WHERE email = ? AND email != ?',
      [req.params.email, 'admin@yodit.app']
    );

    const io = req.app.get('io');
    if (io) {
      const sockets = io.sockets.sockets;
      sockets.forEach(s => {
        if (s.userEmail === req.params.email) {
          s.emit('account_blocked', { message: 'መለያዎ ታግዷል።' });
          s.disconnect();
        }
      });
    }

    res.json({ message: 'ተጠቃሚው ታግዷል' });
  } catch(e) {
    console.error('[admin/block]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Unblock user ──
router.post('/users/:email/unblock', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE users SET blocked = 0 WHERE email = ? AND email != ?',
      [req.params.email, 'admin@yodit.app']
    );
    res.json({ message: 'እገዳው ተነስቷል' });
  } catch(e) {
    console.error('[admin/unblock]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Send message to user(s) ──
router.post('/message', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { to, toAll, title, body } = req.body;
    if (!body) return res.status(400).json({ error: 'መልክት ያስፈልጋል' });

    if (toAll) {
      const [users] = await pool.execute(
        "SELECT email FROM users WHERE approved = 1 AND email != 'admin@yodit.app'"
      );
      for (const u of users) {
        await pool.execute(
          'INSERT INTO messages (to_email, title, body, to_all) VALUES (?, ?, ?, 1)',
          [u.email, title || null, body]
        );
      }

      const io = req.app.get('io');
      if (io) io.emit('new_message', { title, body });

      return res.json({ message: `ለ ${users.length} ዩዘሮች ተልኳል` });
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ error: 'ተቀባይ ያስፈልጋል' });
    }

    for (const email of to) {
      await pool.execute(
        'INSERT INTO messages (to_email, title, body, to_all) VALUES (?, ?, ?, 0)',
        [email.toLowerCase(), title || null, body]
      );

      const io = req.app.get('io');
      if (io) {
        const sockets = io.sockets.sockets;
        sockets.forEach(s => {
          if (s.userEmail === email.toLowerCase()) {
            s.emit('new_message', { title, body });
          }
        });
      }
    }

    res.json({ message: `ለ ${to.length} ዩዘር(ዎች) ተልኳል` });
  } catch(e) {
    console.error('[admin/message]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Get message stats ──
router.get('/messages/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [msgs] = await pool.execute(`
      SELECT m.*, 
        CASE WHEN m.read_at IS NOT NULL THEN 1 ELSE 0 END as is_read
      FROM messages m 
      ORDER BY m.sent_at DESC 
      LIMIT 100
    `);

    const grouped = {};
    msgs.forEach(m => {
      const key = m.title || (m.body || '').substring(0, 30);
      if (!grouped[key]) {
        grouped[key] = { ...m, readBy: [] };
      }
      if (m.is_read) grouped[key].readBy.push(m.to_email);
    });

    res.json(Object.values(grouped));
  } catch(e) {
    console.error('[admin/messages]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Get single user detail data ──
router.get('/users/:email/data', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const email = req.params.email;
    const [profiles] = await pool.execute(
      'SELECT name, email, approved, blocked, online, last_seen, created_at FROM users WHERE email = ?',
      [email]
    );
    if (profiles.length === 0) return res.status(404).json({ error: 'ተጠቃሚ አልተገኘም' });

    const [raw] = await pool.execute('SELECT data_json, updated_at FROM user_data WHERE email = ?', [email]);
    let data = {};
    try { data = JSON.parse((raw.length > 0 && raw[0].data_json) || '{}'); } catch(e) {}

    res.json({ profile: profiles[0], data, updated_at: raw.length > 0 ? raw[0].updated_at : null });
  } catch(e) {
    console.error('[admin/user-data]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

module.exports = router;
