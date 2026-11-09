import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ToastProvider } from './components/common';
import './styles/index.css';

console.log('[main.tsx] Module loaded');

// Auto-update the service worker: when a new version is deployed, apply it and
// reload so the open tab isn't stuck on a stale cached bundle.
registerSW({ immediate: true });

// Get base path from Vite config (set via VITE_BASE_PATH env var)
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
console.log('[main.tsx] basename:', basename);

console.log('[main.tsx] Rendering React app...');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
