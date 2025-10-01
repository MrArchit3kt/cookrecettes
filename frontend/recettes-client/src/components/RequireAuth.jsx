import React, { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function RequireAuth({ children }) {
  const { user } = useContext(AuthContext);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!user) {
      nav('/login', { replace: true, state: { from: loc.pathname } });
    }
  }, [user, nav, loc]);

  if (!user) return null; // option: spinner
  return children;
}
