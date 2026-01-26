import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';
import { Helmet } from 'react-helmet-async';

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Veuillez renseigner votre email et votre mot de passe.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email, password });
      login(res.data);
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.error || 'Identifiants invalides.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* SEO / Helmet */}
      <Helmet>
        <title>Connexion | CookRecettes</title>
        <meta
          name="description"
          content="Connectez-vous à CookRecettes pour retrouver votre carnet de cuisine, vos recettes favorites, vos commentaires et votre profil utilisateur."
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href="https://www.cookrecettes.fr/connexion" />
      </Helmet>

      {/* Wrapper centré (identique à Register) */}
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
                🔐 Connexion CookRecettes
              </span>
            </div>

            <h2 className="mb-3 text-center">Pourquoi se connecter à son compte&nbsp;?</h2>

            <p className="text-muted mb-3 text-center">
              Se connecter ne sert pas seulement à “accéder au site”. Cela permet de retrouver
              tout ton univers CookRecettes et de ne rien perdre de ce que tu as déjà fait.
            </p>

            <div className="row mt-4 g-3">
              <div className="col-md-6">
                <ul className="mb-3 text-muted">
                  <li className="mb-2">
                    <strong>Carnet de recettes sauvegardé :</strong> toutes les recettes que tu as
                    créées ou testées restent associées à ton compte, même si tu changes
                    d’ordinateur ou de navigateur.
                  </li>
                  <li className="mb-2">
                    <strong>Favoris synchronisés :</strong> les recettes que tu ajoutes en ❤️
                    sont automatiquement regroupées dans la page <em>Mes favoris</em>.
                  </li>
                  <li className="mb-2">
                    <strong>Commentaires &amp; notes :</strong> garde une trace de ce que tu as
                    pensé des recettes grâce à tes avis et à la notation sur 5★.
                  </li>
                </ul>
              </div>

              <div className="col-md-6">
                <ul className="mb-3 text-muted">
                  <li className="mb-2">
                    <strong>Profil unique :</strong> un seul compte pour gérer ton profil,
                    tes recettes, tes favoris et ton inscription à la newsletter ciblée.
                  </li>
                  <li className="mb-2">
                    <strong>Expérience continue :</strong> même si tu te déconnectes, tu peux
                    reprendre exactement là où tu t’es arrêté en te reconnectant.
                  </li>
                  <li className="mb-2">
                    <strong>Projet collaboratif :</strong> CookRecettes devient un carnet
                    de cuisine personnel et collaboratif, pas juste un site de recettes.
                  </li>
                </ul>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 justify-content-center mt-2">
              <span className="badge bg-light text-dark border">📒 Carnet sauvegardé</span>
              <span className="badge bg-light text-dark border">❤️ Favoris synchronisés</span>
              <span className="badge bg-light text-dark border">👤 Profil personnalisé</span>
            </div>
          </div>

          {/* ===== Carte formulaire (en dessous, même style que Register) ===== */}
          <div className="card p-4 round-xl shadow-1 mb-5">
            <h3 className="mb-3">Se connecter</h3>
            <p className="text-muted mb-3">
              Accédez à votre compte pour gérer vos recettes, vos favoris et votre profil.
            </p>

            {error && (
              <div className="alert alert-danger py-2">{error}</div>
            )}

            <form onSubmit={onSubmit} noValidate>
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
                    autoComplete="current-password"
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
              </div>

              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="remember" />
                  <label className="form-check-label text-muted" htmlFor="remember">
                    Se souvenir de moi
                  </label>
                </div>
                <Link to="#" className="link-primary small">Mot de passe oublié ?</Link>
              </div>

              <button className="btn btn-primary w-100" disabled={loading}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>

            <hr className="my-4" />

            <p className="mb-0">
              Pas de compte ?{' '}
              <Link to="/inscription" className="link-primary">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
