// src/onboarding/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Onboarding } from './Onboarding';
import '../sidepanel/sidepanel.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Onboarding />
  </React.StrictMode>
);