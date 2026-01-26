import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';

export default function Register() {
  const { login } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Veuillez renseigner nom, email et mot de passe.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/auth/register', { name, email, password });
      login(res.data);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Erreur lors de l’inscription.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* SEO / Helmet */}
      <Helmet>
        <title>Inscription | CookRecettes</title>
        <meta
          name="description"
          content="Inscrivez-vous sur CookRecettes pour créer votre carnet de cuisine personnel, enregistrer vos recettes favorites et partager vos créations avec la communauté."
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href="https://www.cookrecettes.fr/inscription" />
      </Helmet>

      {/* Wrapper centré */}
      <div className="d-flex justify-content-center">
        <div className="w-100" style={{ maxWidth: '960px' }}>
          {/* ===== Carte explication (en haut, large) ===== */}
          <div
            className="card p-4 p-md-5 round-xl shadow-1 mb-4"
            style={{
              background:
                'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(147,51,234,0.14))',
              border: '1px solid rgba(148,163,184,0.35)',
            }}
          >
            <div className="mb-3 d-flex justify-content-center">
              <span
                className="badge"
                style={{
                  backgroundColor: '#fff',
                  paddingInline: '1.25rem',
                  paddingBlock: '0.35rem',
                  borderRadius: 9999,
                  boxShadow: '0 4px 14px rgba(15,23,42,0.12)',
                  fontWeight: 600,
                }}
              >
                🌟 Communauté CookRecettes
              </span>
            </div>

            <h2 className="mb-3 text-center">Pourquoi s’inscrire sur CookRecettes&nbsp;?</h2>

            <p className="text-muted mb-3 text-center">
              L’objectif de CookRecettes n’est pas seulement d’afficher des recettes,
              mais de t’aider à construire ton propre carnet de cuisine intelligent.
            </p>

            <div className="row mt-4 g-3">
              <div className="col-md-6">
                <ul className="mb-3 text-muted">
                  <li className="mb-2">
                    <strong>Carnet de recettes personnel :</strong> retrouve en un clic
                    toutes les recettes que tu as créées ou testées.
                  </li>
                  <li className="mb-2">
                    <strong>Favoris organisés :</strong> like les recettes que tu aimes,
                    elles sont automatiquement regroupées dans ta page <em>Favoris</em>.
                  </li>
                  <li className="mb-2">
                    <strong>Notes & avis :</strong> garde une trace de ce que tu as pensé
                    d’une recette grâce aux commentaires et à la notation sur 5★.
                  </li>
                </ul>
              </div>

              <div className="col-md-6">
                <ul className="mb-3 text-muted">
                  <li className="mb-2">
                    <strong>Newsletter ciblée :</strong> reçois uniquement les nouvelles
                    recettes et les plus consultées, pas du spam généraliste.
                  </li>
                  <li className="mb-2">
                    <strong>Expérience fluide :</strong> un seul compte pour créer,
                    modifier, supprimer tes recettes et gérer ton profil utilisateur.
                  </li>
                  <li className="mb-2">
                    <strong>Projet collaboratif :</strong> CookRecettes se rapproche
                    d’un carnet de cuisine collaboratif plus vivant qu’un simple site
                    de recettes statique.
                  </li>
                </ul>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 justify-content-center mt-2">
              <span className="badge bg-light text-dark border">📒 Carnet personnel</span>
              <span className="badge bg-light text-dark border">⭐ Favoris & avis</span>
              <span className="badge bg-light text-dark border">👨‍🍳 Partage de recettes</span>
            </div>
          </div>

          {/* ===== Carte formulaire (en dessous) ===== */}
          <div className="card p-4 round-xl shadow-1 mb-5">
            <h3 className="mb-3">Créer un compte</h3>
            <p className="text-muted mb-3">
              Rejoignez la communauté et commencez à construire votre carnet de recettes.
            </p>

            {error && <div className="alert alert-danger py-2">{error}</div>}

            <form onSubmit={onSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label text-muted">Nom</label>
                <input
                  className="form-control"
                  placeholder="Votre nom"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-muted">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="vous@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="mb-2">
                <label className="form-label text-muted">Mot de passe</label>
                <div className="input-group">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => setShowPwd(v => !v)}
                    aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPwd ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                <div className="form-text text-muted">
                  8 caractères minimum recommandés.
                </div>
              </div>

              <button className="btn btn-primary w-100 mt-3" disabled={loading}>
                {loading ? 'Création…' : 'S’inscrire'}
              </button>
            </form>

            <hr className="my-4" />
            <p className="mb-0">
              Déjà un compte ?{' '}
              <Link to="/connexion" className="link-primary">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
