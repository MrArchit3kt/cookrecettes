import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';

/* ---- Restaure le thème au chargement ---- */
(() => {
  try {
    const saved = localStorage.getItem('theme'); // 'light' | 'dark' | null
    const el = document.documentElement;
    if (saved === 'light') {
      el.classList.add('light');
    } else {
      el.classList.remove('light'); // par défaut: dark (notre thème)
    }
  } catch {
    // ignore si localStorage indisponible
  }
})();

/* ---- Render ---- */
const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Élément #root introuvable dans index.html');
}

createRoot(rootEl).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
