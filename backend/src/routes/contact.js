const express = require('express');
const pool = require('../db');

const router = express.Router();

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'Email, sujet et message sont requis.' });
    }
    await pool.execute(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES (?, ?, ?, ?)`,
      [name || null, email.trim(), subject.trim(), message.trim()]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('CONTACT error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
