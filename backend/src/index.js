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
const app = express();

/* Sécurité */
app.use(helmet());

// adapte si tu as une autre URL front
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'http://localhost:5174';
app.use(cors({ origin: FRONT_ORIGIN, credentials: false }));

// Limiter les endpoints sensibles
const authLimiter = rateLimit({ windowMs: 60_000, max: 20 }); // 20 req/min
const uploadLimiter = rateLimit({ windowMs: 60_000, max: 30 });

app.use(express.json());

// Fichiers uploadés accessibles publiquement
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/images', uploadLimiter, imageRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/favorites', favoritesRoutes);


// 404 générique API
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Gestion d’erreurs (ne divulgue pas les détails SQL en prod)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
