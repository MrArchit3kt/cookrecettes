// src/pages/Recettes.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../api';

function toSlug(str) {
  return (
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'recette'
  );
}

export default function Recettes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  // Filtres
  const [q, setQ] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [minTime, setMinTime] = useState('');
  const [minServings, setMinServings] = useState('');
  const [hasVideo, setHasVideo] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  // ✅ TON DEFAULT (public/image/default.webp)
  const localPlaceholder = '/image/default.webp';

  // ✅ On considère "aléatoire / placeholder" = on remplace par ton default local
  function isRandomOrPlaceholderUrl(url) {
    const u = String(url || '').trim().toLowerCase();
    if (!u) return true;

    // tes anciens placeholders backend / front (à neutraliser)
    if (u.includes('loremflickr.com')) return true;
    if (u.includes('picsum.photos')) return true;
    if (u.includes('placehold.co')) return true;

    // optionnel : si tu veux aussi neutraliser unsplash auto (décommente)
    // if (u.includes('images.unsplash.com')) return true;

    return false;
  }

  function safeImageUrl(url) {
    if (isRandomOrPlaceholderUrl(url)) return localPlaceholder;
    return String(url).trim();
  }

  const CUISINES = [
    'Italienne',
    'Française',
    'Japonaise',
    'Chinoise',
    'Indienne',
    'Mexicaine',
    'Thaïlandaise',
    'Marocaine',
    'Méditerranéenne',
    'Espagnole',
  ];

  useEffect(() => {
    fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRecipes(params = {}) {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/recipes', {
        params: {
          q: params.q ?? (q || undefined),
          ingredients: params.ingredients ?? (ingredients.trim() || undefined),
          cuisine: params.cuisine ?? (cuisine || undefined),
          max_time: params.max_time ?? (maxTime || undefined),
          page: 1,
          limit: params.limit ?? 9999,
        },
      });
      setRecipes(res.data.recipes || []);
      if (typeof res.data.total === 'number') setTotal(res.data.total);
    } catch (err) {
      console.error(err);
      setRecipes([]);
      setError(err.response?.data?.error || 'Impossible de charger les recettes.');
    } finally {
      setLoading(false);
    }
  }

  function onSearch(e) {
    e.preventDefault();
    fetchRecipes({
      q,
      ingredients: ingredients.trim(),
      cuisine,
      max_time: maxTime,
      limit: 9999,
    });
  }

  function resetFilters() {
    setQ('');
    setIngredients('');
    setCuisine('');
    setMaxTime('');
    setMinTime('');
    setMinServings('');
    setHasVideo(false);
    setHasImage(false);
    setSortBy('newest');
    fetchRecipes({ q: '', ingredients: '', cuisine: '', max_time: '', limit: 9999 });
  }

  const filteredSorted = useMemo(() => {
    const incList = ingredients
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    let out = [...recipes];

    if (hasVideo) out = out.filter(r => !!(r.video_url && String(r.video_url).trim()));

    // ✅ "Avec image" = image_url présent ET pas random/placeholder
    if (hasImage) {
      out = out.filter(r => {
        const u = (r.image_url && String(r.image_url).trim()) || '';
        return u && !isRandomOrPlaceholderUrl(u);
      });
    }

    if (minTime) {
      const t = parseInt(minTime, 10) || 0;
      out = out.filter(r => (parseInt(r.prep_time_minutes, 10) || 0) >= t);
    }
    if (minServings) {
      const s = parseInt(minServings, 10) || 0;
      out = out.filter(r => (parseInt(r.servings, 10) || 0) >= s);
    }

    const findText = r =>
      `${r.title || ''} ${r.description || ''} ${r.cuisine_type || ''}`.toLowerCase();
    if (incList.length) out = out.filter(r => incList.every(ing => findText(r).includes(ing)));

    out.sort((a, b) => {
      if (sortBy === 'time_asc') return (a.prep_time_minutes || 0) - (b.prep_time_minutes || 0);
      if (sortBy === 'time_desc') return (b.prep_time_minutes || 0) - (a.prep_time_minutes || 0);
      if (sortBy === 'title_asc') return String(a.title || '').localeCompare(String(b.title || ''));
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    return out;
  }, [recipes, ingredients, hasVideo, hasImage, minTime, minServings, sortBy]);

  return (
    <>
      {/* SEO */}
      <Helmet>
        <title>Toutes les recettes | CookRecettes</title>
        <meta
          name="description"
          content="Parcourez toutes les recettes de CookRecettes : filtrage par ingrédients, type de cuisine, temps de préparation et nombre de portions."
        />
        <link rel="canonical" href="https://www.cookrecettes.fr/recettes" />
      </Helmet>

      {/* HERO compact */}
      <section className="card p-4 p-md-5 round-xl mb-4">
        <h1 className="mb-2">Toutes les recettes</h1>
        <p className="text-muted mb-0">
          Catalogue complet des recettes publiées sur CookRecettes, avec recherche et filtres
          pour trouver rapidement le plat qui t’intéresse.
        </p>
      </section>

      <div className="row g-3">
        {/* Filtres à gauche */}
        <aside className="col-lg-3">
          <form className="card p-3 round-xl sticky-top" style={{ top: 90 }} onSubmit={onSearch}>
            <div className="mb-3">
              <label className="form-label text-muted">Recherche</label>
              <input
                className="form-control"
                placeholder="ex : lasagnes"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-muted">Ingrédients inclus</label>
              <input
                className="form-control"
                placeholder="tomate,oignon"
                value={ingredients}
                onChange={e => setIngredients(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-muted">Cuisine</label>
              <input
                className="form-control"
                list="cuisines-recettes"
                placeholder="Italienne…"
                value={cuisine}
                onChange={e => setCuisine(e.target.value)}
              />
              <datalist id="cuisines-recettes">
                {CUISINES.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label text-muted">Temps min</label>
                <input
                  type="number"
                  className="form-control"
                  value={minTime}
                  onChange={e => setMinTime(e.target.value)}
                />
              </div>
              <div className="col-6">
                <label className="form-label text-muted">Temps max</label>
                <input
                  type="number"
                  className="form-control"
                  value={maxTime}
                  onChange={e => setMaxTime(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-muted">Portions min</label>
              <input
                type="number"
                className="form-control"
                value={minServings}
                onChange={e => setMinServings(e.target.value)}
              />
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <div className="form-check">
                  <input
                    id="f-rec-video"
                    type="checkbox"
                    className="form-check-input"
                    checked={hasVideo}
                    onChange={e => setHasVideo(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="f-rec-video">
                    Avec vidéo
                  </label>
                </div>
              </div>
              <div className="col-6">
                <div className="form-check">
                  <input
                    id="f-rec-image"
                    type="checkbox"
                    className="form-check-input"
                    checked={hasImage}
                    onChange={e => setHasImage(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="f-rec-image">
                    Avec image
                  </label>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-muted">Trier par</label>
              <select
                className="form-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="newest">Plus récentes</option>
                <option value="time_asc">Temps croissant</option>
                <option value="time_desc">Temps décroissant</option>
                <option value="title_asc">Titre A → Z</option>
              </select>
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary w-100">
                Filtrer
              </button>
              <button
                type="button"
                className="btn btn-outline-primary w-100"
                onClick={resetFilters}
              >
                Reset
              </button>
            </div>
          </form>
        </aside>

        {/* Liste des recettes */}
        <section className="col-lg-9">
          {loading && recipes.length === 0 ? (
            <div className="card p-4 round-xl text-muted">Chargement…</div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : filteredSorted.length === 0 ? (
            <div className="card p-4 round-xl text-muted">
              Aucune recette trouvée avec ces filtres.
            </div>
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="text-muted small">
                  {total || filteredSorted.length} recette(s) trouvée(s)
                </div>
              </div>

              <div className="row">
                {filteredSorted.map(r => {
                  const imgSrc = safeImageUrl(r.image_url);
                  const slug = toSlug(r.title);

                  return (
                    <div className="col-xl-4 col-md-6 mb-3" key={r.id}>
                      <div className="card h-100 round-xl recipe">
                        <img
                          src={imgSrc}
                          className="card-img-top"
                          alt={r.title}
                          loading="lazy"
                          width="800"
                          height="600"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // fallback unique : ton image locale
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = localPlaceholder;
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
                            {r.prep_time_minutes > 0 && (
                              <span className="badge">⏱ {r.prep_time_minutes} min</span>
                            )}
                            {r.servings > 0 && <span className="badge">👥 {r.servings}</span>}
                            {r.video_url && <span className="badge">🎬 vidéo</span>}
                          </div>

                          <Link
                            to={`/recettes/${slug}-${r.id}`}
                            className="btn btn-sm btn-outline-primary mt-auto"
                          >
                            Voir la recette
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
