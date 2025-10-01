const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

// dossier /uploads (déjà servi statiquement dans index.js)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Limites & formats
const MAX_VIDEO_MB = parseInt(process.env.MAX_VIDEO_MB || '20', 10); // 20 Mo par défaut
const allowed = new Set(['video/mp4', 'video/webm', 'video/quicktime']); // mp4, webm, mov

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = path.basename(file.originalname || 'video', ext).replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowed.has(file.mimetype)) return cb(null, true);
    cb(new Error('FORMAT_REJECTED'));
  },
});

// POST /api/videos/upload  → { url, filename, size }
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const url = `/uploads/${req.file.filename}`; // servi par express.static
    res.json({ url, filename: req.file.filename, size: req.file.size });
  } catch (err) {
    if (err?.message === 'FORMAT_REJECTED') {
      return res.status(400).json({ error: 'Type de fichier non autorisé (mp4, webm, mov).' });
    }
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `Vidéo trop volumineuse (max ${MAX_VIDEO_MB} Mo).` });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
