import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

console.log('main.tsx loaded');
const container = document.getElementById('root');
console.log('root container:', container);

if (!container) {
  document.body.innerHTML = '<h1 style="color: red; padding: 20px;">ERROR: Root element not found!</h1>';
  throw new Error('Root element not found');
}

try {
  console.log('Creating root...');
  const root = createRoot(container);

  console.log('Rendering app...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Fatal error:', error);
  container.innerHTML = `<div style="padding: 20px; color: red; white-space: pre-wrap; font-family: monospace;">
    <h1>Fatal Error</h1>
    <pre>${error}</pre>
  </div>`;
}
