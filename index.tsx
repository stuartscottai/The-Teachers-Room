import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';

const PRELOAD_RELOAD_KEY = 'vite-preload-reload-at';
const PRELOAD_RELOAD_COOLDOWN_MS = 60_000;

// A deployment can replace lazy-loaded files while somebody still has the old
// app open. Reload once so the browser picks up the new file names.
window.addEventListener('vite:preloadError', (event) => {
  const lastReloadAt = Number(window.sessionStorage.getItem(PRELOAD_RELOAD_KEY));
  const now = Date.now();

  if (!Number.isFinite(lastReloadAt) || now - lastReloadAt > PRELOAD_RELOAD_COOLDOWN_MS) {
    event.preventDefault();
    window.sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(now));
    window.location.reload();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Public builds include crawlable HTML inside #root. The interactive app is
// intentionally rendered fresh so account-dependent screens cannot suffer a
// server/client hydration mismatch.
if (rootElement.hasChildNodes()) {
  rootElement.replaceChildren();
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
