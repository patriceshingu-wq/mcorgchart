import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  const errorDiv = document.createElement('h1');
  errorDiv.style.cssText = 'color: red; padding: 20px;';
  errorDiv.textContent = 'ERROR: Root element not found!';
  document.body.appendChild(errorDiv);
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
