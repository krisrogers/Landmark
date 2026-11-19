import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/common';
import { VersionBadge } from './components/VersionBadge';
import './styles/index.css';

console.log('[main.tsx] Module loaded');

// The service worker is registered automatically by vite-plugin-pwa (autoUpdate).
// In an installed PWA there's no address bar, so keep it current ourselves:
// - when a new worker takes control, reload once to pick up the new build;
// - poll for updates periodically and whenever the app regains focus.
// (The version badge is also a manual tap-to-refresh.)
if ('serviceWorker' in navigator) {
  // Don't reload on the first worker taking control (fresh install); only when
  // an update replaces a worker that was already controlling the page.
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  navigator.serviceWorker.ready
    .then((reg) => {
      const check = () => reg.update().catch(() => {});
      setInterval(check, 60_000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    })
    .catch(() => {});
}

// Get base path from Vite config (set via VITE_BASE_PATH env var)
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
console.log('[main.tsx] basename:', basename);

console.log('[main.tsx] Rendering React app...');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <ToastProvider>
        <App />
        <VersionBadge />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
