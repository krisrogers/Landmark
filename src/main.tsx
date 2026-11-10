import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/common';
import { VersionBadge } from './components/VersionBadge';
import './styles/index.css';

console.log('[main.tsx] Module loaded');

// No service worker for the alpha: the PWA is built in self-destroying mode so
// any previously installed worker is unregistered and its caches cleared. We do
// NOT register a worker here — the app behaves like a plain site (a normal
// refresh fetches the latest), avoiding stale-cache headaches while iterating.

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
