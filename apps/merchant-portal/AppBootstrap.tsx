/**
 * Auth + UserContext + RootRoutes. Lazy-loaded from index so the entry
 * does not pull in Firebase (avoids OOM during build).
 */
import React from "react";
import { UserContextProvider } from "./contexts/UserContext";
import { onAuthStateChange, type PortalAuthUser } from "./services/authService";
import { installQueryMetricsGlobal } from "./services/queryTelemetry";
import { ANDROID_APP_VERSION } from "./src/native/appVersion";

const RootRoutes = React.lazy(() => import("./RootRoutes"));

const AppBootstrap: React.FC = () => {
  const [authUser, setAuthUser] = React.useState<PortalAuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    installQueryMetricsGlobal();
  }, []);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setAuthUser(user);
      setLoading(false);
    });
    const timeout = window.setTimeout(() => {
      setLoading(false);
    }, 400);
    return () => {
      unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-[var(--text-secondary)]">Initializing...</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{ANDROID_APP_VERSION}</p>
        </div>
      </div>
    );
  }

  return (
    <UserContextProvider firebaseUser={authUser}>
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)]">
            <div className="inline-block w-12 h-12 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <RootRoutes />
      </React.Suspense>
    </UserContextProvider>
  );
};

export default AppBootstrap;
