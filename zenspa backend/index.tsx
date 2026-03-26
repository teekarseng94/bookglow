import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-load app (auth + Firebase + routes). Entry stays tiny so build does not OOM.
const AppBootstrap = React.lazy(() => import('./AppBootstrap'));

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Critical Error: Could not find root element in index.html");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <React.Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="inline-block w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <AppBootstrap />
          </React.Suspense>
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error("Mounting Error:", error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 20px; text-align: center;">
        <h1 style="color: #dc2626; margin-bottom: 16px;">Application Error</h1>
        <p style="color: #64748b; margin-bottom: 24px;">${error instanceof Error ? error.message : String(error)}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #0d9488; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}
