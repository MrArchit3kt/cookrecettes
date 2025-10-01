import React, { useContext, useMemo, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function NavBar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // --- thème
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains('light'));
  const toggleTheme = () => {
    const el = document.documentElement;
    el.classList.toggle('light');
    const nowLight = el.classList.contains('light');
    setIsLight(nowLight);
    localStorage.setItem('theme', nowLight ? 'light' : 'dark');
  };

  // --- menu compte (custom)
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const onLogout = () => {
    logout();
    setOpen(false);
    navigate('/', { replace: true });
  };

  const initials = useMemo(() => {
    const t = (user?.name || user?.email || 'U').trim();
    return t.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  }, [user]);

  const greeting = useMemo(() => {
    if (!user) return '';
    return `Bonjour, ${user.name || user.email}`;
  }, [user]);

  return (
    <nav
      className="navbar navbar-expand-lg mt-3 mb-4 container nav-compact"
      style={{ position: 'sticky', top: 12, zIndex: 5000 }}     // ↑ passe devant le hero
    >
      <div className="container-fluid gap-2">

        {/* Brand */}
        <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/">
          <span className="brand-dot" />
          <span className="brand-text">
            <span className="text-cyan">Cook</span><span className="text-violet">Recettes</span>
          </span>
        </Link>

        {/* Toggler mobile */}
        <button
          className="navbar-toggler ms-auto"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navMain"
          aria-controls="navMain"
          aria-expanded="false"
          aria-label="Basculer la navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navMain">
          {/* Liens */}
          <ul className="navbar-nav me-2 mb-2 mb-lg-0 align-items-lg-center">
            <li className="nav-item"><NavLink end className="nav-link" to="/">Accueil</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/contact">Contact</NavLink></li>
            {user && <li className="nav-item"><NavLink className="nav-link" to="/favorites">Favoris</NavLink></li>}
          </ul>

          {/* Recherche */}
          <form className="nav-search ms-lg-1 me-lg-2 my-2 my-lg-0" onSubmit={(e)=>e.preventDefault()}>
            <input className="form-control" placeholder="Rechercher..." />
          </form>

          {/* Zone droite : uniquement compte (plus de bouton Ajouter) */}
          <div className="d-flex align-items-center gap-2 ms-lg-2" ref={menuRef}>
            {user ? (
              <div className="position-relative">
                <button
                  type="button"
                  className="btn avatar-btn"
                  title="Mon compte"
                  onClick={() => setOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  aria-controls="accountMenu"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v=>!v); } }}
                >
                  <span className="avatar-circle">{initials}</span>
                </button>

                {open && (
                  <div
                    id="accountMenu"
                    role="menu"
                    className="account-menu shadow-2"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 12px)',
                      minWidth: 240,
                      zIndex: 9999,                      // ↑ au-dessus du hero et des cartes
                      background: 'var(--surface)',
                      border: '1px solid rgba(255,255,255,.12)',
                      borderRadius: 14,
                      overflow: 'hidden'
                    }}
                  >
                    <div className="px-3 pt-3 pb-2 border-bottom">
                      <div className="small text-muted">Connecté</div>
                      <div className="fw-semibold text-truncate" title={greeting}>{greeting}</div>
                    </div>
                    <button className="menu-item" role="menuitem" onClick={toggleTheme}>
                      {isLight ? '🌙 Passer en mode sombre' : '☀️ Passer en mode clair'}
                    </button>
                    <Link className="menu-item" role="menuitem" to="/profile" onClick={()=>setOpen(false)}>
                      👤 Mon profil
                    </Link>
                    <button className="menu-item text-danger" role="menuitem" onClick={onLogout}>
                      ↪︎ Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link className="btn btn-outline-primary btn-pill" to="/login">Connexion</Link>
                <Link className="btn btn-primary btn-pill" to="/register">Inscription</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
