const express = require('express');
const pool = require('../db');

const router = express.Router();

async function ensureSubscribersTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

router.post('/subscribe', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Email invalide' });
    }

    await ensureSubscribersTable(); // <- garantit l’existence

    await pool.execute(
      'INSERT INTO subscribers(email) VALUES (?) ON DUPLICATE KEY UPDATE email = VALUES(email)',
      [email]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('NEWSLETTER subscribe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
