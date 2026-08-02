import React from 'react';

interface Props {
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
  onSaveExit: () => void;
  saving: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function OnboardingShell({ progress, canGoBack, onBack, onSaveExit, saving, children, footer }: Props) {
  return (
    <main className="merchant-onboarding">
      <div className="merchant-onboarding__progress" aria-label={`${progress}% complete`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="merchant-onboarding__frame">
        <header className="merchant-onboarding__header">
          <button type="button" onClick={onBack} disabled={!canGoBack} aria-label="Go back">←</button>
          <button type="button" onClick={onSaveExit} disabled={saving}>{saving ? 'Saving…' : 'Save and exit'}</button>
        </header>
        <div className="merchant-onboarding__scroll">{children}</div>
        {footer ? <footer className="merchant-onboarding__footer">{footer}</footer> : null}
      </div>
    </main>
  );
}
