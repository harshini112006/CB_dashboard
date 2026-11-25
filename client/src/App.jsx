import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { fetchSession, logout } from './api.js';
import { FiltersProvider } from './filters-context.jsx';
import Shell from './components/Shell.jsx';
import Login from './components/Login.jsx';
import Overview from './pages/Overview.jsx';
import Menu from './pages/Menu.jsx';
import Outlets from './pages/Outlets.jsx';
import Orders from './pages/Orders.jsx';
import NotFound from './pages/NotFound.jsx';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || ''; } catch { return ''; }
  });
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    try { theme ? localStorage.setItem('theme', theme) : localStorage.removeItem('theme'); } catch { /* ignore */ }
  }, [theme]);
  const dark = theme ? theme === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return [dark, () => setTheme(dark ? 'light' : 'dark')];
}

export default function App() {
  const [session, setSession] = useState(null); // { authEnabled, user, features }
  const [dark, toggleTheme] = useTheme();

  useEffect(() => {
    fetchSession().then(setSession).catch(() => setSession({ authEnabled: false, user: 'anonymous', features: {} }));
  }, []);

  // Any data call that comes back 401 (expired session) returns the user to the login screen.
  useEffect(() => {
    const h = () => setSession((s) => (s ? { ...s, user: null } : s));
    window.addEventListener('cb-unauthorized', h);
    return () => window.removeEventListener('cb-unauthorized', h);
  }, []);

  if (!session) return <div className="app"><div className="skeleton-grid"><div className="sk" /></div></div>;
  if (session.authEnabled && !session.user) {
    return <Login onSuccess={(user) => setSession((s) => ({ ...s, user }))} />;
  }

  return (
    <FiltersProvider>
      <Shell
        session={session} dark={dark} toggleTheme={toggleTheme}
        onSignOut={async () => { await logout().catch(() => {}); setSession((s) => ({ ...s, user: null })); }}
      >
        <Routes>
          <Route path="/" element={<Overview session={session} />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/outlets" element={<Outlets />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/overview" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
    </FiltersProvider>
  );
}
