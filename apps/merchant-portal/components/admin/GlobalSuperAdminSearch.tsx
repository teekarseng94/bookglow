import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { remoteAccessService } from '../../services/remoteAccessService';
import {
  superAdminPhase1Service,
  type GlobalSearchEntityType,
  type GlobalSearchResult,
} from '../../services/superAdminPhase1Service';
import { Button, StatusBadge } from '../ui';
import { useDialogInteraction } from '../ui/useDialogInteraction';
import { useOutletInspector } from './OutletInspectorContext';

const labels: Record<GlobalSearchEntityType, string> = {
  outlet: 'Outlets',
  user: 'Merchant accounts',
  booking: 'Bookings',
  sale: 'Sales',
  support_case: 'Support cases',
  operation: 'Operations',
  audit: 'Audit events',
};
const groupOrder: GlobalSearchEntityType[] = ['outlet', 'user', 'booking', 'sale', 'support_case', 'operation', 'audit'];

const Highlight: React.FC<{ value: string; query: string }> = ({ value, query }) => {
  const normalized = query.trim();
  if (!normalized) return <>{value}</>;
  const index = value.toLocaleLowerCase().indexOf(normalized.toLocaleLowerCase());
  if (index < 0) return <>{value}</>;
  return <>{value.slice(0, index)}<mark className="rounded bg-[var(--warning-soft)] px-0.5 text-inherit">{value.slice(index, index + normalized.length)}</mark>{value.slice(index + normalized.length)}</>;
};

const GlobalSuperAdminSearch: React.FC = () => {
  const navigate = useNavigate();
  const { openOutletInspector } = useOutletInspector();
  const inputRef = useRef<HTMLInputElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const requestRef = useRef(0);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    const normalized = query.trim();
    const request = ++requestRef.current;
    setResults([]);
    setActiveIndex(-1);
    if (normalized.length < 2) {
      requestRef.current += 1;
      setResults([]);
      setLoading(false);
      setError(null);
      setActiveIndex(-1);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await superAdminPhase1Service.search(normalized, 5);
        if (request !== requestRef.current) return;
        setResults([...rows].sort((a, b) => groupOrder.indexOf(a.type) - groupOrder.indexOf(b.type)));
        setActiveIndex(rows.length ? 0 : -1);
      } catch (value) {
        if (request !== requestRef.current) return;
        setResults([]);
        setError(value instanceof Error ? value.message : 'Search is temporarily unavailable.');
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const groups = useMemo(() => groupOrder.map((type) => ({
    type,
    rows: results.filter((result) => result.type === type),
  })).filter((group) => group.rows.length), [results]);

  const close = () => {
    setResultsOpen(false);
    setMobileOpen(false);
    setActiveIndex(-1);
  };

  useDialogInteraction({ open: mobileOpen, busy: Boolean(openingId), onClose: close, panelRef: mobilePanelRef });

  const openResult = async (result: GlobalSearchResult) => {
    if (openingId) return;
    // Restore to a persistent header control, not a result which is unmounted.
    (mobileOpen ? mobileTriggerRef.current : inputRef.current)?.focus();
    setOpeningId(`${result.type}:${result.id}`);
    setError(null);
    try {
      if (result.type === 'outlet' && result.outletId) {
        openOutletInspector(result.outletId, 'summary');
      } else if (result.type === 'user' && result.outletId) {
        openOutletInspector(result.outletId, 'accounts');
      } else if (result.type === 'support_case') {
        navigate(`/admin/support?case=${encodeURIComponent(result.id)}`);
      } else if (result.type === 'operation') {
        const params = new URLSearchParams({ tab: 'jobs', operation: result.id });
        if (result.outletId) params.set('outlet', result.outletId);
        if (result.timestamp) {
          // The jobs page interprets date inputs in the operator's local zone.
          const date = new Date(result.timestamp);
          const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          params.set('from', day);
          params.set('to', day);
        }
        navigate(`/admin/integrations-jobs?${params.toString()}`);
      } else if (result.type === 'audit') {
        const params = new URLSearchParams({ event: result.id });
        if (result.outletId) params.set('outlet', result.outletId);
        navigate(`/admin/audit?${params.toString()}`);
      } else if ((result.type === 'booking' || result.type === 'sale') && result.outletId) {
        // The server validates and records remote access before any merchant data route opens.
        await remoteAccessService.enter(result.outletId);
        const path = result.type === 'booking' ? '/schedule' : '/transactions';
        window.location.assign(`${path}?record=${encodeURIComponent(result.id)}`);
        return;
      }
      close();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'The selected result could not be opened.');
    } finally {
      setOpeningId(null);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (!resultsOpen || !results.length || openingId) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((value) => (value + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((value) => (value <= 0 ? results.length - 1 : value - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      void openResult(results[activeIndex]);
    }
  };

  const resultsPanel = (idPrefix: string) => (
    <div id={`${idPrefix}-results`} className="max-h-[min(70vh,34rem)] overflow-y-auto rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-lg" role="listbox" aria-label="Global search results">
      {query.trim().length < 2 ? <p className="p-4 text-sm text-[var(--text-muted)]">Enter at least 2 characters. References are matched by prefix.</p> : null}
      {loading ? <p className="p-4 text-sm text-[var(--text-muted)]" role="status">Searching authoritative platform records…</p> : null}
      {!loading && error ? <div className="p-4"><p className="text-sm font-semibold text-[var(--danger)]">Search unavailable</p><p className="mt-1 text-xs text-[var(--text-muted)]">{error}</p></div> : null}
      {!loading && !error && query.trim().length >= 2 && !results.length ? <p className="p-4 text-sm text-[var(--text-muted)]">No matching records were found.</p> : null}
      {!loading && !error ? groups.map((group) => <section key={group.type} aria-labelledby={`${idPrefix}-${group.type}`}><h3 id={`${idPrefix}-${group.type}`} className="sticky top-0 border-y border-[var(--line)] bg-[var(--bg-soft)] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] first:border-t-0">{labels[group.type]}</h3>{group.rows.map((result) => {
        const index = results.indexOf(result);
        const key = `${result.type}:${result.id}`;
        return <button type="button" role="option" aria-selected={activeIndex === index} key={key} disabled={Boolean(openingId)} onMouseEnter={() => setActiveIndex(index)} onClick={() => void openResult(result)} className={`grid w-full gap-1 border-b border-[var(--line)] px-3 py-3 text-left last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] ${activeIndex === index ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--bg-soft)]'}`}><div className="min-w-0"><p className="truncate text-sm font-semibold"><Highlight value={result.title} query={query} /></p><p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]"><Highlight value={result.matchedText} query={query} />{result.outletName ? ` · ${result.outletName}` : ''}</p></div><div className="flex items-center gap-2"><StatusBadge>{result.status || 'Unknown'}</StatusBadge>{result.timestamp ? <span className="hidden text-[10px] text-[var(--text-muted)] sm:inline">{new Date(result.timestamp).toLocaleDateString()}</span> : null}</div></button>;
      })}</section>) : null}
    </div>
  );

  return (
    <div className="relative min-w-0">
      <div className="hidden w-[min(46vw,38rem)] sm:block">
        <label className="relative block">
          <span className="sr-only">Global platform search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
          <input ref={inputRef} type="search" value={query} onFocus={() => setResultsOpen(true)} onChange={(event) => { setQuery(event.target.value); setResultsOpen(true); }} onKeyDown={onKeyDown} placeholder="Search outlets, accounts, bookings, sales…" aria-label="Global platform search" aria-controls="desktop-global-search-results" aria-expanded={resultsOpen} className="h-10 w-full rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] pl-9 pr-9 text-sm outline-none focus:shadow-ui-focus-strong" />
          {query ? <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--text-muted)]" aria-label="Clear global search"><X className="h-4 w-4" /></button> : null}
        </label>
        {resultsOpen ? <div className="absolute right-0 top-full z-50 mt-2 w-full">{resultsPanel('desktop-global-search')}</div> : null}
      </div>

      <div className="sm:hidden">
        <Button size="sm" variant="secondary" aria-label="Open global platform search" onClick={(event) => { mobileTriggerRef.current = event.currentTarget; setMobileOpen(true); setResultsOpen(true); }}><Search className="h-4 w-4" />Search</Button>
        {mobileOpen ? <div ref={mobilePanelRef} role="dialog" aria-modal="true" aria-label="Global platform search" className="fixed inset-x-2 top-2 z-[70] rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] p-2 shadow-ui-lg"><div className="flex gap-2"><label className="relative min-w-0 flex-1"><span className="sr-only">Global platform search</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setResultsOpen(true); }} onKeyDown={onKeyDown} placeholder="Search Bookglow" aria-label="Global platform search" aria-controls="mobile-global-search-results" aria-expanded className="h-10 w-full rounded-ui-md border border-[var(--line)] pl-9 pr-2 text-sm outline-none focus:shadow-ui-focus-strong" /></label><Button size="sm" variant="ghost" aria-label="Close global platform search" onClick={close}><X className="h-4 w-4" /></Button></div><div className="mt-2">{resultsPanel('mobile-global-search')}</div></div> : null}
      </div>
    </div>
  );
};

export default GlobalSuperAdminSearch;
