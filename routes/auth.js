const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Register ──
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'ስም፣ ኢሜይል እና የይለፍ ቃል ያስፈልጋል' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'የይለፍ ቃል ቢያንስ 6 ፊደላት መሆን አለበት' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'ይህ ኢሜይል ቀድሞ ተመዝግቧል' });
    }

    const hash = bcrypt.hashSync(password, 10);
    await pool.execute(
      'INSERT INTO users (name, email, password_hash, approved, blocked) VALUES (?, ?, ?, 0, 0)',
      [name.trim(), email.toLowerCase(), hash]
    );

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('new_registration', { name: name.trim(), email: email.toLowerCase() });
    }

    res.status(201).json({
      message: 'ምዝገባዎ ተሳክቷል። አስተዳዳሪው ሲያጸድቀው መግባት ይችላሉ።',
      status: 'pending_approval'
    });
  } catch(e) {
    console.error('[auth/register]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Login (step 1 — check credentials & get 4-digit code) ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'ኢሜይል እና የይለፍ ቃል ያስፈልጋል' });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    const user = users[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'ኢሜይል ወይም የይለፍ ቃል ትክክል አይደለም' });
    }

    if (user.blocked) {
      return res.status(403).json({ error: 'መለያዎ ታግዷል። አስተዳዳሪውን ያነጋግሩ።', blocked: true });
    }

    if (!user.approved) {
      return res.status(403).json({
        error: 'መለያዎ ገና አልጸደቀም። አስተዳዳሪው እስኪያጸድቀው ይጠብቁ።',
        status: 'pending_approval'
      });
    }

    // Generate 4-digit verification code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute('UPDATE verification_codes SET used = 1 WHERE user_email = ? AND used = 0', [email.toLowerCase()]);
    await pool.execute(
      'INSERT INTO verification_codes (user_email, code, expires_at) VALUES (?, ?, ?)',
      [email.toLowerCase(), code, expiresAt]
    );

    let sentViaSocket = false;
    const io = req.app.get('io');
    if (io) {
      const sockets = io.sockets.sockets;
      sockets.forEach(s => {
        if (s.userEmail === email.toLowerCase()) {
          s.emit('verification_code', { code, expiresIn: 600 });
          sentViaSocket = true;
        }
      });
    }

    res.json({
      message: 'የማረጋገጫ ኮድ ተልኳል',
      requiresVerification: true,
      email: email.toLowerCase(),
      code: code,
      codeExpiresIn: 600,
      sentViaSocket: sentViaSocket
    });
  } catch(e) {
    console.error('[auth/login]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Verify code & get JWT token ──
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'ኢሜይል እና ኮድ ያስፈልጋል' });
    }

    const [records] = await pool.execute(
      'SELECT * FROM verification_codes WHERE user_email = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [email.toLowerCase(), code]
    );

    if (records.length === 0) {
      return res.status(401).json({ error: 'ኮዱ ትክክል አይደለም ወይም ጊዜው አልፏል። እንደገና ይሞክሩ።' });
    }

    await pool.execute('UPDATE verification_codes SET used = 1 WHERE id = ?', [records[0].id]);

    const [users] = await pool.execute('SELECT name, email FROM users WHERE email = ?', [email.toLowerCase()]);
    const user = users[0];
    const token = generateToken(user);

    res.json({ token, user });
  } catch(e) {
    console.error('[auth/verify]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Admin Login (direct, no verification) ──
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'ኢሜይል እና የይለፍ ቃል ያስፈልጋል' });
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@yodit.app';
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin@Yodit2024!';

    if (email !== adminEmail || password !== adminPass) {
      return res.status(401).json({ error: 'የአስተዳዳሪ መረጃ ትክክል አይደለም' });
    }

    const user = { name: 'Admin', email: adminEmail, isAdmin: true };
    const token = generateToken(user);

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (existing.length > 0) {
      await pool.execute('UPDATE users SET online = 1, approved = 1, last_seen = NOW() WHERE email = ?', [adminEmail]);
    }

    res.json({ token, user });
  } catch(e) {
    console.error('[auth/admin-login]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Resend verification code ──
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'ᅢᇜᄯል ያስፈልጋል' });

    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    const user = users[0];
    if (!user) return res.status(404).json({ error: 'ተጠቃሚ አልተገኘም' });
    if (!user.approved) return res.status(403).json({ error: 'መለያዎ ገና አልጸደቀም' });

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute('UPDATE verification_codes SET used = 1 WHERE user_email = ? AND used = 0', [email.toLowerCase()]);
    await pool.execute(
      'INSERT INTO verification_codes (user_email, code, expires_at) VALUES (?, ?, ?)',
      [email.toLowerCase(), code, expiresAt]
    );

    const io = req.app.get('io');
    if (io) {
      const sockets = io.sockets.sockets;
      sockets.forEach(s => {
        if (s.userEmail === email.toLowerCase()) {
          s.emit('verification_code', { code, expiresIn: 600 });
        }
      });
    }

    res.json({ message: 'አዲስ የማረጋገጫ ኮድ ተልኳል', code: code, codeExpiresIn: 600 });
  } catch(e) {
    console.error('[auth/resend-code]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Get current user info ──
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT name, email, approved, blocked, created_at, last_seen FROM users WHERE email = ?',
      [req.user.email]
    );
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch(e) {
    console.error('[auth/me]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

module.exports = router;
