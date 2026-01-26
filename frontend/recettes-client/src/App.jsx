// App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';

import NavBar from './components/NavBar';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import CreateRecipe from './pages/CreateRecipe';
import Favorites from './pages/Favorites';
import EditRecipe from './pages/EditRecipe';
import Contact from './pages/Contact';
import Profile from './pages/Profile';
import Recettes from './pages/Recettes';

import { AuthProvider } from './contexts/AuthContext';
import RequireAuth from './components/RequireAuth';

function App() {
  return (
    <AuthProvider>
      <header>
        <NavBar />
      </header>

      <main
        id="main"
        className="container mt-4"
        role="main"
        aria-label="Contenu principal de CookRecettes"
      >
        <Routes>
          {/* ========= ACCUEIL ========= */}
          <Route path="/" element={<Home />} />

          {/* ========= LISTE TOUTES LES RECETTES ========= */}
          <Route path="/recettes" element={<Recettes />} />

          {/* ========= EDITION (doit être avant le détail) ========= */}
          <Route
            path="/recettes/:id/modifier"
            element={
              <RequireAuth>
                <EditRecipe />
              </RequireAuth>
            }
          />
          {/* Ancienne URL : /recipes/:id/edit */}
          <Route
            path="/recipes/:id/edit"
            element={
              <RequireAuth>
                <EditRecipe />
              </RequireAuth>
            }
          />

          {/* ========= DÉTAIL RECETTE (SEO + fallback) ========= */}
          {/* ✅ Une seule route robuste :
              - /recettes/191
              - /recettes/crepes-au-sucre-191
              - /recettes/paella-610
           */}
          <Route path="/recettes/:slug" element={<RecipeDetail />} />

          {/* Ancienne URL anglaise */}
          <Route path="/recipes/:id" element={<RecipeDetail />} />

          {/* ========= AUTH ========= */}
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ========= CRÉATION ========= */}
          <Route
            path="/ajouter-une-recette"
            element={
              <RequireAuth>
                <CreateRecipe />
              </RequireAuth>
            }
          />
          <Route
            path="/create"
            element={
              <RequireAuth>
                <CreateRecipe />
              </RequireAuth>
            }
          />

          {/* ========= FAVORIS ========= */}
          <Route
            path="/mes-favoris"
            element={
              <RequireAuth>
                <Favorites />
              </RequireAuth>
            }
          />
          <Route
            path="/favorites"
            element={
              <RequireAuth>
                <Favorites />
              </RequireAuth>
            }
          />

          {/* ========= PAGES ========= */}
          <Route path="/contact" element={<Contact />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/profile" element={<Profile />} />

          {/* ========= 404 ========= */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}

export default App;
