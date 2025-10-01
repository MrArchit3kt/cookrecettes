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

import { AuthProvider } from './contexts/AuthContext';
import RequireAuth from './components/RequireAuth';

function App() {
  return (
    <AuthProvider>
      <NavBar />
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route
            path="/recipes/:id/edit"
            element={
              <RequireAuth>
                <EditRecipe />
              </RequireAuth>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/create"
            element={
              <RequireAuth>
                <CreateRecipe />
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

          <Route path="/contact" element={<Contact />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
