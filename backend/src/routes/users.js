const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

// Add favorite
router.post('/:userId/favorites/:recipeId', authMiddleware, async (req, res) => {
  try {
    const { userId, recipeId } = req.params;
    if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not allowed' });

    await pool.execute('INSERT IGNORE INTO favorites (user_id, recipe_id) VALUES (?, ?)', [userId, recipeId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove favorite
router.delete('/:userId/favorites/:recipeId', authMiddleware, async (req, res) => {
  try {
    const { userId, recipeId } = req.params;
    if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not allowed' });

    await pool.execute('DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?', [userId, recipeId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's favorites
router.get('/:userId/favorites', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (parseInt(userId) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not allowed' });

    const [rows] = await pool.execute(
      `SELECT r.* FROM favorites f JOIN recipes r ON r.id = f.recipe_id WHERE f.user_id = ? ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json({ favorites: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
