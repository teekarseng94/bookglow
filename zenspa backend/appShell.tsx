/**
 * App shell: BrowserRouter + ErrorBoundary + AppBootstrap.
 * Clean URLs (e.g. /book/outlet_002). Hosting must rewrite all routes to index.html.
 */
import './index.css';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="inline-block w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function AppShell() {
  const [AppBootstrap, setAppBootstrap] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    import('./AppBootstrap').then((m) => setAppBootstrap(() => m.default));
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {AppBootstrap ? React.createElement(AppBootstrap) : <LoadingSpinner />}
      </BrowserRouter>
    </ErrorBoundary>
  );
}
