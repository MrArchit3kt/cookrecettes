require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth');
const recipeRoutes = require('./routes/recipes');
const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/users');
const imageRoutes = require('./routes/images');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const videoRoutes = require('./routes/videos');
const favoritesRoutes = require('./routes/favorites');
const unsplashRoutes = require('./routes/unsplash');

const app = express();

/* =========================
   Sécurité (Helmet)
   ========================= */
/**
 * IMPORTANT:
 * Helmet peut bloquer certaines ressources (images externes, etc.)
 * Ici on reste safe et on évite les surprises.
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // permet <img src="http://.../uploads/...">
  })
);

/* =========================
   CORS (front)
   ========================= */
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'http://localhost:5174';
app.use(
  cors({
    origin: FRONT_ORIGIN,
    credentials: false,
  })
);

/* =========================
   Body JSON
   ========================= */
app.use(express.json({ limit: '2mb' }));

/* =========================
   Static uploads (images locales)
   ========================= */
/**
 * On sert les fichiers depuis: backend/uploads
 * Tu as déjà un dossier "uploads" à la racine du backend.
 * __dirname ici = backend/src
 * donc .. = backend
 * puis uploads = backend/uploads
 */
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

/* =========================
   Rate limiters
   ========================= */
const authLimiter = rateLimit({ windowMs: 60_000, max: 20 });
const uploadLimiter = rateLimit({ windowMs: 60_000, max: 30 });
const unsplashLimiter = rateLimit({ windowMs: 60_000, max: 60 });

/* =========================
   Routes API
   ========================= */
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/images', uploadLimiter, imageRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/unsplash', unsplashLimiter, unsplashRoutes);

/* =========================
   404 uniquement pour l’API
   ========================= */
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

/* =========================
   Error handler (plus intelligent)
   ========================= */
app.use((err, req, res, next) => {
  console.error(err);

  // Erreurs multer (upload)
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message || 'Erreur upload.' });
  }

  // Erreurs custom (ex: fileFilter)
  if (err.message && /Format non supporté|Aucun fichier/i.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
