import React from 'react';

/** Suspense fallback while lazy window components load. */
export const ModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center p-3" role="status" aria-live="polite">
    <div className="absolute inset-0 bg-ui-overlay" aria-hidden />
    <div className="relative rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-lg p-8">
      <div
        className="w-8 h-8 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin"
        aria-label="Loading"
      />
    </div>
  </div>
);

export default ModalLoadingFallback;
