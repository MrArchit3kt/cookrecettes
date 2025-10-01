const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// ---- Config : image par défaut optionnelle (facultatif)
const DEFAULT_IMAGE_URL = process.env.DEFAULT_IMAGE_URL || null;

/* ---- Helper: placeholder image stable (loremflickr, seed déterministe) ---- */
function placeholderFor({ id, cuisine_type, title }, size = { w: 1200, h: 800 }) {
  const seed =
    id || Math.abs(String(title || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const tag = (cuisine_type || '').trim().toLowerCase().replace(/\s+/g, '-');
  const keywords = [tag, 'food', 'meal', 'dish', 'plate'].filter(Boolean).join(',');
  return `https://loremflickr.com/${size.w}/${size.h}/${encodeURIComponent(keywords)}?lock=${seed}`;
}

/* ---- Helper: compose l'URL finale à renvoyer ---- */
function finalImageUrl(row, size) {
  const img = (row.image_url || '').trim();
  if (img) return img;
  if (DEFAULT_IMAGE_URL) return DEFAULT_IMAGE_URL;
  return placeholderFor(row, size);
}

/* Helper: crée/trouve un ingrédient et renvoie son id */
async function findOrCreateIngredient(name) {
  const n = (name || '').trim();
  if (!n) return null;
  const [rows] = await pool.execute('SELECT id FROM ingredients WHERE name = ?', [n]);
  if (rows.length) return rows[0].id;
  const [res] = await pool.execute('INSERT INTO ingredients (name) VALUES (?)', [n]);
  return res.insertId;
}

/* Helper: savoir si une colonne existe dans la base courante */
async function hasColumn(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0]?.cnt > 0;
}

/* ===========================================
   GET /api/recipes  → liste + filtres + pagination + total
   Params: q, ingredients, cuisine, max_time, has_video
   =========================================== */
router.get('/', async (req, res) => {
  try {
    const { q, ingredients, cuisine, max_time, has_video } = req.query;

    const page  = Math.max(parseInt(req.query.page  || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '12', 10), 1);
    const offset = (page - 1) * limit;

    const joins = [];
    const where = [];
    const params = [];

    // filtre ingrédients
    if (ingredients) {
      joins.push('JOIN recipe_ingredients ri ON ri.recipe_id = r.id');
      joins.push('JOIN ingredients i ON i.id = ri.ingredient_id');
      const list = String(ingredients).split(',').map(s => s.trim()).filter(Boolean);
      if (list.length) {
        where.push('(' + list.map(() => 'i.name LIKE ?').join(' OR ') + ')');
        list.forEach(s => params.push(`%${s}%`));
      }
    }

    if (q)        { where.push('r.title LIKE ?');            params.push(`%${q}%`); }
    if (cuisine)  { where.push('r.cuisine_type = ?');        params.push(cuisine); }
    if (max_time) { where.push('r.prep_time_minutes <= ?');  params.push(parseInt(max_time, 10) || 0); }

    // filtre "has_video" uniquement si la colonne existe
    const canUseVideoUrl = await hasColumn('recipes', 'video_url');
    if (has_video && canUseVideoUrl) {
      where.push('COALESCE(r.video_url, "") <> ""');
    }

    const joinSql  = joins.join(' ');
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // total
    const [countRows] = await pool.execute(
      `SELECT COUNT(DISTINCT r.id) AS total
         FROM recipes r ${joinSql ? ' ' + joinSql : ''} ${whereSql}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // data
    const [rows] = await pool.execute(
      `SELECT DISTINCT r.*
         FROM recipes r ${joinSql ? ' ' + joinSql : ''} ${whereSql}
         ORDER BY r.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    rows.forEach(r => {
      r.image_url = finalImageUrl(r, { w: 800, h: 600 });
    });

    res.json({ recipes: rows, page, limit, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ===========================================
   GET /api/recipes/videos  → dernières recettes avec vidéo
   Params: limit (par défaut 8)
   =========================================== */
router.get('/videos', async (req, res) => {
  try {
    const limit = Math.max(parseInt(req.query.limit || '8', 10), 1);

    const canUseVideoUrl = await hasColumn('recipes', 'video_url');
    if (!canUseVideoUrl) {
      return res.json({ recipes: [], limit });
    }

    const [rows] = await pool.execute(
      `SELECT r.*
         FROM recipes r
        WHERE COALESCE(r.video_url, "") <> ""
        ORDER BY r.created_at DESC
        LIMIT ${limit}`
    );
    rows.forEach(r => {
      r.image_url = finalImageUrl(r, { w: 800, h: 600 });
    });
    res.json({ recipes: rows, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ===========================================
   GET /api/recipes/:id  → détail + auteur + ingrédients + commentaires
   =========================================== */
router.get('/:id', async (req, res) => {
  try {
    const recipeId = req.params.id;

    const [recipeRows] = await pool.execute(
      `SELECT r.*, u.name AS user_name
         FROM recipes r
         JOIN users u ON u.id = r.user_id
        WHERE r.id = ?`,
      [recipeId]
    );
    if (!recipeRows.length) return res.status(404).json({ error: 'Recipe not found' });
    const recipe = recipeRows[0];

    recipe.image_url = finalImageUrl(recipe, { w: 1200, h: 800 });

    const [ings] = await pool.execute(
      `SELECT i.id, i.name, ri.quantity, ri.unit
         FROM recipe_ingredients ri
         JOIN ingredients i ON i.id = ri.ingredient_id
        WHERE ri.recipe_id = ?`,
      [recipeId]
    );

    const [comments] = await pool.execute(
      `SELECT c.id, c.content, c.created_at, u.id AS user_id, u.name AS user_name
         FROM comments c
         JOIN users u ON u.id = c.user_id
        WHERE c.recipe_id = ?
        ORDER BY c.created_at DESC`,
      [recipeId]
    );

    res.json({ recipe, ingredients: ings, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ===========================================
   POST /api/recipes  → création (auth)
   Body peut contenir: video_url
   =========================================== */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    let {
      title, description, image_url, video_url, cuisine_type,
      prep_time_minutes = 0, servings = 1, instructions,
      ingredients = []
    } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const normalizedImage = (image_url && String(image_url).trim()) ? image_url.trim() : null;
    const canUseVideoUrl = await hasColumn('recipes', 'video_url');
    const canUseViews   = await hasColumn('recipes', 'views');
    const normalizedVideo = (video_url && String(video_url).trim()) ? video_url.trim() : null;

    // ► Construire dynamiquement l’INSERT selon les colonnes réellement présentes
    const cols = ['user_id', 'title', 'description', 'image_url'];
    const phs  = ['?',       '?',     '?',           '?'       ];
    const vals = [ userId,    title.trim(), description || null, normalizedImage ];

    if (canUseVideoUrl) { cols.push('video_url'); phs.push('?'); vals.push(normalizedVideo); }
    cols.push('cuisine_type');        phs.push('?'); vals.push(cuisine_type || null);
    cols.push('prep_time_minutes');   phs.push('?'); vals.push(parseInt(prep_time_minutes, 10) || 0);
    if (canUseViews) { cols.push('views'); phs.push('?'); vals.push(0); }
    cols.push('servings');            phs.push('?'); vals.push(parseInt(servings, 10) || 1);
    cols.push('instructions');        phs.push('?'); vals.push(instructions || null);

    const sql = `INSERT INTO recipes (${cols.join(', ')}) VALUES (${phs.join(', ')})`;
    const [result] = await pool.execute(sql, vals);
    const recipeId = result.insertId;

    // image par défaut si non fournie
    if (!normalizedImage) {
      const url = DEFAULT_IMAGE_URL || placeholderFor({ id: recipeId, cuisine_type, title }, { w: 800, h: 600 });
      await pool.execute('UPDATE recipes SET image_url = ? WHERE id = ?', [url, recipeId]);
    }

    // ingrédients
    for (const ing of (Array.isArray(ingredients) ? ingredients : [])) {
      const ingId = await findOrCreateIngredient(ing.name);
      if (!ingId) continue;
      await pool.execute(
        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, `unit`) VALUES (?, ?, ?, ?)',
        [recipeId, ingId, ing.quantity || null, ing.unit || null]
      );
    }

    const [[created]] = await pool.execute('SELECT * FROM recipes WHERE id = ?', [recipeId]);
    created.image_url = finalImageUrl(created, { w: 800, h: 600 });
    res.json({ recipe: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ===========================================
   PUT /api/recipes/:id  → update (owner/admin)
   Body peut contenir: video_url
   =========================================== */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const recipeId = req.params.id;
    const { id: userId, role } = req.user;

    const [[exists]] = await pool.execute('SELECT user_id FROM recipes WHERE id = ?', [recipeId]);
    if (!exists) return res.status(404).json({ error: 'Recipe not found' });
    if (exists.user_id !== userId && role !== 'admin') return res.status(403).json({ error: 'Not allowed' });

    let {
      title, description, image_url, video_url, cuisine_type,
      prep_time_minutes, servings, instructions, ingredients
    } = req.body;

    const normalizedImage = (image_url && String(image_url).trim()) ? image_url.trim() : null;
    const canUseVideoUrl = await hasColumn('recipes', 'video_url');
    const normalizedVideo = (video_url && String(video_url).trim()) ? video_url.trim() : null;

    let sql = `UPDATE recipes
                  SET title = ?, description = ?, image_url = ?, ${canUseVideoUrl ? 'video_url = ?, ' : ''}cuisine_type = ?,
                      prep_time_minutes = ?, servings = ?, instructions = ?
                WHERE id = ?`;

    const params = [
      title || null,
      description || null,
      normalizedImage
    ];
    if (canUseVideoUrl) params.push(normalizedVideo);
    params.push(
      cuisine_type || null,
      parseInt(prep_time_minutes, 10) || 0,
      parseInt(servings, 10) || 1,
      instructions || null,
      recipeId
    );

    await pool.execute(sql, params);

    if (Array.isArray(ingredients)) {
      await pool.execute('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId]);
      for (const ing of ingredients) {
        const ingId = await findOrCreateIngredient(ing.name);
        if (!ingId) continue;
        await pool.execute(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, `unit`) VALUES (?, ?, ?, ?)',
          [recipeId, ingId, ing.quantity || null, ing.unit || null]
        );
      }
    }

    const [[updated]] = await pool.execute('SELECT * FROM recipes WHERE id = ?', [recipeId]);
    updated.image_url = finalImageUrl(updated, { w: 800, h: 600 });
    res.json({ recipe: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ===========================================
   POST /api/recipes/:id/view  → incrémente le compteur de vues
   =========================================== */
router.post('/:id/view', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    if (!recipeId) return res.status(400).json({ error: 'Bad id' });

    const canUseViews = await hasColumn('recipes', 'views');
    if (!canUseViews) {
      // si la colonne n'existe pas dans cette base, on renvoie ok sans maj
      return res.json({ ok: true, views: null });
    }

    await pool.execute('UPDATE recipes SET views = views + 1 WHERE id = ?', [recipeId]);
    const [[row]] = await pool.execute('SELECT views FROM recipes WHERE id = ?', [recipeId]);
    res.json({ ok: true, views: row?.views ?? null });
  } catch (err) {
    console.error('VIEW error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ===========================================
   DELETE /api/recipes/:id  → delete (owner/admin)
   =========================================== */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const recipeId = req.params.id;
    const { id: userId, role } = req.user;

    const [[exists]] = await pool.execute('SELECT user_id FROM recipes WHERE id = ?', [recipeId]);
    if (!exists) return res.status(404).json({ error: 'Recipe not found' });
    if (exists.user_id !== userId && role !== 'admin') return res.status(403).json({ error: 'Not allowed' });

    // supprimer le fichier si c'était un upload local
    const [[rowImg]] = await pool.execute('SELECT image_url FROM recipes WHERE id = ?', [recipeId]);
    if (rowImg?.image_url && rowImg.image_url.includes('/uploads/')) {
      const file = rowImg.image_url.split('/uploads/')[1];
      if (file) {
        const p = path.join(__dirname, '..', 'uploads', file);
        fs.promises.unlink(p).catch(() => {}); // ignore si déjà absent
      }
    }

    await pool.execute('DELETE FROM recipes WHERE id = ?', [recipeId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
