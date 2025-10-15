/**
 * Side Panel Entry Point
 * Day 4: Side Panel UI
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidePanel } from './SidePanel';
import '../styles/globals.css';

// Mount the side panel
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>
);

// Log that side panel has loaded
console.log('✅ Stupify Side Panel loaded');