// src/pages/RecipeDetail.jsx
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';

const DEFAULT_IMAGE = '/image/default.webp';

function slugify(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ✅ extrait un id numérique depuis :
// - "191"
// - "crepes-au-sucre-191"
// - "crepes-au-sucre-191?x=y"
function extractNumericId(param) {
  const raw = String(param || '').split('?')[0].trim();
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  const m = raw.match(/(\d+)\s*$/); // dernier groupe de chiffres à la fin
  return m ? parseInt(m[1], 10) : NaN;
}

export default function RecipeDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  /**
   * Routes dans App.jsx :
   * - /recettes/:slug-:id  => params.slug + params.id
   * - /recettes/:id        => params.id
   * - /recipes/:id         => params.id
   *
   * Donc l'id peut venir de params.id (toujours) et parfois du slug combiné.
   */
  const rawParam = useMemo(() => {
    // Cas 1: /recettes/:slug-:id => params.id est présent, params.slug aussi
    // Cas 2: /recettes/:id => params.id uniquement (et contient "191" OU "crepes-au-sucre-191" selon ce que tu linkes)
    // Cas 3: /recipes/:id => params.id
    if (typeof params?.id !== 'undefined') return String(params.id);
    if (typeof params?.slug !== 'undefined') return String(params.slug);
    return '';
  }, [params]);

  const recipeId = useMemo(() => {
    // Si route /recettes/:slug-:id => params.id est déjà le nombre
    // Sinon on essaye d'extraire depuis rawParam
    if (params?.id && /^\d+$/.test(String(params.id))) return parseInt(String(params.id), 10);
    return extractNumericId(rawParam);
  }, [params, rawParam]);

  const [recipe, setRecipe] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const canEdit = !!(user && recipe && (user.role === 'admin' || user.id === recipe.user_id));
  const canDeleteRecipe = canEdit;

  const cover = useMemo(() => {
    const u = (recipe?.image_url || '').trim();
    return u || DEFAULT_IMAGE;
  }, [recipe]);

  const seoDescription = useMemo(() => {
    if (!recipe) {
      return 'Recette détaillée sur CookRecettes : ingrédients, instructions et conseils de préparation.';
    }
    if (!recipe.description) {
      return `Recette "${recipe.title}" sur CookRecettes : ingrédients, étapes et temps de préparation.`;
    }
    const txt = String(recipe.description).replace(/\s+/g, ' ').trim();
    return txt.length > 160 ? `${txt.slice(0, 157)}…` : txt;
  }, [recipe]);

  const canonicalPath = useMemo(() => {
    if (!recipe?.id || !recipe?.title) return null;
    const goodSlug = `${slugify(recipe.title)}-${recipe.id}`;
    return `/recettes/${goodSlug}`;
  }, [recipe]);

  const canonicalUrl = useMemo(() => {
    if (canonicalPath) return `https://www.cookrecettes.fr${canonicalPath}`;
    if (Number.isFinite(recipeId) && recipeId > 0) return `https://www.cookrecettes.fr/recettes/${recipeId}`;
    return `https://www.cookrecettes.fr/recettes`;
  }, [canonicalPath, recipeId]);

  const ldJson = useMemo(() => {
    if (!recipe) return null;

    const prepMin = parseInt(recipe.prep_time_minutes, 10);
    const duration = Number.isFinite(prepMin) && prepMin > 0 ? `PT${prepMin}M` : undefined;

    const avg = typeof recipe.avg_rating === 'number' ? recipe.avg_rating : undefined;
    const ratingCount =
      typeof recipe.ratings_count === 'number'
        ? recipe.ratings_count
        : (Array.isArray(comments) ? comments.length : undefined);

    const obj = {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: recipe.title,
      description: seoDescription,
      image: cover,
      author: recipe.user_name ? { '@type': 'Person', name: recipe.user_name } : undefined,
      recipeCuisine: recipe.cuisine_type || undefined,
      recipeYield: recipe.servings ? `${recipe.servings} personne(s)` : undefined,
      totalTime: duration,
      datePublished: recipe.created_at || undefined,
      url: canonicalUrl,
      aggregateRating: avg
        ? { '@type': 'AggregateRating', ratingValue: avg.toFixed?.(1) ?? avg, reviewCount: ratingCount }
        : undefined,
    };

    if (Array.isArray(ingredients) && ingredients.length) {
      obj.recipeIngredient = ingredients.map(i => {
        const qty = [i.quantity, i.unit].filter(Boolean).join(' ');
        return qty ? `${qty} ${i.name}` : i.name;
      });
    }

    if (recipe.instructions) {
      const steps = String(recipe.instructions)
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      if (steps.length) {
        obj.recipeInstructions = steps.map((txt, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          text: txt,
        }));
      }
    }

    return obj;
  }, [recipe, ingredients, comments, seoDescription, cover, canonicalUrl]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    if (!Number.isFinite(recipeId) || recipeId <= 0) {
      setRecipe(null);
      setIngredients([]);
      setComments([]);
      setError('Recipe not found');
      setLoading(false);
      return;
    }

    try {
      const res = await api.get(`/recipes/${recipeId}`);
      const r = res.data?.recipe || null;

      setRecipe(r);
      setIngredients(res.data?.ingredients || []);
      setComments(res.data?.comments || []);

      // incrémente les vues en tâche de fond
      api.post(`/recipes/${recipeId}/view`).catch(() => {});

      // ✅ Redirection SEO vers l’URL canonique si on n’y est pas déjà
      if (r?.id && r?.title) {
        const goodSlug = `${slugify(r.title)}-${r.id}`;
        const currentPath = location.pathname; // ex: /recettes/191
        const goodPath = `/recettes/${goodSlug}`;

        if (currentPath !== goodPath) {
          // IMPORTANT : évite boucle si déjà canonique
          navigate(goodPath, { replace: true });
        }
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Erreur lors du chargement de la recette.');
      setRecipe(null);
      setIngredients([]);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [recipeId, navigate, location.pathname]);

  useEffect(() => {
    load();
  }, [load]);

  async function addFav() {
    if (!user) {
      alert('Connecte-toi pour ajouter des favoris 🙂');
      navigate('/connexion');
      return;
    }
    try {
      await api.post(`/favorites/${recipeId}`);
      alert('Ajouté aux favoris');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Impossible d’ajouter aux favoris');
    }
  }

  async function postComment(e) {
    e.preventDefault();
    if (!user) {
      alert('Connecte-toi pour commenter 🙂');
      navigate('/connexion');
      return;
    }
    if (!newComment.trim()) return;

    setPosting(true);
    try {
      await api.post(`/comments/${recipeId}`, { content: newComment.trim() });
      setNewComment('');
      await load();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Erreur lors de l’envoi du commentaire.');
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(commentId) {
    if (!window.confirm('Voulez-vous vraiment supprimer ce commentaire ?')) return;
    try {
      await api.delete(`/comments/${commentId}`);
      await load();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Erreur lors de la suppression du commentaire.');
    }
  }

  async function deleteRecipe() {
    if (!user) return;
    if (!window.confirm('Voulez-vous vraiment supprimer cette recette ?')) return;
    try {
      await api.delete(`/recipes/${recipeId}`);
      alert('Recette supprimée !');
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Suppression impossible.');
    }
  }

  // --------- Rendus conditionnels ----------
  if (loading) {
    return <div className="card p-4 round-xl skeleton" style={{ height: 280 }} />;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}{' '}
        <Link to="/" className="alert-link">
          Retour à l’accueil
        </Link>
      </div>
    );
  }

  if (!recipe) {
    return <div className="card p-4 round-xl">Recette introuvable.</div>;
  }

  return (
    <>
      {/* ===== SEO / Helmet ===== */}
      <Helmet>
        <title>{`${recipe.title} | CookRecettes`}</title>
        <meta name="description" content={seoDescription} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${recipe.title} | CookRecettes`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={cover} />

        {/* JSON-LD Recipe */}
        {ldJson && <script type="application/ld+json">{JSON.stringify(ldJson)}</script>}
      </Helmet>

      <article aria-label={`Recette ${recipe.title}`}>
        {/* ===== HERO recette ===== */}
        <section className="recipe-hero card round-xl overflow-hidden mb-4">
          <div className="row g-0 align-items-center">
            <div className="col-lg-6 p-4 p-lg-5">
              <div className="d-flex align-items-center gap-2 mb-2">
                {recipe.cuisine_type && <span className="badge">🍳 {recipe.cuisine_type}</span>}
                {Number(recipe.prep_time_minutes) > 0 && (
                  <span className="badge">⏱ {recipe.prep_time_minutes} min</span>
                )}
                {Number(recipe.servings) > 0 && <span className="badge">👥 {recipe.servings}</span>}
                {Number.isFinite(Number(recipe.views)) && <span className="badge">👁 {recipe.views}</span>}
              </div>

              <h1 className="mb-1">{recipe.title}</h1>

              {recipe.user_name && (
                <div className="text-muted small mb-3">
                  par <strong>{recipe.user_name}</strong>
                </div>
              )}

              <div className="d-flex flex-wrap gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={addFav}
                  aria-label="Ajouter cette recette à mes favoris"
                >
                  ★ Favori
                </button>

                <Link to="/recettes" className="btn btn-soft btn-sm">
                  ← Toutes les recettes
                </Link>

                {canEdit && (
                  <Link to={`/recettes/${recipe.id}/modifier`} className="btn btn-outline-primary btn-sm">
                    Modifier
                  </Link>
                )}

                {canDeleteRecipe && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={deleteRecipe}
                    aria-label="Supprimer définitivement cette recette"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>

            <div className="col-lg-6">
              <div className="ratio ratio-16x9 media-shadow">
                <img
                  src={cover}
                  alt={`Photo de la recette ${recipe.title}`}
                  className="object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_IMAGE;
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== Description ===== */}
        {recipe.description && (
          <section className="panel-soft mb-3" aria-label="Description de la recette">
            <div className="panel-title">Description</div>
            <p className="m-0 text-muted">{recipe.description}</p>
          </section>
        )}

        {/* ===== Ingrédients ===== */}
        <section className="panel-soft mb-3" aria-label="Liste des ingrédients">
          <div className="panel-title">Ingrédients</div>

          {ingredients.length === 0 ? (
            <div className="text-muted">Aucun ingrédient indiqué.</div>
          ) : (
            <ul className="m-0">
              {ingredients.map((i) => (
                <li key={`${i.id ?? i.name}-${i.name}`}>
                  <span className="fw-semibold">{i.name}</span>
                  {i.quantity ? <> — {i.quantity}</> : null}
                  {i.unit ? <> {i.unit}</> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ===== Instructions ===== */}
        {recipe.instructions && (
          <section className="panel-soft mb-4" aria-label="Étapes de préparation">
            <div className="panel-title">Instructions</div>

            {String(recipe.instructions).includes('\n') ? (
              <ol className="m-0">
                {String(recipe.instructions)
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
              </ol>
            ) : (
              <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>
                {recipe.instructions}
              </p>
            )}
          </section>
        )}

        {/* ===== Commentaires ===== */}
        <section className="mb-2 section-title" id="titre-commentaires">
          Commentaires
        </section>

        <section className="panel-soft mb-3" aria-labelledby="titre-commentaires">
          {comments.length === 0 ? (
            <div className="text-muted small">Pas encore de commentaire. Soyez le premier !</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="small text-muted">
                      <strong>{c.user_name || 'Utilisateur'}</strong> —{' '}
                      {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                    </div>

                    {user && (user.role === 'admin' || user.id === c.user_id) && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteComment(c.id)}
                        aria-label="Supprimer ce commentaire"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>

                  <div className="mt-1">{c.content}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ajout commentaire */}
        {user ? (
          <form className="panel-soft mb-5" onSubmit={postComment} aria-label="Ajouter un commentaire">
            <div className="panel-title small">Votre commentaire</div>
            <textarea
              className="form-control mb-2"
              rows="3"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Écrire un commentaire…"
            />
            <button className="btn btn-primary" disabled={posting}>
              {posting ? 'Envoi…' : 'Poster commentaire'}
            </button>
          </form>
        ) : (
          <div className="panel-soft mb-5 text-muted small">Connectez-vous pour commenter.</div>
        )}
      </article>
    </>
  );
}
