import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';

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
    <div className="row justify-content-center">
      <div className="col-sm-10 col-md-7 col-lg-5">
        <div className="card p-4 round-xl shadow-1">
          <h3 className="mb-3">Créer un compte</h3>
          <p className="text-muted mb-3">Rejoignez la communauté et partagez vos recettes.</p>
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
                >
                  {showPwd ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <div className="form-text text-muted">8 caractères minimum recommandés.</div>
            </div>

            <button className="btn btn-primary w-100 mt-2" disabled={loading}>
              {loading ? 'Création…' : 'S’inscrire'}
            </button>
          </form>

          <hr className="my-4" />
          <p className="mb-0">
            Déjà un compte ? <Link to="/login" className="link-primary">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
