import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/routes';
import './index.css';

// Redirect old GitHub Pages hash links (#/play?d=... → /play?d=...)
const hash = window.location.hash;
if (hash.startsWith('#/')) {
  window.location.replace(hash.slice(1));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
