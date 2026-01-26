import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';

export default function Profile() {
  const { user } = useContext(AuthContext);

  // données serveur
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  // édition profil
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // sécurité
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  // préférences
  const [newsletter, setNewsletter] = useState(false);
  const [prefMsg, setPrefMsg] = useState('');

  // onglets
  const [tab, setTab] = useState('overview'); // overview | profile | security | prefs

  const initials = useMemo(() => {
    const t = (me?.name || me?.email || 'U').trim();
    return t.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
  }, [me]);

  useEffect(() => {
    (async () => {
      try {
        // adapte si ton backend expose /users/me (ou /auth/me)
        const res = await api.get('/users/me');
        const data = res.data.user || res.data || {};
        setMe(data);
        setName(data.name || '');
        setAvatarUrl(data.avatar_url || '');
        setNewsletter(!!data.newsletter);
      } catch (e) {
        // fallback sur le contexte si l’endpoint n’existe pas
        if (user) {
          setMe({ id: user.id, email: user.email, name: user.name });
          setName(user.name || '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function uploadAvatar() {
    if (!avatarFile) return;
    const fd = new FormData();
    fd.append('file', avatarFile);
    const up = await api.post('/images/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setAvatarUrl(up.data.url);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/users/me', {
        name: name || null,
        avatar_url: avatarUrl || null,
      });
      const updated = res.data.user || res.data;
      setMe(prev => ({ ...prev, name, avatar_url: avatarUrl }));
      alert('Profil mis à jour ✅');
    } catch (err) {
      alert(err.response?.data?.error || 'Impossible de mettre à jour le profil.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (!oldPwd || !newPwd || !newPwd2) return alert('Tous les champs sont requis.');
    if (newPwd !== newPwd2) return alert('Les deux mots de passe ne correspondent pas.');
    setSavingPwd(true);
    try {
      await api.post('/auth/change-password', {
        old_password: oldPwd,
        new_password: newPwd,
      });
      setOldPwd('');
      setNewPwd('');
      setNewPwd2('');
      alert('Mot de passe changé ✅');
    } catch (err) {
      alert(err.response?.data?.error || 'Échec du changement de mot de passe.');
    } finally {
      setSavingPwd(false);
    }
  }

  async function toggleNewsletter(val) {
    setPrefMsg('');
    setNewsletter(val);
    try {
      if (val) await api.post('/newsletter/subscribe', { email: me.email });
      else await api.post('/newsletter/unsubscribe', { email: me.email });
      setPrefMsg(val ? 'Abonné à la newsletter 🎉' : 'Désabonné de la newsletter.');
    } catch (err) {
      setPrefMsg(
        err.response?.data?.error || 'Action newsletter impossible pour le moment.'
      );
      setNewsletter(!val); // revert
    }
  }

  async function deleteAccount() {
    const c = prompt("Pour confirmer, tape 'SUPPRIMER' (en majuscules).");
    if (c !== 'SUPPRIMER') return;
    try {
      await api.delete('/users/me');
      alert('Compte supprimé.');
      window.location.href = '/';
    } catch (err) {
      alert(err.response?.data?.error || 'Suppression impossible pour le moment.');
    }
  }

  if (loading) {
    return (
      <>
        {/* SEO minimal pendant le chargement */}
        <Helmet>
          <title>Profil | CookRecettes</title>
        </Helmet>
        <div className="card p-4 round-xl">
          <div
            className="skeleton"
            style={{ height: 24, width: 180, marginBottom: 8 }}
          />
          <div className="skeleton" style={{ height: 14, width: 280 }} />
        </div>
      </>
    );
  }

  return (
    <>
      {/* ===== SEO / Helmet ===== */}
      <Helmet>
        <title>Mon profil | CookRecettes</title>
        <meta
          name="description"
          content="Gérez votre profil CookRecettes : nom, avatar, sécurité du compte, préférences de newsletter et aperçu de vos recettes créées et favoris."
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href="https://www.cookrecettes.fr/profil" />
      </Helmet>

      {/* HERO */}
      <section className="hero card p-4 p-md-5 round-xl mb-4 d-flex flex-column flex-lg-row align-items-center gap-4">
        <div className="d-flex align-items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="avatar-xl" />
          ) : (
            <div className="avatar-xl avatar-fallback">{initials}</div>
          )}
          <div>
            <div className="text-muted small">Profil</div>
            <h2 className="m-0">{me?.name || 'Utilisateur'}</h2>
            <div className="text-muted">{me?.email}</div>
          </div>
        </div>
        <div className="ms-auto d-none d-lg-block">
          {/* URLs FR */}
          <Link to="/mes-favoris" className="btn btn-soft me-2">
            ⭐ Mes favoris
          </Link>
          <Link to="/ajouter-une-recette" className="btn btn-primary">
            + Ajouter une recette
          </Link>
        </div>
      </section>

      {/* Onglets */}
      <div className="card p-3 round-xl mb-3">
        <ul className="nav nav-pills gap-2">
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'overview' ? 'active' : ''}`}
              onClick={() => setTab('overview')}
            >
              Aperçu
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'profile' ? 'active' : ''}`}
              onClick={() => setTab('profile')}
            >
              Profil
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'security' ? 'active' : ''}`}
              onClick={() => setTab('security')}
            >
              Sécurité
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${tab === 'prefs' ? 'active' : ''}`}
              onClick={() => setTab('prefs')}
            >
              Préférences
            </button>
          </li>
        </ul>
      </div>

      {/* Contenu des onglets */}
      {tab === 'overview' && (
        <div className="row g-3">
          <div className="col-lg-4">
            <div className="card p-3 round-xl h-100">
              <div className="form-section-title">Statistiques</div>
              <div className="text-muted small">
                Un petit aperçu de ton activité.
              </div>
              <div className="form-divider" />
              <div className="d-flex justify-content-between">
                <span>Recettes créées</span>
                <strong>{me?.recipes_count ?? '—'}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span>Favoris</span>
                <strong>{me?.favorites_count ?? '—'}</strong>
              </div>
              <div className="mt-3">
                <Link
                  to="/mes-favoris"
                  className="btn btn-outline-primary w-100"
                >
                  Voir mes favoris
                </Link>
              </div>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="card p-3 round-xl h-100">
              <div className="form-section-title">Dernières actions</div>
              <div className="text-muted">
                Cette section peut afficher tes dernières recettes, commentaires,
                etc.
              </div>
              <div className="form-divider" />
              <div className="text-muted small">
                À implémenter selon ce que tu veux suivre ✨
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <form className="card p-3 round-xl" onSubmit={saveProfile}>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="form-section-title">Avatar</div>
              <div className="d-flex flex-column align-items-start gap-2">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="avatar-xl" />
                ) : (
                  <div className="avatar-xl avatar-fallback">{initials}</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={e =>
                    setAvatarFile(e.target.files?.[0] || null)
                  }
                />
                <button
                  type="button"
                  className="btn btn-soft"
                  disabled={!avatarFile}
                  onClick={uploadAvatar}
                >
                  Téléverser l’avatar
                </button>
              </div>
            </div>
            <div className="col-md-8">
              <div className="form-section-title">Informations</div>
              <div className="mb-2">
                <label className="form-label">Nom complet</label>
                <input
                  className="form-control"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  value={me?.email || ''}
                  disabled
                />
              </div>
              <button className="btn btn-primary" disabled={savingProfile}>
                {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      )}

      {tab === 'security' && (
        <form className="card p-3 round-xl" onSubmit={changePassword}>
          <div className="form-section-title">Changer le mot de passe</div>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Mot de passe actuel</label>
              <input
                className="form-control"
                type="password"
                value={oldPwd}
                onChange={e => setOldPwd(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Nouveau mot de passe</label>
              <input
                className="form-control"
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Confirmer</label>
              <input
                className="form-control"
                type="password"
                value={newPwd2}
                onChange={e => setNewPwd2(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3">
            <button className="btn btn-primary" disabled={savingPwd}>
              {savingPwd ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
            </button>
          </div>

          <div className="form-divider" />
          <div className="form-section-title text-danger">Zone dangereuse</div>
          <p className="text-muted small m-0">
            Supprimer définitivement ton compte (action irréversible).
          </p>
          <button
            type="button"
            className="btn btn-outline-danger mt-2"
            onClick={deleteAccount}
          >
            Supprimer mon compte
          </button>
        </form>
      )}

      {tab === 'prefs' && (
        <div className="card p-3 round-xl">
          <div className="form-section-title">Préférences</div>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="d-flex align-items-center justify-content-between form-panel p-2">
                <div>
                  <div className="fw-semibold">Thème</div>
                  <div className="text-muted small">
                    Choisis clair ou sombre pour l’interface.
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex align-items-center justify-content-between form-panel p-2">
                <div>
                  <div className="fw-semibold">Newsletter</div>
                  <div className="text-muted small">
                    Recevoir les nouvelles recettes & les plus vues.
                  </div>
                </div>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={newsletter}
                    onChange={e => toggleNewsletter(e.target.checked)}
                  />
                </div>
              </div>
              {prefMsg && <div className="mt-2 small">{prefMsg}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Petit switch thème réutilisable */
function ThemeToggle() {
  const [isLight, setIsLight] = useState(() =>
    document.documentElement.classList.contains('light')
  );

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.classList.toggle('light', saved === 'light');
      setIsLight(saved === 'light');
    }
  }, []);

  const toggle = () => {
    const el = document.documentElement;
    el.classList.toggle('light');
    const nowLight = el.classList.contains('light');
    setIsLight(nowLight);
    localStorage.setItem('theme', nowLight ? 'light' : 'dark');
  };

  return (
    <button type="button" className="btn btn-soft" onClick={toggle}>
      {isLight ? '🌙 Sombre' : '☀️ Clair'}
    </button>
  );
}
