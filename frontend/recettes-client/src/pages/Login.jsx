import React, { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';

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
    <div className="row justify-content-center">
      <div className="col-sm-10 col-md-7 col-lg-5">
        <div className="card p-4 round-xl shadow-1">
          <h3 className="mb-3">Connexion</h3>
          <p className="text-muted mb-3">
            Accédez à votre compte pour créer, modifier et enregistrer vos recettes favorites.
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
            <Link to="/register" className="link-primary">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
