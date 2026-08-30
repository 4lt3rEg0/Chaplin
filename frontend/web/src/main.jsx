import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/mobilePreview.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);

// Service worker registration (production builds only — Vite doesn't emit
// the virtual module content in dev, and we never want a SW intercepting
// requests during local development anyway).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    // No onNeedRefresh handler on purpose: a new service worker installs and
    // waits rather than forcing a reload, so it never interrupts playback
    // mid-session (CHAPLIN MOBILE ALPHA, Prioridad 21). It takes over the
    // next time the app is fully closed and reopened.
    registerSW({ immediate: true });
  });
}
