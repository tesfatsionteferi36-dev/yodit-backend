const mysql = require('mysql2/promise');

// ── Create connection pool ──
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'yodit',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
});

// ── Initialize database tables ──
async function initDB() {
  const conn = await pool.getConnection();
  try {
    // Create tables
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        approved TINYINT DEFAULT 0,
        blocked TINYINT DEFAULT 0,
        online TINYINT DEFAULT 0,
        last_seen DATETIME,
        socket_id VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        fcm_token VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_admin TINYINT DEFAULT 1,
        to_email VARCHAR(255),
        to_all TINYINT DEFAULT 0,
        title VARCHAR(255),
        body TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        read_by TEXT DEFAULT '[]'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS user_data (
        email VARCHAR(255) PRIMARY KEY,
        data_json TEXT DEFAULT '{}',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb
    `);

    // Create indexes
    try { await conn.execute('CREATE INDEX idx_vcodes_email ON verification_codes(user_email)'); } catch(e) {}
    try { await conn.execute('CREATE INDEX idx_vcodes_expires ON verification_codes(expires_at)'); } catch(e) {}
    try { await conn.execute('CREATE INDEX idx_messages_to ON messages(to_email)'); } catch(e) {}
    try { await conn.execute('CREATE INDEX idx_userdata_email ON user_data(email)'); } catch(e) {}

    // ── Seed admin user (if not exists) ──
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@yodit.app';
    const [existing] = await conn.execute('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (existing.length === 0) {
      const hash = bcrypt.hashSync('Admin@Yodit2024!', 10);
      await conn.execute(
        'INSERT INTO users (name, email, password_hash, approved, blocked) VALUES (?, ?, ?, 1, 0)',
        ['Admin', adminEmail, hash]
      );
      console.log('✓ Admin user seeded: ' + adminEmail);
    }

    console.log('✓ MySQL database initialized');
  } finally {
    conn.release();
  }
}

// ── Clean expired verification codes ──
async function cleanExpiredCodes() {
  try {
    await pool.execute('DELETE FROM verification_codes WHERE expires_at < NOW()');
  } catch(e) { /* ignore */ }
}
setInterval(cleanExpiredCodes, 5 * 60 * 1000);

module.exports = { pool, initDB };
