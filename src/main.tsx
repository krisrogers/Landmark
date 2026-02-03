import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/common';
import './styles/index.css';

// Get base path from Vite config (set via VITE_BASE_PATH env var)
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

// Clean up service workers from other scopes to prevent cache conflicts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      // Unregister service workers that don't match current base path
      if (registration.scope && !registration.scope.endsWith(import.meta.env.BASE_URL)) {
        registration.unregister();
      }
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
