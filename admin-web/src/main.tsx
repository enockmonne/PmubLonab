import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// Determine the basename for React Router based on Vite's BASE_URL.
// When served at /api/admin-ui/, basename = '/api/admin-ui'.
const BASE_URL = import.meta.env.BASE_URL || '/';
const basename = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename || '/'}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1e25',
            color: '#e6edf3',
            border: '1px solid #2d333b',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#3fb950', secondary: '#0b0d10' } },
          error: { iconTheme: { primary: '#f85149', secondary: '#0b0d10' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
