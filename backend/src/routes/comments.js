const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/:recipeId', authMiddleware, async (req, res) => {
  try {
    const recipeId = req.params.recipeId;
    const userId = req.user.id;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Contenu requis' });

    await pool.execute('INSERT INTO comments (recipe_id, user_id, content) VALUES (?, ?, ?)', [recipeId, userId, content]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/comments/:id  (owner or admin)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const commentId = req.params.id;
  
      // Qui a écrit ce commentaire ?
      const [rows] = await pool.execute('SELECT user_id FROM comments WHERE id = ?', [commentId]);
      if (!rows.length) return res.status(404).json({ error: 'Comment not found' });
  
      const ownerId = rows[0].user_id;
      const isOwner = req.user && req.user.id === ownerId;
      const isAdmin = req.user && req.user.role === 'admin';
  
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Not allowed' });
      }
  
      await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
// DELETE /api/comments/:id  (owner or admin)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const commentId = req.params.id;
  
      // Qui a écrit ce commentaire ?
      const [rows] = await pool.execute('SELECT user_id FROM comments WHERE id = ?', [commentId]);
      if (!rows.length) return res.status(404).json({ error: 'Comment not found' });
  
      const ownerId = rows[0].user_id;
      const isOwner = req.user && req.user.id === ownerId;
      const isAdmin = req.user && req.user.role === 'admin';
  
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Not allowed' });
      }
  
      await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
    

// Option: GET /api/comments/:recipeId handled in recipe detail route already
module.exports = router;
