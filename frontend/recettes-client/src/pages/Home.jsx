// src/pages/Home.jsx
import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// Helper slug FR SEO-friendly
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

export default function Home() {
  const nav = useNavigate();

  // ✅ Chemin réel de l’image par défaut (public/image/default.webp)
  const DEFAULT_IMAGE = '/image/default.webp';

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recherche API (serveur)
  const [q, setQ] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [total, setTotal] = useState(0);

  // UI: 9 au départ + bouton "Afficher tout"
  const [limit, setLimit] = useState(9);
  const [page] = useState(1);
  const [showAll, setShowAll] = useState(false);

  // Filtres côté client
  const [minTime, setMinTime] = useState('');
  const [minServings, setMinServings] = useState('');
  const [excludeIngredients, setExcludeIngredients] = useState('');
  const [hasVideo, setHasVideo] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // newest | time_asc | time_desc | title_asc

  // Vidéos & Newsletter
  const [videos, setVideos] = useState([]);
  const [subEmail, setSubEmail] = useState('');
  const [subMsg, setSubMsg] = useState('');
  const [subLoading, setSubLoading] = useState(false);

  /* ===== Favoris & Notation ===== */
  const [favoriteIds, setFavoriteIds] = useState(new Set()); // Set<number>
  const [myRatings, setMyRatings] = useState({});            // { [id]: 1..5 }
  const [avgRatings, setAvgRatings] = useState({});          // { [id]: number }

  useEffect(() => {
    fetchRecipes();
    fetchVideos();
    fetchFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  async function fetchRecipes(params = {}) {
    setLoading(true);
    try {
      const res = await api.get('/recipes', {
        params: {
          q: params.q ?? (q || undefined),
          ingredients: params.ingredients ?? (ingredients.trim() || undefined),
          cuisine: params.cuisine ?? (cuisine || undefined),
          max_time: params.max_time ?? (maxTime || undefined),
          page: params.page ?? page,
          limit: params.limit ?? limit,
        },
      });
      setRecipes(res.data.recipes || []);
      if (typeof res.data.total === 'number') setTotal(res.data.total);

      const nextAvg = {}, nextMine = {};
      for (const r of (res.data.recipes || [])) {
        if (typeof r.avg_rating === 'number') nextAvg[r.id] = r.avg_rating;
        if (typeof r.my_rating === 'number')  nextMine[r.id] = r.my_rating;
      }
      if (Object.keys(nextAvg).length) setAvgRatings(prev => ({ ...prev, ...nextAvg }));
      if (Object.keys(nextMine).length) setMyRatings(prev => ({ ...prev, ...nextMine }));
    } catch (e) {
      console.error(e);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchVideos() {
    try {
      const res = await api.get('/recipes/videos', { params: { limit: 8 } });
      const list = res.data.recipes || res.data.videos || [];
      const fillers = Math.max(0, 3 - list.length);
      const extra = Array.from({ length: fillers }).map((_, i) => ({
        id: `fake-${i}`,
        title: `Short recette #${i + 1}`,
        video_url: '#',
        image_url: DEFAULT_IMAGE,
        user_name: 'CookRecettes',
      }));
      setVideos([...list, ...extra].slice(0, 3));
    } catch {
      const extra = Array.from({ length: 3 }).map((_, i) => ({
        id: `fake-${i}`,
        title: `Short recette #${i + 1}`,
        video_url: '#',
        image_url: DEFAULT_IMAGE,
        user_name: 'CookRecettes',
      }));
      setVideos(extra);
    }
  }

  async function fetchFavorites() {
    try {
      const res = await api.get('/favorites'); // [{recipe_id}] ou [{id}]
      const ids = new Set((res.data.recipes || res.data.favorites || []).map(x => x.recipe_id ?? x.id));
      setFavoriteIds(ids);
    } catch {
      // non connecté → ignorer
    }
  }

  async function toggleFavorite(id) {
    const isFav = favoriteIds.has(id);
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(id); else next.add(id);
      return next;
    });

    try {
      if (isFav) await api.delete(`/favorites/${id}`);
      else       await api.post(`/favorites/${id}`);
    } catch (e) {
      // revert
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFav) next.add(id); else next.delete(id);
        return next;
      });
      if (e?.response?.status === 401) {
        alert('Connecte-toi pour ajouter des favoris 🙂');
        nav('/connexion');
      } else {
        console.error(e);
      }
    }
  }

  async function rateRecipe(id, rating) {
    const r = Math.max(1, Math.min(5, rating));
    setMyRatings(prev => ({ ...prev, [id]: r }));
    setAvgRatings(prev => {
      const cur = typeof prev[id] === 'number' ? prev[id] : r;
      return { ...prev, [id]: (cur * 4 + r) / 5 };
    });

    try {
      await api.post(`/recipes/${id}/rate`, { rating: r });
    } catch (e) {
      if (e?.response?.status === 401) {
        alert('Connecte-toi pour noter les recettes 🙂');
        nav('/connexion');
      } else {
        console.error(e);
      }
    }
  }

  function onSearch(e) {
    e.preventDefault();
    setShowAll(false);
    setLimit(9);
    fetchRecipes({
      q,
      ingredients: ingredients.trim(),
      cuisine,
      max_time: maxTime,
      page: 1,
      limit: 9,
    });
  }

  function resetFilters() {
    setQ('');
    setIngredients('');
    setCuisine('');
    setMaxTime('');
    setMinTime('');
    setMinServings('');
    setExcludeIngredients('');
    setHasVideo(false);
    setHasImage(false);
    setSortBy('newest');
    setShowAll(false);
    setLimit(9);
    fetchRecipes({ q: '', ingredients: '', cuisine: '', max_time: '', page: 1, limit: 9 });
  }

  // ===== Post-filtrage & tri côté client =====
  const filteredSorted = useMemo(() => {
    const incList = ingredients.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const excList = excludeIngredients.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    let out = [...recipes];

    if (hasVideo) out = out.filter(r => !!(r.video_url && String(r.video_url).trim()));
    if (hasImage) out = out.filter(r => !!(r.image_url && String(r.image_url).trim()));

    if (minTime) {
      const t = parseInt(minTime, 10) || 0;
      out = out.filter(r => (parseInt(r.prep_time_minutes, 10) || 0) >= t);
    }
    if (minServings) {
      const s = parseInt(minServings, 10) || 0;
      out = out.filter(r => (parseInt(r.servings, 10) || 0) >= s);
    }

    const findText = (r) =>
      `${r.title || ''} ${r.description || ''} ${r.cuisine_type || ''}`.toLowerCase();

    if (incList.length) out = out.filter(r => incList.every(ing => findText(r).includes(ing)));
    if (excList.length) out = out.filter(r => excList.every(ing => !findText(r).includes(ing)));

    out.sort((a, b) => {
      if (sortBy === 'time_asc') return (a.prep_time_minutes || 0) - (b.prep_time_minutes || 0);
      if (sortBy === 'time_desc') return (b.prep_time_minutes || 0) - (a.prep_time_minutes || 0);
      if (sortBy === 'title_asc') return String(a.title || '').localeCompare(String(b.title || ''));
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    return out;
  }, [recipes, ingredients, excludeIngredients, hasVideo, hasImage, minTime, minServings, sortBy]);

  // ✅ bouton “Tout voir” fiable
  const canShowMore = !showAll && total > Math.min(filteredSorted.length, limit);

  async function onSubscribe(e) {
    e.preventDefault();
    setSubMsg('');
    if (!subEmail.trim()) { setSubMsg("Saisis un email valide ✉️"); return; }
    setSubLoading(true);
    try {
      await api.post('/newsletter/subscribe', { email: subEmail.trim() });
      setSubMsg("Merci ! Tu recevras les nouvelles recettes et les plus vues 🙌");
      setSubEmail('');
    } catch (err) {
      console.error(err);
      setSubMsg(err.response?.data?.error || "Impossible d'enregistrer l'email pour le moment.");
    } finally {
      setSubLoading(false);
    }
  }

  const CUISINES = [
    'Italienne','Française','Japonaise','Chinoise','Indienne',
    'Mexicaine','Thaïlandaise','Marocaine','Méditerranéenne','Espagnole',
  ];

  // ---- Video cards ----
  const VideoCard = ({ v }) => {
    const poster = (v.image_url && String(v.image_url).trim()) ? v.image_url : DEFAULT_IMAGE;
    return (
      <div className="col-xl-4 col-md-4 col-12 mb-3">
        <div className="card round-xl overflow-hidden">
          <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ paddingTop: '56.25%' }} />
            <img
              src={poster}
              alt={v.title || 'Vidéo de recette'}
              loading="lazy"
              width="640"
              height="360"
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.src = DEFAULT_IMAGE; }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {v.video_url && (
              <a
                href={v.video_url}
                target="_blank"
                rel="noreferrer"
                title="Lire la vidéo"
                className="btn btn-light shadow"
                style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: 9999, width: 48, height: 48,
                  display: 'grid', placeItems: 'center'
                }}
              >
                ▶
              </a>
            )}
          </div>
          <div className="p-2">
            <div className="fw-semibold text-truncate">{v.title || 'Vidéo'}</div>
            <div className="text-muted small text-truncate">par {v.user_name || 'Auteur'}</div>
          </div>
        </div>
      </div>
    );
  };

  const VideoSkeleton = ({ i }) => (
    <div className="col-xl-4 col-md-4 col-12 mb-3" key={`sk-${i}`}>
      <div className="card round-xl overflow-hidden">
        <div style={{ position: 'relative', width: '100%' }}>
          <div className="skeleton" style={{ paddingTop: '56.25%' }} />
        </div>
        <div className="p-2">
          <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 8, marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );

  /* ===== Étoiles dorées (radiogroup accessible) ===== */
  const Stars = ({ value = 0, onPick }) => {
    const [hover, setHover] = useState(0);
    const v = hover || value;
    const gold = '#fbbf24';
    const gray = '#9ca3af';
    return (
      <div className="d-inline-flex align-items-center gap-1" role="radiogroup" aria-label="Noter la recette sur 5">
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} étoile${n>1?'s':''} sur 5`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onPick?.(n)}
            style={{ background:'transparent', border:'none', padding:0, cursor:'pointer', lineHeight:1 }}
            title={`Noter ${n}/5`}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill={n<=v ? gold : gray} xmlns="http://www.w3.org/2000/svg">
              <path d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z"/>
            </svg>
          </button>
        ))}
      </div>
    );
  };

  const recipesCount = recipes.length;

  return (
    <>
      {/* ===== SEO / Helmet ===== */}
      <Helmet>
        <title>CookRecettes | Recettes maison faciles et rapides</title>
        <meta
          name="description"
          content="CookRecettes te permet de trouver, filtrer et enregistrer des recettes maison faciles et rapides : recherche par ingrédients, temps de préparation, type de cuisine, favoris et vidéos."
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href="https://www.cookrecettes.fr/" />

        {/* Open Graph (✅ sans Unsplash) */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="CookRecettes | Recettes maison faciles et rapides" />
        <meta
          property="og:description"
          content="Découvre des recettes simples, filtre par ingrédients et enregistre tes plats préférés dans tes favoris sur CookRecettes."
        />
        <meta property="og:url" content="https://www.cookrecettes.fr/" />
        <meta property="og:image" content="https://www.cookrecettes.fr/image/default.webp" />

        {/* JSON-LD : WebSite + SearchAction */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'CookRecettes',
            url: 'https://www.cookrecettes.fr/',
            description:
              'Plateforme de partage de recettes de cuisine : recherche avancée, favoris, vidéos et newsletter.',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://www.cookrecettes.fr/?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
            inLanguage: 'fr-FR',
            about: 'Recettes de cuisine maison faciles et rapides',
            numberOfItems: recipesCount || undefined,
          })}
        </script>
      </Helmet>

      {/* ===== HERO (✅ sans Unsplash) ===== */}
      <section className="hero card p-4 p-md-5 round-xl mb-4 d-flex flex-column flex-lg-row align-items-center gap-4">
        <div className="flex-grow-1">
          <h1 className="display-6 fw-bold mb-2">
            Choisis parmi <span className="text-gradient">des milliers</span> de recettes
          </h1>
          <p className="text-muted mb-3">
            Des plats du quotidien aux desserts qui déchirent — découvre, filtre et partage tes favoris.
          </p>
          <div className="d-flex gap-2">
            <a href="#recipes" className="btn btn-primary">Découvrir</a>
            <Link to="/ajouter-une-recette" className="btn btn-soft">Ajouter une recette</Link>
          </div>
        </div>

        <div className="hero-thumb" aria-hidden="true">
          <img
            src={DEFAULT_IMAGE}
            alt=""
            onError={(e) => { e.currentTarget.src = DEFAULT_IMAGE; }}
          />
        </div>
      </section>

      {/* ===== Liste + filtres ===== */}
      <section id="recipes" className="row g-3" aria-labelledby="titre-liste-recettes">
        <h2 id="titre-liste-recettes" className="visually-hidden">Liste des recettes</h2>

        {/* Sidebar filtres */}
        <aside className="col-lg-3" aria-label="Filtres de recherche de recettes">
          <form className="card p-3 round-xl sticky-top" style={{ top: 90 }} onSubmit={onSearch}>
            <div className="mb-3">
              <label className="form-label text-muted" htmlFor="search-q">Recherche</label>
              <input id="search-q" className="form-control" placeholder="ex: omelette" value={q} onChange={e => setQ(e.target.value)} />
            </div>

            <div className="mb-3">
              <label className="form-label text-muted" htmlFor="ing-inc">Ingrédients (inclus)</label>
              <input id="ing-inc" className="form-control" placeholder="tomate,oignon" value={ingredients} onChange={e => setIngredients(e.target.value)} />
            </div>

            <div className="mb-3">
              <label className="form-label text-muted" htmlFor="ing-exc">Ingrédients (exclus)</label>
              <input id="ing-exc" className="form-control" placeholder="piment,arachide" value={excludeIngredients} onChange={e => setExcludeIngredients(e.target.value)} />
            </div>

            <div className="mb-3">
              <label className="form-label text-muted" htmlFor="cuisine">Cuisine</label>
              <input id="cuisine" className="form-control" list="cuisines" placeholder="Italienne…" value={cuisine} onChange={e => setCuisine(e.target.value)} />
              <datalist id="cuisines">
                {CUISINES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label text-muted" htmlFor="tmin">Temps min</label>
                <input id="tmin" type="number" className="form-control" placeholder="0" value={minTime} onChange={e => setMinTime(e.target.value)} />
              </div>
              <div className="col-6">
                <label className="form-label text-muted" htmlFor="tmax">Temps max</label>
                <input id="tmax" type="number" className="form-control" placeholder="30" value={maxTime} onChange={e => setMaxTime(e.target.value)} />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-muted" htmlFor="min-serv">Portions min</label>
              <input id="min-serv" type="number" className="form-control" placeholder="1" value={minServings} onChange={e => setMinServings(e.target.value)} />
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <div className="form-check">
                  <input id="f-hasVideo" className="form-check-input" type="checkbox" checked={hasVideo} onChange={e => setHasVideo(e.target.checked)} />
                  <label className="form-check-label" htmlFor="f-hasVideo">Avec vidéo</label>
                </div>
              </div>
              <div className="col-6">
                <div className="form-check">
                  <input id="f-hasImage" className="form-check-input" type="checkbox" checked={hasImage} onChange={e => setHasImage(e.target.checked)} />
                  <label className="form-check-label" htmlFor="f-hasImage">Avec image</label>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-muted" htmlFor="tri">Trier par</label>
              <select id="tri" className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="newest">Plus récentes</option>
                <option value="time_asc">Temps croissant</option>
                <option value="time_desc">Temps décroissant</option>
                <option value="title_asc">Titre A → Z</option>
              </select>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary w-100" type="submit">Filtrer</button>
              <button type="button" className="btn btn-outline-primary w-100" onClick={resetFilters}>Reset</button>
            </div>
          </form>
        </aside>

        {/* Liste */}
        <section className="col-lg-9" aria-label="Résultats des recettes">
          {loading ? (
            <div className="card p-4 round-xl text-muted">Chargement…</div>
          ) : (
            <>
              {filteredSorted.length === 0 ? (
                <div className="card p-4 round-xl text-muted">Aucune recette trouvée. Essaie d’ajuster les filtres.</div>
              ) : (
                <>
                  <div className="row">
                    {(showAll ? filteredSorted : filteredSorted.slice(0, limit)).map(r => {
                      const src = (r.image_url && String(r.image_url).trim()) ? r.image_url : DEFAULT_IMAGE;

                      const fav = favoriteIds.has(r.id);
                      const my  = myRatings[r.id] || 0;
                      const avg = avgRatings[r.id];

                      const detailSlug = slugifyTitle(r.title, r.id);

                      return (
                        <div className="col-xl-4 col-md-6 mb-3" key={r.id}>
                          <article className="card h-100 round-xl recipe">
                            <div className="position-relative">
                              <img
                                src={src}
                                className="card-img-top"
                                alt={r.title}
                                loading="lazy"
                                width="800"
                                height="600"
                                referrerPolicy="no-referrer"
                                onError={(e) => { e.currentTarget.src = DEFAULT_IMAGE; }}
                                style={{ objectFit: 'cover' }}
                              />

                              {/* Favori */}
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(r.id); }}
                                className="btn btn-light shadow position-absolute"
                                style={{
                                  left: 10, top: 10, zIndex: 2,
                                  borderRadius: 9999, width: 36, height: 36,
                                  display: 'grid', placeItems: 'center', padding: 0
                                }}
                                title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                                aria-pressed={fav}
                                aria-label={fav
                                  ? `Retirer la recette ${r.title} de mes favoris`
                                  : `Ajouter la recette ${r.title} à mes favoris`
                                }
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? '#ef4444' : 'none'} stroke={fav ? '#ef4444' : '#6b7280'} strokeWidth="2">
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                              </button>
                            </div>

                            <div className="card-body d-flex flex-column">
                              <h5 className="card-title">{r.title}</h5>

                              {/* étoiles */}
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <Stars value={my} onPick={(n) => rateRecipe(r.id, n)} />
                                {typeof avg === 'number' && <span className="small text-muted">({avg.toFixed(1)})</span>}
                              </div>

                              <p className="card-text flex-grow-1">
                                {r.description ? r.description.substring(0, 120) : '—'}
                              </p>

                              <div className="d-flex flex-wrap gap-2 mb-2">
                                {r.cuisine_type && <span className="badge">🍳 {r.cuisine_type}</span>}
                                {r.prep_time_minutes > 0 && <span className="badge">⏱ {r.prep_time_minutes} min</span>}
                                {r.servings > 0 && <span className="badge">👥 {r.servings}</span>}
                                {r.video_url && <span className="badge">🎬 vidéo</span>}
                              </div>

                              {/* ✅ lien SEO slug-id */}
                              <Link to={`/recettes/${detailSlug}`} className="btn btn-sm btn-outline-primary mt-auto">
                                Voir
                              </Link>
                            </div>
                          </article>
                        </div>
                      );
                    })}
                  </div>

                  {canShowMore && (
                    <div className="text-center mt-2">
                      <button className="btn btn-soft" onClick={() => nav('/recettes')}>
                        Voir toutes les recettes ({total})
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </section>

      {/* ===== Vidéos ===== */}
      <section className="mt-5" aria-label="Vidéos de recettes">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3 className="m-0">Vidéos</h3>
          {videos.length > 0 && <span className="badge">Featured</span>}
        </div>

        {videos.length === 0 ? (
          <div className="row">
            {[0,1,2].map(i => <VideoSkeleton i={i} key={i} />)}
          </div>
        ) : (
          <div className="row">
            {videos.slice(0, 3).map(v => <VideoCard key={`vid-${v.id}`} v={v} />)}
          </div>
        )}
      </section>

      {/* ===== Newsletter ===== */}
      <section className="my-5" aria-label="Inscription à la newsletter">
        <div className="card round-xl p-4 p-md-5" style={{ background: '#e85d3c', color: '#fff' }}>
          <div className="fw-bold fs-4 mb-2">
            Sois le premier au courant des nouvelles recettes & des plus vues !
          </div>
          <form className="d-flex flex-column flex-md-row gap-2 align-items-stretch" onSubmit={onSubscribe}>
            <input
              type="email"
              className="form-control"
              placeholder="Adresse email"
              value={subEmail}
              onChange={(e) => setSubEmail(e.target.value)}
              required
              aria-label="Adresse email pour recevoir la newsletter"
            />
            <button className="btn btn-warning fw-semibold" disabled={subLoading}>
              {subLoading ? 'Envoi…' : 'S’abonner'}
            </button>
          </form>
          {subMsg && (
            <div className="mt-2" role="status" aria-live="polite">
              {subMsg}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
