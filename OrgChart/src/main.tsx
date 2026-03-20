import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  document.body.innerHTML = '<h1 style="color: red; padding: 20px;">ERROR: Root element not found!</h1>';
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
