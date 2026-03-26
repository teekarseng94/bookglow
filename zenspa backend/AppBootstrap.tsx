/**
 * Auth + UserContext + RootRoutes. Lazy-loaded from index so the entry
 * does not pull in Firebase (avoids OOM during build).
 */
import React from 'react';
import { UserContextProvider } from './contexts/UserContext';
import { onAuthStateChange } from './services/authService';

const RootRoutes = React.lazy(() => import('./RootRoutes'));

const AppBootstrap: React.FC = () => {
  const [firebaseUser, setFirebaseUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setFirebaseUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <UserContextProvider firebaseUser={firebaseUser}>
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="inline-block w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <RootRoutes />
      </React.Suspense>
    </UserContextProvider>
  );
};

export default AppBootstrap;
