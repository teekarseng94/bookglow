import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import OutletInspector from './OutletInspector';

export type OutletInspectorTab =
  | 'summary'
  | 'onboarding'
  | 'accounts'
  | 'billing'
  | 'integrations'
  | 'support'
  | 'audit';

const tabs = new Set<OutletInspectorTab>([
  'summary', 'onboarding', 'accounts', 'billing', 'integrations', 'support', 'audit',
]);

interface OutletInspectorContextValue {
  openOutletInspector: (outletId: string, tab?: OutletInspectorTab) => void;
  closeOutletInspector: () => void;
  selectedOutletId: string | null;
  selectedTab: OutletInspectorTab;
}

const OutletInspectorContext = createContext<OutletInspectorContextValue | null>(null);

export const OutletInspectorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [params, setParams] = useSearchParams();
  const selectedOutletId = params.get('inspectOutlet');
  const tabParam = params.get('inspectTab') as OutletInspectorTab | null;
  const selectedTab = tabParam && tabs.has(tabParam) ? tabParam : 'summary';

  const value = useMemo<OutletInspectorContextValue>(() => ({
    selectedOutletId,
    selectedTab,
    openOutletInspector: (outletId, tab = 'summary') => {
      const next = new URLSearchParams(params);
      next.set('inspectOutlet', outletId);
      next.set('inspectTab', tab);
      setParams(next);
    },
    closeOutletInspector: () => {
      const next = new URLSearchParams(params);
      next.delete('inspectOutlet');
      next.delete('inspectTab');
      setParams(next, { replace: true });
    },
  }), [params, selectedOutletId, selectedTab, setParams]);

  const selectTab = (tab: OutletInspectorTab) => {
    const next = new URLSearchParams(params);
    next.set('inspectTab', tab);
    setParams(next, { replace: true });
  };

  return (
    <OutletInspectorContext.Provider value={value}>
      {children}
      <OutletInspector
        outletId={selectedOutletId}
        open={Boolean(selectedOutletId)}
        selectedTab={selectedTab}
        onSelectTab={selectTab}
        onClose={value.closeOutletInspector}
      />
    </OutletInspectorContext.Provider>
  );
};

export const useOutletInspector = (): OutletInspectorContextValue => {
  const value = useContext(OutletInspectorContext);
  if (!value) throw new Error('useOutletInspector must be used inside OutletInspectorProvider.');
  return value;
};

