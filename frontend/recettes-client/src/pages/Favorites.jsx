// src/pages/Favorites.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../api';

// Helper pour générer un slug FR SEO-friendly
function slugifyTitle(title, id) {
  const base = (title || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'recette';
  return `${base}-${id}`;
}

export default function Favorites() {
  // --- état ---
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // newsletter
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNews, setSubmittingNews] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // ✅ placeholder local (TON chemin réel)
  const localPlaceholder = '/image/default.webp';

  function seededPlaceholder(r, w = 800, h = 600) {
    const seed =
      r.id ||
      Math.abs(String(r.title || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    const tag = (r.cuisine_type || 'food').replace(/\s+/g, '-').toLowerCase();
    return `https://picsum.photos/seed/${encodeURIComponent(seed + '-' + tag)}/${w}/${h}`;
  }

  function finalPlaceholder(r, w = 800, h = 600) {
    const text = encodeURIComponent(r.title || 'Recette');
    return `https://placehold.co/${w}x${h}?text=${text}`;
  }

  // --- normalisation des réponses backend favoris ---
  // Certains back renvoient [{recipe_id, ...}] ou [{id, ...}] ou carrément {recipe: {...}}
  function normalizeFavoriteItem(x) {
    if (!x) return null;

    // cas: { recipe: { ... } }
    if (x.recipe && typeof x.recipe === 'object') return x.recipe;

    // cas: { recipe_id: 12, title, ... } (id absent)
    if (x.recipe_id && !x.id) return { ...x, id: x.recipe_id };

    // cas: déjà une recette
    if (x.id) return x;

    return null;
  }

  // --- fetch favoris (par pages de 9) ---
  async function fetchFavorites(nextPage = 1) {
    setLoading(true);
    try {
      let res;
      try {
        // endpoint favoris (attendu)
        res = await api.get('/favorites', { params: { page: nextPage, limit: 9 } });
      } catch {
        // fallback (ne doit pas arriver en prod, mais évite de casser)
        res = await api.get('/recipes', { params: { page: nextPage, limit: 9 } });
      }

      const raw = res.data.favorites || res.data.recipes || [];
      const arr = raw.map(normalizeFavoriteItem).filter(Boolean);

      setItems(prev => (nextPage === 1 ? arr : [...prev, ...arr]));
      setHasMore(arr.length === 9);
      setPage(nextPage);
    } catch (e) {
      console.error(e);
      if (nextPage === 1) setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFavorites(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- retirer un favori ---
  async function removeFavorite(recipeId) {
    try {
      await api.delete(`/favorites/${recipeId}`);
      setItems(prev => prev.filter(r => r.id !== recipeId));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Impossible de retirer ce favori.');
    }
  }

  // --- newsletter ---
  async function onSubscribe(e) {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    try {
      setSubmittingNews(true);
      await api.post('/newsletter/subscribe', { email: newsletterEmail.trim() });
      setSubscribed(true);
      setNewsletterEmail('');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Abonnement impossible pour le moment.');
    } finally {
      setSubmittingNews(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Mes recettes favorites | CookRecettes</title>
        <meta
          name="description"
          content="Retrouvez toutes vos recettes favorites sur CookRecettes : plats que vous avez likés, mis de côté, et que vous cuisinez régulièrement."
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href="https://www.cookrecettes.fr/mes-favoris" />
      </Helmet>

      <section
        className="round-xl mb-4 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,.08), rgba(59,130,246,.08))',
          border: '1px solid rgba(255,255,255,.25)',
        }}
      >
        <div className="row g-0 align-items-center">
          <div className="col-lg-6 p-4 p-lg-5">
            <span className="badge bg-primary-subtle text-primary mb-2">Favoris</span>
            <h1 className="display-6 fw-bold mb-2">
              Tes <span className="text-gradient">recettes préférées</span> 💜
            </h1>
            <p className="text-muted mb-0">
              Retrouve ici toutes les recettes que tu as mises de côté. Tu peux les consulter,
              les partager, ou les retirer de la liste.
            </p>
          </div>
          <div className="col-lg-6 d-none d-lg-block">
            <div
              style={{
                height: 320,
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </div>
        </div>
      </section>

      {/* ===== Liste ===== */}
      <div className="row">
        {loading && items.length === 0 ? (
          <div className="col-12">
            <div className="card p-4 round-xl text-muted">Chargement…</div>
          </div>
        ) : items.length === 0 ? (
          <div className="col-12">
            <div className="card p-4 round-xl">
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                <div>
                  <h4 className="mb-1">Pas encore de favori</h4>
                  <p className="text-muted mb-0">
                    Explore nos recettes et clique sur 💜 pour les garder ici.
                  </p>
                </div>
                <Link to="/" className="btn btn-primary">
                  Découvrir des recettes
                </Link>
              </div>
            </div>
          </div>
        ) : (
          items.map(r => {
            const first = (r.image_url && String(r.image_url).trim()) ? r.image_url : localPlaceholder;
            const second = localPlaceholder;
            const third = seededPlaceholder(r);
            const fourth = finalPlaceholder(r);

            const detailSlug = slugifyTitle(r.title, r.id);

            return (
              <div className="col-xl-3 col-lg-4 col-md-6 mb-3" key={r.id}>
                <div className="card h-100 round-xl recipe">
                  <img
                    src={first}
                    className="card-img-top"
                    alt={r.title || 'Recette favorite'}
                    loading="lazy"
                    width="800"
                    height="600"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.currentTarget;
                      const step = img.dataset.step || '1';
                      if (step === '1') { img.dataset.step = '2'; img.src = second; return; }
                      if (step === '2') { img.dataset.step = '3'; img.src = third; return; }
                      if (step === '3') { img.dataset.step = '4'; img.src = fourth; return; }
                      img.remove();
                    }}
                    style={{ objectFit: 'cover' }}
                  />

                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{r.title}</h5>

                    <p className="card-text flex-grow-1">
                      {r.description ? r.description.substring(0, 120) : '—'}
                    </p>

                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {r.cuisine_type && <span className="badge">🍳 {r.cuisine_type}</span>}
                      {(Number(r.prep_time_minutes) || 0) > 0 && (
                        <span className="badge">⏱ {Number(r.prep_time_minutes)} min</span>
                      )}
                      {(Number(r.servings) || 0) > 0 && <span className="badge">👥 {Number(r.servings)}</span>}
                    </div>

                    <div className="d-flex gap-2 mt-auto">
                      <Link
                        to={`/recettes/${detailSlug}`}
                        className="btn btn-sm btn-outline-primary w-100"
                      >
                        Voir
                      </Link>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        title="Retirer des favoris"
                        onClick={() => removeFavorite(r.id)}
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===== Charger plus ===== */}
      {hasMore && items.length > 0 && (
        <div className="text-center my-3">
          <button
            className="btn btn-soft"
            onClick={() => fetchFavorites(page + 1)}
            disabled={loading}
          >
            {loading ? 'Chargement…' : 'Charger plus'}
          </button>
        </div>
      )}

      {/* ===== Newsletter ===== */}
      <div
        className="round-xl p-4 p-md-5 my-5 d-flex flex-column flex-md-row align-items-center justify-content-between"
        style={{
          background: 'linear-gradient(90deg, #F97316, #F43F5E)',
          color: 'white',
        }}
      >
        <div className="me-md-4 mb-3 mb-md-0">
          <h4 className="fw-bold mb-1">Ne rate pas les nouvelles pépites</h4>
          <p className="mb-0 opacity-75">
            Reçois chaque semaine une sélection de recettes populaires et de nouveautés.
          </p>
        </div>

        {subscribed ? (
          <div className="badge bg-light text-dark p-3">Inscription confirmée ✅</div>
        ) : (
          <form onSubmit={onSubscribe} className="d-flex w-100" style={{ maxWidth: 520 }}>
            <input
              type="email"
              className="form-control me-2"
              placeholder="Adresse email"
              value={newsletterEmail}
              onChange={e => setNewsletterEmail(e.target.value)}
              required
            />
            <button className="btn btn-dark" disabled={submittingNews}>
              {submittingNews ? 'Envoi…' : 'S’abonner'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
