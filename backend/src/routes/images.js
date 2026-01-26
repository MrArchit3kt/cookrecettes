const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

const router = express.Router();

/**
 * On stocke dans: backend/uploads/recipes
 * Ton index.js sert déjà /uploads en statique, donc ça restera accessible via:
 * http://localhost:4000/uploads/recipes/...
 */
const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
const recipesDir = path.join(uploadRoot, 'recipes');

if (!fs.existsSync(recipesDir)) fs.mkdirSync(recipesDir, { recursive: true });

/* =========================
   Multer: memory storage
   ========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB (ajuste si tu veux)
  },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype);
    if (!ok) return cb(new Error('Format non supporté. Utilise JPG, PNG, WebP ou AVIF.'));
    cb(null, true);
  },
});

/* =========================
   Helpers
   ========================= */
function getBaseUrl(req) {
  // Si tu as BASE_URL (prod), on l’utilise. Sinon on reconstruit depuis la requête.
  return (
    process.env.BASE_URL ||
    `${req.protocol}://${req.get('host')}`
  );
}

function uid() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * On génère 4 tailles pour responsive:
 * - 320 : mobile
 * - 640 : mobile/retina
 * - 960 : défaut (cards/hero)
 * - 1280: grand écran
 */
const SIZES = [320, 640, 960, 1280];

/* =========================
   POST /api/images/upload
   Champ attendu: file
   ========================= */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });

    const base = getBaseUrl(req);

    // base filename commun (sans extension)
    const key = `${Date.now()}-${uid()}`;

    // Optionnel: sous-dossier par date (plus propre si tu as beaucoup d’images)
    // ex: uploads/recipes/2025/12/
    const d = new Date();
    const subDir = path.join(recipesDir, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'));
    if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });

    // Pour les URLs publiques
    const publicSubPath = `/uploads/recipes/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    // On lit le buffer, on normalise orientation + on convertit en webp
    const input = sharp(req.file.buffer, { failOn: 'none' }).rotate();

    // Génération des variantes
    const variants = {};
    for (const w of SIZES) {
      const filename = `${key}-${w}.webp`;
      const outPath = path.join(subDir, filename);

      await input
        .clone()
        .resize({
          width: w,
          withoutEnlargement: true, // évite d’upscaler une petite image
        })
        .webp({ quality: 82 }) // bon compromis qualité/poids
        .toFile(outPath);

      variants[w] = `${base}${publicSubPath}/${filename}`;
    }

    // On choisit 960 comme "url principale"
    const url = variants[960] || variants[640] || variants[320];

    // srcset pour <img srcSet="..." sizes="...">
    const srcset = SIZES
      .filter(w => variants[w])
      .map(w => `${variants[w]} ${w}w`)
      .join(', ');

    res.json({
      url,
      srcset,
      variants, // ex: { "320": "...", "640": "...", ... }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
