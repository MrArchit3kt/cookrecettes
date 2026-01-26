// src/pages/EditRecipe.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';

// Helper pour générer un slug propre
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

export default function EditRecipe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recipe, setRecipe] = useState(null);

  // champs
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [prepTime, setPrepTime] = useState(0);
  const [servings, setServings] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '' }]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/recipes/${id}`);
        const r = res.data.recipe;
        setRecipe(r);

        setTitle(r.title || '');
        setImageUrl(r.image_url || '');
        setDescription(r.description || '');
        setCuisineType(r.cuisine_type || '');
        setPrepTime(r.prep_time_minutes || 0);
        setServings(r.servings || 1);
        setInstructions(r.instructions || '');
        setIngredients(
          (res.data.ingredients || []).map(i => ({
            name: i.name || '',
            quantity: i.quantity || '',
            unit: i.unit || '',
          })) || [{ name: '', quantity: '', unit: '' }]
        );
      } catch (e) {
        console.error(e);
        alert('Recette introuvable.');
        navigate('/', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const canEdit = user && recipe && (user.role === 'admin' || user.id === recipe.user_id);

  function addIngredient() {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  }
  function removeIngredient(index) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }
  function updateIngredient(index, key, value) {
    setIngredients(ingredients.map((ing, i) =>
      i === index ? { ...ing, [key]: value } : ing
    ));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canEdit) return alert("Vous n'avez pas les droits pour modifier cette recette.");
    if (!title.trim()) return alert('Le titre est requis');

    setSaving(true);
    try {
      await api.put(`/recipes/${id}`, {
        title,
        description,
        image_url: imageUrl || null,
        cuisine_type: cuisineType || null,
        prep_time_minutes: Number(prepTime) || 0,
        servings: Number(servings) || 1,
        instructions,
        ingredients: ingredients
          .filter(i => i.name.trim())
          .map(i => ({
            name: i.name.trim(),
            quantity: i.quantity || null,
            unit: i.unit || null,
          })),
      });

      alert('Recette mise à jour !');

      // redirection vers l’URL FR SEO /recettes/slug-id
      const slug = slugifyTitle(title, id);
      navigate(`/recettes/${slug}`, { replace: true });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  const pageTitle = recipe
    ? `Modifier : ${recipe.title} | CookRecettes`
    : 'Modifier une recette | CookRecettes';

  const pageDescription = recipe
    ? `Mettez à jour votre recette "${recipe.title}" sur CookRecettes : image, temps de préparation, ingrédients et instructions.`
    : "Modifiez une recette existante sur CookRecettes : ajustez les ingrédients, le temps et les étapes.";

  return (
    <>
      {/* SEO */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {/* En général on ne veut pas indexer les pages d’édition */}
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* État de chargement / droits */}
      {loading && (
        <div className="card p-4 round-xl skeleton" style={{ height: 200 }}>
          Chargement de la recette…
        </div>
      )}

      {!loading && !canEdit && (
        <div className="card p-4 round-xl">
          Vous n’êtes pas autorisé à modifier cette recette.
        </div>
      )}

      {!loading && canEdit && (
        <div className="d-flex justify-content-center">
          <div className="w-100" style={{ maxWidth: '960px' }}>
            {/* ===== HERO ===== */}
            <section
              className="round-xl mb-4 overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, rgba(124,58,237,.08), rgba(59,130,246,.10))',
                border: '1px solid rgba(255,255,255,.25)',
              }}
            >
              <div className="row g-0 align-items-center">
                <div className="col-lg-7 p-4 p-lg-5">
                  <span className="badge bg-primary-subtle text-primary mb-2">
                    Édition de recette
                  </span>
                  <h1 className="h3 h-lg-2 fw-bold mb-2">
                    Modifier&nbsp;:&nbsp;
                    <span className="text-gradient">
                      {recipe?.title || 'Votre recette'}
                    </span>
                  </h1>
                  <p className="text-muted mb-0">
                    Ajustez la description, les ingrédients, le temps de préparation
                    et les instructions sans perdre l’existant.
                  </p>
                </div>
                <div className="col-lg-5 d-none d-lg-block">
                  <div
                    style={{
                      height: 260,
                      backgroundImage: `url(${
                        (recipe?.image_url || '').trim() ||
                        'https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=1600&auto=format&fit=crop'
                      })`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                </div>
              </div>
            </section>

            {/* ===== FORMULAIRE ===== */}
            <div className="card round-xl p-3 p-md-4 mb-5">
              <h3 className="mb-3">Modifier la recette</h3>

              <form onSubmit={onSubmit}>
                {/* Titre */}
                <div className="mb-3">
                  <label className="form-label">Titre *</label>
                  <input
                    className="form-control"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Image */}
                <div className="mb-3">
                  <label className="form-label">URL de l’image</label>
                  <input
                    className="form-control"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://… (laisser vide pour garder l’image actuelle ou utiliser le fallback)"
                  />
                  {imageUrl ? (
                    <div className="mt-2">
                      <img
                        src={imageUrl}
                        alt="Prévisualisation"
                        style={{
                          maxWidth: '100%',
                          maxHeight: 240,
                          objectFit: 'cover',
                          borderRadius: 12,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                {/* Bloc détails */}
                <div className="card round-xl p-3 mb-3">
                  <div className="mb-2">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Texte affiché sur la fiche de la recette."
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-2">
                      <label className="form-label">Type de cuisine</label>
                      <input
                        className="form-control"
                        value={cuisineType}
                        onChange={e => setCuisineType(e.target.value)}
                        placeholder="Italienne, Française…"
                      />
                    </div>
                    <div className="col-md-4 mb-2">
                      <label className="form-label">Temps de préparation (min)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={prepTime}
                        onChange={e => setPrepTime(e.target.value)}
                      />
                    </div>
                    <div className="col-md-4 mb-2">
                      <label className="form-label">Portions</label>
                      <input
                        type="number"
                        className="form-control"
                        value={servings}
                        onChange={e => setServings(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label">Instructions</label>
                    <textarea
                      className="form-control"
                      rows="5"
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                      placeholder="Étape 1 : …&#10;Étape 2 : …"
                    />
                  </div>
                </div>

                {/* Ingrédients */}
                <div className="card round-xl p-3 mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h5 className="m-0">Ingrédients</h5>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={addIngredient}
                    >
                      + Ajouter un ingrédient
                    </button>
                  </div>

                  {ingredients.map((ing, idx) => (
                    <div className="row g-2 align-items-end mb-2" key={idx}>
                      <div className="col-md-5">
                        <label className="form-label">Nom *</label>
                        <input
                          className="form-control"
                          value={ing.name}
                          onChange={e =>
                            updateIngredient(idx, 'name', e.target.value)
                          }
                          placeholder="Farine, Lait…"
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Quantité</label>
                        <input
                          className="form-control"
                          value={ing.quantity}
                          onChange={e =>
                            updateIngredient(idx, 'quantity', e.target.value)
                          }
                          placeholder="200"
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Unité</label>
                        <input
                          className="form-control"
                          value={ing.unit}
                          onChange={e =>
                            updateIngredient(idx, 'unit', e.target.value)
                          }
                          placeholder="g, ml, càs…"
                        />
                      </div>
                      <div className="col-md-1">
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => removeIngredient(idx)}
                          disabled={ingredients.length === 1}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-primary" disabled={saving}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-soft"
                    onClick={() => {
                      const slug = slugifyTitle(title || recipe?.title, id);
                      navigate(`/recettes/${slug}`);
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
