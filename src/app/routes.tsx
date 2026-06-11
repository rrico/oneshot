import { createHashRouter } from 'react-router-dom';
import { LandingPage } from '@/features/landing/LandingPage';
import { StudioPage } from '@/features/studio/StudioPage';
import { PlayPage } from '@/features/play/PlayPage';
import { ResultsPage } from '@/features/play/ResultsPage';
import { RouteErrorBoundary } from './RouteErrorBoundary';

export const ROUTES = {
  home: '/',
  create: '/create',
  play: '/play',
  results: '/results',
} as const;

export const router = createHashRouter([
  { path: ROUTES.home, element: <LandingPage />, errorElement: <RouteErrorBoundary /> },
  { path: ROUTES.create, element: <StudioPage />, errorElement: <RouteErrorBoundary /> },
  { path: ROUTES.play, element: <PlayPage />, errorElement: <RouteErrorBoundary /> },
  { path: ROUTES.results, element: <ResultsPage />, errorElement: <RouteErrorBoundary /> },
  { path: '*', element: <LandingPage /> },
]);
