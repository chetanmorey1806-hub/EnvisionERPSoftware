import React from 'react';
import ReactDOM from 'react-dom/client';
// Self-hosted variable font (no external CDN, works offline).
import '@fontsource-variable/plus-jakarta-sans';
import App from './App';
import './index.css';
import { installGlobalCapsLockListener } from './utils/capsLock';

// One capture-phase listener for the whole app. Off unless Settings → Typing
// turns it on, so this costs nothing until someone asks for it.
installGlobalCapsLockListener();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);