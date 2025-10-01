import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [recipe, setRecipe] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const canEdit = user && recipe && (user.role === 'admin' || user.id === recipe.user_id);
  const canDeleteRecipe = user && recipe && (user.role === 'admin' || user.id === recipe.user_id);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/recipes/${id}`);
      setRecipe(res.data.recipe || null);
      setIngredients(res.data.ingredients || []);
      setComments(res.data.comments || []);
      // incrémente les vues en tâche de fond
      api.post(`/recipes/${id}/view`).catch(() => {});
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Erreur lors du chargement de la recette.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [load]);

  async function addFav() {
    if (!user) return;
    try {
      await api.post(`/users/${user.id}/favorites/${id}`);
      alert('Ajouté aux favoris');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Impossible d’ajouter aux favoris');
    }
  }

  async function postComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await api.post(`/comments/${id}`, { content: newComment.trim() });
      setNewComment('');
      await load();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Erreur lors de l’envoi du commentaire.');
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
      alert(err.response?.data?.error || 'Erreur lors de la suppression du commentaire.');
    }
  }

  async function deleteRecipe() {
    if (!user) return;
    if (!window.confirm('Voulez-vous vraiment supprimer cette recette ?')) return;
    try {
      await api.delete(`/recipes/${id}`);
      alert('Recette supprimée !');
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Suppression impossible.');
    }
  }

  // --------- visuels / images ----------
  const cover = useMemo(() => {
    const u = (recipe?.image_url || '').trim();
    return u || '/images/default-recipe.jpg';
  }, [recipe]);

  if (loading) {
    return <div className="card p-4 round-xl skeleton" style={{ height: 280 }} />;
  }
  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error} <Link to="/" className="alert-link">Retour à l’accueil</Link>
      </div>
    );
  }
  if (!recipe) return <div className="card p-4 round-xl">Recette introuvable.</div>;

  return (
    <>
      {/* ===== HERO recette (image 16:9 + infos) ===== */}
      <section className="recipe-hero card round-xl overflow-hidden mb-4">
        <div className="row g-0 align-items-center">
          <div className="col-lg-6 p-4 p-lg-5">
            <div className="d-flex align-items-center gap-2 mb-2">
              {recipe.cuisine_type && <span className="badge">🍳 {recipe.cuisine_type}</span>}
              {Number.isFinite(recipe.prep_time_minutes) && recipe.prep_time_minutes > 0 && (
                <span className="badge">⏱ {recipe.prep_time_minutes} min</span>
              )}
              {Number.isFinite(recipe.servings) && recipe.servings > 0 && (
                <span className="badge">👥 {recipe.servings}</span>
              )}
              {Number.isFinite(recipe.views) && (
                <span className="badge">👁 {recipe.views}</span>
              )}
            </div>

            <h1 className="mb-1">{recipe.title}</h1>
            {recipe.user_name && (
              <div className="text-muted small mb-3">par <strong>{recipe.user_name}</strong></div>
            )}

            <div className="d-flex flex-wrap gap-2">
              {user && (
                <button className="btn btn-outline-primary btn-sm" onClick={addFav}>★ Favori</button>
              )}
              <Link to="/" className="btn btn-soft btn-sm">← Accueil</Link>

              {(canEdit || canDeleteRecipe) && (
                <>
                  {canEdit && (
                    <Link to={`/recipes/${id}/edit`} className="btn btn-outline-primary btn-sm">
                      Modifier
                    </Link>
                  )}
                  {canDeleteRecipe && (
                    <button className="btn btn-danger btn-sm" onClick={deleteRecipe}>
                      Supprimer
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="col-lg-6">
            <div className="ratio ratio-16x9 media-shadow">
              <img
                src={cover}
                alt={recipe.title}
                className="object-cover"
                onError={(e)=>{ e.currentTarget.src = '/images/default-recipe.jpg'; }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Panneaux doux (cohérents avec Home/Contact/Create) ===== */}
      {recipe.description && (
        <div className="panel-soft mb-3">
          <div className="panel-title">Description</div>
          <p className="m-0 text-muted">{recipe.description}</p>
        </div>
      )}

      <div className="panel-soft mb-3">
        <div className="panel-title">Ingrédients</div>
        {ingredients.length === 0 ? (
          <div className="text-muted">Aucun ingrédient indiqué.</div>
        ) : (
          <ul className="m-0">
            {ingredients.map(i => (
              <li key={`${i.id}-${i.name}`}>
                <span className="fw-semibold">{i.name}</span>
                {i.quantity ? <> — {i.quantity}</> : null}
                {i.unit ? <> {i.unit}</> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {recipe.instructions && (
        <div className="panel-soft mb-4">
          <div className="panel-title">Instructions</div>
          {/* si tu veux le rendu “étape par ligne” */}
          {String(recipe.instructions).includes('\n') ? (
            <ol className="m-0">
              {String(recipe.instructions)
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean)
                .map((line, i) => <li key={i}>{line}</li>)}
            </ol>
          ) : (
            <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{recipe.instructions}</p>
          )}
        </div>
      )}

      {/* ===== Commentaires ===== */}
      <div className="mb-2 section-title">Commentaires</div>

      <div className="panel-soft mb-3">
        {comments.length === 0 ? (
          <div className="text-muted small">Pas encore de commentaire. Soyez le premier !</div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {comments.map(c => (
              <div key={c.id} className="comment-item">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="small text-muted">
                    <strong>{c.user_name || 'Utilisateur'}</strong> — {new Date(c.created_at).toLocaleString()}
                  </div>
                  {user && (user.role === 'admin' || user.id === c.user_id) && (
                    <button className="btn btn-sm btn-outline-danger" onClick={() => deleteComment(c.id)}>
                      Supprimer
                    </button>
                  )}
                </div>
                <div className="mt-1">{c.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {user ? (
        <form className="panel-soft mb-5" onSubmit={postComment}>
          <div className="panel-title small">Votre commentaire</div>
          <textarea
            className="form-control mb-2"
            rows="3"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Écrire un commentaire…"
          />
          <button className="btn btn-primary" disabled={posting}>
            {posting ? 'Envoi…' : 'Poster commentaire'}
          </button>
        </form>
      ) : (
        <div className="panel-soft mb-5 text-muted small">
          Connectez-vous pour commenter.
        </div>
      )}
    </>
  );
}
