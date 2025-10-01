import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function CreateRecipe() {
  const nav = useNavigate();

  // Image
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Vidéo
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const MAX_VIDEO_MB = 20;

  // Métadonnées
  const [description, setDescription] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [prepTime, setPrepTime] = useState(0);
  const [servings, setServings] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '' }]);
  const [loading, setLoading] = useState(false);

  // Newsletter
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNews, setSubmittingNews] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  function addIngredient() {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  }
  function removeIngredient(index) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }
  function updateIngredient(index, key, value) {
    setIngredients(ingredients.map((ing, i) => (i === index ? { ...ing, [key]: value } : ing)));
  }

  // Upload IMAGE
  async function handleUpload() {
    if (!file) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/images/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(res.data.url);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Upload échoué.');
    } finally {
      setUploading(false);
    }
  }

  // Upload VIDEO
  async function handleVideoUpload() {
    if (!videoFile) return;
    const sizeMb = videoFile.size / (1024 * 1024);
    if (sizeMb > MAX_VIDEO_MB) {
      alert(`Vidéo trop volumineuse (${sizeMb.toFixed(1)} Mo). Max ${MAX_VIDEO_MB} Mo.`);
      return;
    }
    try {
      setVideoUploading(true);
      const fd = new FormData();
      fd.append('video', videoFile);
      const res = await api.post('/videos/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVideoUrl(res.data.url);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Upload vidéo échoué.');
    } finally {
      setVideoUploading(false);
    }
  }

  // Submit recette
  async function onSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return alert('Le titre est requis');
    setLoading(true);
    try {
      const payload = {
        title,
        description,
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        cuisine_type: cuisineType || null,
        prep_time_minutes: Number(prepTime) || 0,
        servings: Number(servings) || 1,
        instructions,
        ingredients: ingredients
          .filter(i => i.name.trim())
          .map(i => ({ name: i.name.trim(), quantity: i.quantity || null, unit: i.unit || null })),
      };
      const res = await api.post('/recipes', payload);
      nav(`/recipes/${res.data.recipe.id}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Erreur serveur');
    } finally {
      setLoading(false);
    }
  }

  // Newsletter
  async function onSubscribe(e) {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    try {
      setSubmittingNews(true);
      await api.post('/newsletter/subscribe', { email: newsletterEmail.trim() });
      setSubscribed(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Abonnement impossible pour le moment.');
    } finally {
      setSubmittingNews(false);
    }
  }

  // Préviews
  const previewSrc = imageUrl || (file ? URL.createObjectURL(file) : '');
  const videoPreviewSrc = videoUrl || (videoFile ? URL.createObjectURL(videoFile) : '');

  return (
    <>
      {/* ===== HERO ===== */}
      <section
        className="round-xl mb-4 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,.08), rgba(59,130,246,.08))',
          border: '1px solid rgba(255,255,255,.25)',
        }}
      >
        <div className="row g-0 align-items-center">
          <div className="col-lg-6 p-4 p-lg-5">
            <span className="badge bg-primary-subtle text-primary mb-2">Nouvelle recette</span>
            <h1 className="display-6 fw-bold mb-2">
              Partage ta <span className="text-gradient">meilleure recette</span>
            </h1>
            <p className="text-muted">
              Ajoute une image (ou laisse vide pour la photo par défaut), une courte vidéo, les ingrédients et les étapes. 
              Ta recette sera visible par la communauté ✨
            </p>
            <a href="#create" className="btn btn-primary mt-2">Commencer</a>
          </div>
          <div className="col-lg-6 d-none d-lg-block">
            <div
              style={{
                height: 320,
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </div>
        </div>
      </section>

      <div id="create" className="row">
        <div className="col-xl-9 mx-auto">
          {/* ===== Carte formulaire ===== */}
          <div className="card round-xl p-3 p-md-4 mb-4">
            <h3 className="mb-3">Ajouter une recette</h3>

            {/* Bloc image & vidéo côte à côte */}
            <div className="row">
              <div className="col-lg-6">
                <div className="card round-xl p-3 mb-3">
                  <h6 className="mb-3">Image</h6>

                  <div className="mb-2">
                    <label className="form-label">URL de l’image</label>
                    <input
                      className="form-control"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      placeholder="https://… (laisser vide pour image par défaut)"
                    />
                    <div className="form-text">
                      Laisse vide pour utiliser l’image par défaut.
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label">Ou téléverser une image</label>
                    <div className="d-flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="form-control"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={!file || uploading}
                        onClick={handleUpload}
                      >
                        {uploading ? 'Envoi…' : 'Téléverser'}
                      </button>
                    </div>
                    <div className="form-text">Après upload, l’URL sera remplie automatiquement.</div>
                  </div>

                  {previewSrc && (
                    <div className="mt-2">
                      <img
                        src={previewSrc}
                        alt="preview"
                        className="w-100"
                        style={{ maxHeight: 220, objectFit: 'cover', borderRadius: 12 }}
                        onError={(e) => {
                          const fallback = `https://loremflickr.com/800/600/${encodeURIComponent(
                            cuisineType || 'food'
                          )},food,dish`;
                          if (e.currentTarget.src !== fallback) {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = fallback;
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="col-lg-6">
                <div className="card round-xl p-3 mb-3 h-100">
                  <h6 className="mb-3">Vidéo courte (optionnel)</h6>

                  <div className="mb-2">
                    <label className="form-label">URL de la vidéo (mp4/webm/mov)</label>
                    <input
                      className="form-control"
                      value={videoUrl}
                      onChange={e => setVideoUrl(e.target.value)}
                      placeholder="https://…"
                    />
                    <div className="form-text">
                      Hébergement externe accepté, ou upload local ci-dessous (max {MAX_VIDEO_MB} Mo).
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label">Téléverser une vidéo</label>
                    <div className="d-flex gap-2">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="form-control"
                        onChange={e => setVideoFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={!videoFile || videoUploading}
                        onClick={handleVideoUpload}
                      >
                        {videoUploading ? 'Envoi…' : 'Téléverser'}
                      </button>
                    </div>
                    <div className="form-text">
                      Formats: MP4, WebM, MOV — poids max {MAX_VIDEO_MB} Mo.
                    </div>
                  </div>

                  {videoPreviewSrc && (
                    <div className="mt-2">
                      <video
                        src={videoPreviewSrc}
                        controls
                        className="w-100"
                        style={{ maxHeight: 220, objectFit: 'cover', borderRadius: 12 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

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

              {/* Détails */}
              <div className="card round-xl p-3 mb-3">
                <div className="mb-2">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
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
                  />
                </div>
              </div>

              {/* Ingrédients */}
              <div className="card round-xl p-3 mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h5 className="m-0">Ingrédients</h5>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addIngredient}>
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
                        onChange={e => updateIngredient(idx, 'name', e.target.value)}
                        placeholder="Farine, Lait…"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Quantité</label>
                      <input
                        className="form-control"
                        value={ing.quantity}
                        onChange={e => updateIngredient(idx, 'quantity', e.target.value)}
                        placeholder="200"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Unité</label>
                      <input
                        className="form-control"
                        value={ing.unit}
                        onChange={e => updateIngredient(idx, 'unit', e.target.value)}
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
                <button className="btn btn-primary" disabled={loading}>
                  {loading ? 'Envoi…' : 'Créer la recette'}
                </button>
                <a href="/" className="btn btn-soft">Annuler</a>
              </div>
            </form>
          </div>

          {/* ===== Newsletter ===== */}
          <div
            className="round-xl p-4 p-md-5 mb-5 d-flex flex-column flex-md-row align-items-center justify-content-between"
            style={{
              background: 'linear-gradient(90deg, #F97316, #F43F5E)',
              color: 'white',
            }}
          >
            <div className="me-md-4 mb-3 mb-md-0">
              <h4 className="fw-bold mb-1">Reste au courant des nouvelles recettes</h4>
              <p className="mb-0 opacity-75">
                Inscris-toi pour recevoir les nouveautés et les recettes les plus vues.
              </p>
            </div>

            {subscribed ? (
              <div className="badge bg-light text-dark p-3">Merci, c’est noté ✅</div>
            ) : (
              <form onSubmit={onSubscribe} className="d-flex w-100" style={{ maxWidth: 520 }}>
                <input
                  type="email"
                  className="form-control me-2"
                  placeholder="Email address"
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
        </div>
      </div>
    </>
  );
}
