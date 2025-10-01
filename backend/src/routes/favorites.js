// src/routes/favorites.js
const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/favorites -> liste des favoris de l'utilisateur connecté
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Entiers sûrs (bornés) pour éviter toute injection
    const page  = Math.max(parseInt(req.query.page  || '1', 10), 1);
    const limit = Math.min(50, Math.max(parseInt(req.query.limit || '12', 10), 1));
    const offset = (page - 1) * limit;

    // Total pour pagination (optionnel)
    const [[countRow]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM favorites WHERE user_id = ?',
      [userId]
    );
    const total = countRow?.total || 0;

    // ⚠️ Interpolation des entiers validés pour LIMIT/OFFSET
    const [rows] = await pool.execute(
      `SELECT r.*
         FROM favorites f
         JOIN recipes r ON r.id = f.recipe_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
      [userId]
    );

    res.json({ favorites: rows, page, limit, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/favorites/:recipeId
router.post('/:recipeId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = parseInt(req.params.recipeId, 10);
    if (!Number.isInteger(recipeId)) return res.status(400).json({ error: 'Bad recipe id' });

    await pool.execute(
      'INSERT IGNORE INTO favorites (user_id, recipe_id) VALUES (?, ?)',
      [userId, recipeId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/favorites/:recipeId
router.delete('/:recipeId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const recipeId = parseInt(req.params.recipeId, 10);
    if (!Number.isInteger(recipeId)) return res.status(400).json({ error: 'Bad recipe id' });

    await pool.execute(
      'DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?',
      [userId, recipeId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
