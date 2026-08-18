/**
 * main.jsx
 * Entry point. Stylesheets are imported here, in dependency order:
 * tokens -> base -> components -> pages.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import './styles/theme.css';
import './styles/global.css';
import './styles/components.css';
import './styles/pages.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
