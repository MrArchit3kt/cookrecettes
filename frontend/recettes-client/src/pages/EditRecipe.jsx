import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';

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
        setRecipe(res.data.recipe);
        const r = res.data.recipe;
        setTitle(r.title || '');
        setImageUrl(r.image_url || '');
        setDescription(r.description || '');
        setCuisineType(r.cuisine_type || '');
        setPrepTime(r.prep_time_minutes || 0);
        setServings(r.servings || 1);
        setInstructions(r.instructions || '');
        setIngredients((res.data.ingredients || []).map(i => ({
          name: i.name || '',
          quantity: i.quantity || '',
          unit: i.unit || ''
        })) || [{ name: '', quantity: '', unit: '' }]);
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
    setIngredients(ingredients.map((ing, i) => i === index ? { ...ing, [key]: value } : ing));
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
          .map(i => ({ name: i.name.trim(), quantity: i.quantity || null, unit: i.unit || null }))
      });
      alert('Recette mise à jour !');
      navigate(`/recipes/${id}`, { replace: true });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Chargement…</div>;
  if (!canEdit) return <div>Vous n’êtes pas autorisé à modifier cette recette.</div>;

  return (
    <div className="row">
      <div className="col-lg-10 col-xl-8">
        <h3>Modifier la recette</h3>
        <form onSubmit={onSubmit}>
          <div className="mb-2">
            <label className="form-label">Titre *</label>
            <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          <div className="mb-2">
            <label className="form-label">URL de l’image</label>
            <input className="form-control" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
            {imageUrl ? (
              <div className="mt-2">
                <img src={imageUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'cover' }}
                     onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
            ) : null}
          </div>

          <div className="mb-2">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows="2" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="row">
            <div className="col-md-4 mb-2">
              <label className="form-label">Type de cuisine</label>
              <input className="form-control" value={cuisineType} onChange={e => setCuisineType(e.target.value)} />
            </div>
            <div className="col-md-4 mb-2">
              <label className="form-label">Temps de préparation (min)</label>
              <input type="number" className="form-control" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
            </div>
            <div className="col-md-4 mb-2">
              <label className="form-label">Portions</label>
              <input type="number" className="form-control" value={servings} onChange={e => setServings(e.target.value)} />
            </div>
          </div>

          <div className="mb-2">
            <label className="form-label">Instructions</label>
            <textarea className="form-control" rows="5" value={instructions} onChange={e => setInstructions(e.target.value)} />
          </div>

          <hr />
          <h5>Ingrédients</h5>
          {ingredients.map((ing, idx) => (
            <div className="row g-2 align-items-end mb-2" key={idx}>
              <div className="col-md-5">
                <label className="form-label">Nom *</label>
                <input className="form-control" value={ing.name} onChange={e => updateIngredient(idx, 'name', e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Quantité</label>
                <input className="form-control" value={ing.quantity} onChange={e => updateIngredient(idx, 'quantity', e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Unité</label>
                <input className="form-control" value={ing.unit} onChange={e => updateIngredient(idx, 'unit', e.target.value)} />
              </div>
              <div className="col-md-1">
                <button type="button" className="btn btn-outline-danger" onClick={() => removeIngredient(idx)} disabled={ingredients.length === 1}>✕</button>
              </div>
            </div>
          ))}
          <div className="mb-3">
            <button type="button" className="btn btn-outline-secondary" onClick={addIngredient}>+ Ajouter un ingrédient</button>
          </div>

          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}
