const express = require('express');
const bcrypt = require('bcrypt');              // ok si tu as installé "bcrypt". Sinon: const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();

const router = express.Router();

function signToken(user) {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
}

/* ===========================
   POST /api/auth/register
   =========================== */
router.post('/register', async (req, res) => {
  try {
    let { name, email, password } = req.body || {};
    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères).' });
    }

    const [exists] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (exists.length) {
      return res.status(409).json({ error: 'Email déjà utilisé.' });
    }

    const hash = await bcrypt.hash(password, 10);

    const [ins] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name || null, email, hash]
    );

    const [[user]] = await pool.execute(
      'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
      [ins.insertId]
    );

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error('REGISTER error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ===========================
   POST /api/auth/login
   =========================== */
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {};
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const [rows] = await pool.execute(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || '');
    if (!ok) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    // ne jamais renvoyer le hash
    delete user.password_hash;

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error('LOGIN error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
