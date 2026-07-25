const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Get user's data ──
router.get('/data', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT data_json FROM user_data WHERE email = ?', [req.user.email]);
    if (rows.length === 0) return res.json({ data: {} });
    try {
      res.json({ data: JSON.parse(rows[0].data_json) });
    } catch {
      res.json({ data: {} });
    }
  } catch(e) {
    console.error('[user/data]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Save user's data ──
router.post('/data', authMiddleware, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });

    const json = JSON.stringify(data);
    await pool.execute(`
      INSERT INTO user_data (email, data_json, updated_at) VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), updated_at = NOW()
    `, [req.user.email, json]);

    res.json({ message: 'Saved', updatedAt: new Date().toISOString() });
  } catch(e) {
    console.error('[user/save]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

// ── Sync data (pull latest from server) ──
router.get('/sync', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT data_json, updated_at FROM user_data WHERE email = ?',
      [req.user.email]
    );
    if (rows.length === 0) return res.json({ data: {}, updatedAt: null });
    try {
      res.json({ data: JSON.parse(rows[0].data_json), updatedAt: rows[0].updated_at });
    } catch {
      res.json({ data: {}, updatedAt: null });
    }
  } catch(e) {
    console.error('[user/sync]', e.message);
    res.status(500).json({ error: 'የሰርቨር ስህተት' });
  }
});

module.exports = router;
