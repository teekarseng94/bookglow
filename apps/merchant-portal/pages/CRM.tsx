
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, Transaction, TransactionType, Service, Reward } from '../types';
import { Icons, COLORS } from '../constants';
import { getCurrentOutletID } from '../services/databaseService';
import {
  MemberFilterSheet,
  MemberPageHeader,
  MemberRow,
  MemberToolbar,
} from '../components/members';
<<<<<<< HEAD
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
=======
import {
  AppModal,
  Button,
  ConfirmationDialog,
  EmptyState,
  Field,
  fieldControlClassName,
  FormSection,
  IconButton,
  ModalFooterActions,
} from '../components/ui';
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

type SortFilter = 'Recent' | 'New' | 'Birthday' | 'Name';

interface CRMProps {
  clients: Client[];
  onAddClient: (
    client: Omit<Client, 'id' | 'points' | 'outletID'> & { points?: number; outletID?: string }
  ) => Promise<void | string | undefined>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<void>;
  onUndoImport?: (sessionId: string) => Promise<number>;
  onDeleteAllClients?: () => Promise<number>;
  transactions: Transaction[];
  onUpdatePoints: (clientId: string, change: number) => void | Promise<void>;
  onAddTransaction: (txn: Transaction) => Promise<void | string | undefined>;
  services: Service[];
  rewards: Reward[];
  onUpdateRewards: (rewards: Reward[]) => void | Promise<void>;
  isExportLocked?: boolean;
}

type MemberFieldKey =
  | 'mobile'
  | 'name'
  | 'birthday'
  | 'gender'
  | 'ic'
  | 'marital'
  | 'tag'
  | 'source'
  | 'email'
  | 'ethnic'
  | 'memberTier';

interface MemberFormSettingsState {
  fields: Record<MemberFieldKey, boolean>;
  presetGender: 'Male' | 'Female';
}

const DEFAULT_MEMBER_FORM_SETTINGS: MemberFormSettingsState = {
  fields: {
    mobile: true,
    name: true,
    birthday: true,
    gender: true,
    ic: false,
    marital: false,
    tag: false,
    source: false,
    email: false,
    ethnic: false,
    memberTier: false,
  },
  presetGender: 'Female',
};

const MEMBER_FORM_SETTINGS_STORAGE_KEY = 'zenflow_memberFormSettings';

const CRM: React.FC<CRMProps> = ({
  clients,
  onAddClient,
  onUpdateClient,
  onUndoImport,
  onDeleteAllClients,
  transactions,
  onUpdatePoints,
  onAddTransaction,
  services,
  rewards,
  onUpdateRewards,
  isExportLocked
}) => {
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showEditPointsModal, setShowEditPointsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingReward, setIsSavingReward] = useState(false);
  const [search, setSearch] = useState('');
  const [sortFilter, setSortFilter] = useState<SortFilter>('Recent');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rewardsSectionRef = useRef<HTMLDivElement>(null);

  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    createdAt: '',
    birthday: '',
    gender: '',
    source: '',
    ic: '',
    marital: '',
    tag: '',
    ethnic: '',
    memberTier: '',
  });
  const [editClientData, setEditClientData] = useState({ name: '', email: '', phone: '', notes: '' });
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardFormData, setRewardFormData] = useState<Partial<Reward>>({ name: '', cost: 0, icon: '🎁' });
  const [editingPointsValue, setEditingPointsValue] = useState<number>(0);
  const [showMemberFormSettings, setShowMemberFormSettings] = useState(false);
  const [memberFormSettings, setMemberFormSettings] = useState<MemberFormSettingsState>(DEFAULT_MEMBER_FORM_SETTINGS);
  const [lastImportToast, setLastImportToast] = useState<{ sessionId: string; count: number } | null>(null);
  const [undoImportInProgress, setUndoImportInProgress] = useState(false);
  const [deleteAllInProgress, setDeleteAllInProgress] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false); // mobile-only secondary actions sheet

  // Load member form settings from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MEMBER_FORM_SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MemberFormSettingsState;
        // Ensure mobile and name are always enabled
        parsed.fields.mobile = true;
        parsed.fields.name = true;
        setMemberFormSettings(parsed);
      }
    } catch {
      // Ignore parse errors and fall back to defaults
    }
  }, []);

  // Persist settings whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem(MEMBER_FORM_SETTINGS_STORAGE_KEY, JSON.stringify(memberFormSettings));
    } catch {
      // Ignore storage errors (e.g. private mode)
    }
  }, [memberFormSettings]);

  const filteredClients = useMemo(() => 
    clients.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search))
    ), [clients, search]);

  // Normalize phone for duplicate check (digits only)
  const normalizePhoneForCompare = (phone: string) =>
    (phone || '').replace(/\D/g, '');

  // Duplicate checks for new member form: name and phone must be unique
  const newClientNameDuplicate = useMemo(() => {
    const name = newClient.name.trim();
    if (!name) return false;
    const lower = name.toLowerCase();
    return clients.some((c) => c.name.trim().toLowerCase() === lower);
  }, [clients, newClient.name]);

  const newClientPhoneDuplicate = useMemo(() => {
    const phone = normalizePhoneForCompare(newClient.phone);
    if (!phone) return false;
    return clients.some((c) => normalizePhoneForCompare(c.phone) === phone);
  }, [clients, newClient.phone]);

  const newClientHasDuplicate = newClientNameDuplicate || newClientPhoneDuplicate;

  // Latest sale per client for card display
  const clientLatestSale = useMemo(() => {
    const map: Record<string, { type: string; date: string; amount?: number }> = {};
    transactions
      .filter(t => t.clientId && t.type === TransactionType.SALE)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(t => {
        if (t.clientId && !map[t.clientId]) {
          map[t.clientId] = { type: 'Sales', date: t.date, amount: t.amount };
        }
      });
    return map;
  }, [transactions]);

  const sortedClients = useMemo(() => {
    const list = [...filteredClients];
    if (sortFilter === 'Recent') {
      list.sort((a, b) => {
        const aDate = clientLatestSale[a.id]?.date ? new Date(clientLatestSale[a.id].date).getTime() : 0;
        const bDate = clientLatestSale[b.id]?.date ? new Date(clientLatestSale[b.id].date).getTime() : 0;
        return bDate - aDate;
      });
    } else if (sortFilter === 'New') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortFilter === 'Name') {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    // Birthday: no field - keep current order
    return list;
  }, [filteredClients, sortFilter, clientLatestSale]);

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 4) return '—';
    return '.......' + phone.slice(-4);
  };

  const formatLatestActivity = (clientId: string) => {
    const sale = clientLatestSale[clientId];
    if (!sale) return { type: '—', date: '—' };
    const d = new Date(sale.date);
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { type: sale.type, date: `${dateStr}, ${timeStr}` };
  };

  const activeClient = useMemo(() => {
    if (!selectedClient) return null;
    return clients.find(c => c.id === selectedClient.id) || selectedClient;
  }, [clients, selectedClient]);

  const clientHistory = useMemo(() => {
    if (!selectedClient) return [];
    return transactions
      .filter(t => t.clientId === selectedClient.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedClient, transactions]);

  const clientSpend = useMemo(() => {
    if (!selectedClient) return 0;
    return clientHistory.reduce((sum, t) => sum + t.amount, 0);
  }, [clientHistory, selectedClient]);

  const currentTier = useMemo(() => {
    if (!activeClient) return 'New Member';
    if (activeClient.points >= 1000) return 'Gold Member';
    if (activeClient.points >= 600) return 'Silver Member';
    if (activeClient.points >= 300) return 'Bronze Member';
    return 'Regular Member';
  }, [activeClient]);

  const nextTierProgress = useMemo(() => {
    if (!activeClient) return 0;
    if (activeClient.points >= 1000) return 100;
    if (activeClient.points >= 600) return ((activeClient.points - 600) / (1000 - 600)) * 100;
    if (activeClient.points >= 300) return ((activeClient.points - 300) / (600 - 300)) * 100;
    return (activeClient.points / 300) * 100;
  }, [activeClient]);

  const handleRedeem = async (rewardName: string, cost: number) => {
    if (!activeClient || activeClient.points < cost) return;

    const confirmRedeem = window.confirm(`Confirm redemption for ${activeClient.name}: Deduct ${cost} points for "${rewardName}"?`);
    if (confirmRedeem) {
      onUpdatePoints(activeClient.id, -cost);
      
      const redemptionTxn: Transaction = {
        id: `redeem_${Date.now()}`,
        outletID: getCurrentOutletID(),
        date: new Date().toISOString(),
        type: TransactionType.SALE,
        clientId: activeClient.id,
        amount: 0,
        category: 'Redemption',
        description: `Loyalty Redemption: ${rewardName}`
      };
      
      await onAddTransaction(redemptionTxn);
      alert(`🎉 Redemption successful! The reward "${rewardName}" has been recorded for ${activeClient.name}.`);
    }
  };

  const scrollToRewards = () => {
    rewardsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newClientHasDuplicate) {
      const msg = [
        newClientNameDuplicate && 'Full Name already exists.',
        newClientPhoneDuplicate && 'Phone number already exists.',
      ].filter(Boolean).join(' ');
      alert(msg || 'This member already exists. Please use a unique Full Name and Phone.');
      return;
    }
    setIsSaving(true);
    try {
      const joinDate = newClient.createdAt || new Date().toISOString();
      await onAddClient({ ...newClient, createdAt: joinDate });
      setNewClient({
        name: '',
        email: '',
        phone: '',
        notes: '',
        createdAt: '',
        birthday: '',
        gender: memberFormSettings.presetGender,
        source: '',
        ic: '',
        marital: '',
        tag: '',
        ethnic: '',
        memberTier: '',
      });
      setShowAddClientModal(false);
    } catch (err) {
      console.error("CRM Save Error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;
    setIsSaving(true);
    try {
      await onUpdateClient(activeClient.id, editClientData);
      setShowEditClientModal(false);
    } catch (err) {
      console.error("CRM Update Error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePointsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;
    const confirmUpdate = window.confirm(`Update ${activeClient.name}'s points balance to ${editingPointsValue}?`);
    if (confirmUpdate) {
      const delta = editingPointsValue - activeClient.points;
      onUpdatePoints(activeClient.id, delta);
      setShowEditPointsModal(false);
    }
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!rewardFormData.name || !rewardFormData.name.trim()) {
      alert('Please enter a reward name.');
      return;
    }
    
    if (!rewardFormData.cost || Number(rewardFormData.cost) <= 0) {
      alert('Please enter a valid point cost (must be greater than 0).');
      return;
    }
    
    setIsSavingReward(true);
    try {
      // Get current outletID from firestoreService
      const outletID = getCurrentOutletID();
      
      if (!outletID) {
        alert('Error: No outlet assigned. Cannot save reward. Please contact your administrator.');
        setIsSavingReward(false);
        return;
      }

      if (editingReward) {
        // Update existing reward - preserve outletID
        const updatedReward: Reward = {
          ...editingReward,
          ...rewardFormData,
          cost: Number(rewardFormData.cost),
          outletID: editingReward.outletID || outletID // Preserve existing outletID
        };
        await onUpdateRewards(rewards.map(r => r.id === editingReward.id ? updatedReward : r));
      } else {
        // Create new reward with outletID (without ID - Firestore will generate it)
        // Use a temporary ID for the local array, but rewardService.add will create the real one
        const tempId = `temp_${Date.now()}`;
        const newReward: Reward = {
          id: tempId, // Temporary ID for local state
          outletID: outletID,
          name: rewardFormData.name.trim(),
          cost: Number(rewardFormData.cost),
          icon: rewardFormData.icon || '🎁'
        };
        // Add to local state immediately for better UX
        const updatedRewards = [...rewards, newReward];
        await onUpdateRewards(updatedRewards);
        // The real-time listener will update with the actual Firestore ID
      }
      
      // Clear form and reset state
      setRewardFormData({ name: '', cost: 0, icon: '🎁' });
      setEditingReward(null);
      
      // Show success message (optional - can be removed if too intrusive)
      // The real-time listener will update the UI automatically
    } catch (error: any) {
      console.error('Error saving reward:', error);
      alert(`Failed to save reward: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsSavingReward(false);
    }
  };

  const startEditReward = (reward: Reward) => {
    setEditingReward(reward);
    setRewardFormData(reward);
  };

  const handleRemoveReward = (id: string) => {
    if (window.confirm("Delete this reward from the program?")) {
      onUpdateRewards(rewards.filter(r => r.id !== id));
    }
  };

  const startEditClient = (client: Client) => {
    setSelectedClient(client);
    setEditClientData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      notes: client.notes
    });
    setShowEditClientModal(true);
  };

  const isEligibleForAny = (points: number) => {
    return rewards.some(r => points >= r.cost);
  };

  const executeExport = () => {
    if (isExportLocked) return;
    if (clients.length === 0) {
      alert("No clients to export.");
      setShowExportConfirm(false);
      return;
    }
    const headers = ["Name", "Email", "Phone", "Notes", "Points", "Joined Date"];
    const rows = clients.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email.replace(/"/g, '""')}"`,
      `"${c.phone.replace(/"/g, '""')}"`,
      `"${c.notes.replace(/\n/g, ' ').replace(/"/g, '""')}"`,
      c.points,
      new Date(c.createdAt).toLocaleDateString()
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bookglow_clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportConfirm(false);
  };

  // Import members from CSV (Excel-exported). Expects headers like Name, Email, Phone, Notes, Joined Date.
  const handleImportClients = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const importSessionId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        alert('Import file has no data rows.');
        return;
      }

      const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            // Toggle inQuotes, but handle escaped quotes ("")
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
          } else {
            current += ch;
          }
        }
        result.push(current);
        return result.map((cell) => cell.trim());
      };

      const headerCells = parseLine(lines[0]).map((h) => h.toLowerCase().trim());
      const findIndex = (candidates: string[]): number =>
        headerCells.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

      const idxName = findIndex(['name', 'full name']);
      const idxPhone = findIndex(['phone', 'mobile', 'phone number']);
      const idxEmail = findIndex(['email', 'e-mail']);
      const idxNotes = findIndex(['notes', 'remark', 'remarks']);
      const idxPoints = findIndex(['points', 'point']);
      const idxJoined = findIndex(['joined date', 'join date', 'createdat', 'created at']);

      if (idxName === -1 && idxPhone === -1) {
        alert('Import file must have at least a Name or Phone column.');
        return;
      }

      // Parse D/M/YYYY or DD/MM/YYYY (day first) to ISO date string
      const parseJoinedDate = (raw: string): string => {
        const s = raw.trim();
        if (!s) return '';
        const parts = s.split(/[/-]/).map((p) => parseInt(p.trim(), 10));
        if (parts.length !== 3 || parts.some((n) => isNaN(n))) {
          const d = new Date(s);
          return !isNaN(d.getTime()) ? d.toISOString() : '';
        }
        const [a, b, c] = parts;
        let day: number, month: number, year: number;
        if (c <= 31) {
          year = a >= 1900 ? a : c;
          day = c <= 31 ? c : b;
          month = (a >= 1900 ? b : a) - 1;
        } else {
          year = c;
          if (a > 12) {
            day = a;
            month = b - 1;
          } else if (b > 12) {
            month = a - 1;
            day = b;
          } else {
            day = a;
            month = b - 1;
          }
        }
        const d = new Date(year, month, day);
        return !isNaN(d.getTime()) ? d.toISOString() : '';
      };

      // Normalize phone: convert Excel scientific notation (e.g. 6.01E+11) to full digit string
      const normalizePhone = (val: string): string => {
        const t = val.trim();
        if (/^[\d.eE+-]+$/.test(t)) {
          const n = parseFloat(t);
          if (!isNaN(n)) return String(Math.round(n));
        }
        return t;
      };

      // Parse points: allow "1,234.00" or "516" or ""
      const parsePoints = (val: string): number => {
        const t = val.trim().replace(/,/g, '');
        if (!t) return 0;
        const n = parseFloat(t);
        return isNaN(n) || n < 0 ? 0 : Math.round(n);
      };

      let successCount = 0;
      let skippedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = parseLine(lines[i]);
        if (row.every((cell) => cell === '')) {
          continue;
        }
        const name = idxName >= 0 ? row[idxName] ?? '' : '';
        const phoneRaw = idxPhone >= 0 ? row[idxPhone] ?? '' : '';
        const phone = normalizePhone(phoneRaw);
        if (!name.trim() && !phone) {
          skippedCount++;
          continue;
        }
        const email = idxEmail >= 0 ? row[idxEmail] ?? '' : '';
        const notes = idxNotes >= 0 ? row[idxNotes] ?? '' : '';
        const points = idxPoints >= 0 ? parsePoints(row[idxPoints] ?? '') : 0;
        const createdAt = idxJoined >= 0 && row[idxJoined] ? parseJoinedDate(row[idxJoined]) : '';

        try {
          await onAddClient({
            name: name.trim(),
            email: email.trim(),
            phone,
            notes,
            createdAt: createdAt || new Date().toISOString(),
            points,
            lastImportId: importSessionId,
          });
          successCount++;
        } catch (err: any) {
          console.error('Import client failed for row', i + 1, err);
          skippedCount++;
        }
      }

      if (successCount > 0) {
        setLastImportToast({ sessionId: importSessionId, count: successCount });
      }
      alert(
        `Import completed.\n\nSuccessfully imported: ${successCount}\nSkipped/failed: ${skippedCount}`
      );
    } catch (err: any) {
      console.error('Import clients error:', err);
      alert(err?.message || 'Failed to import clients. Please check the file format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUndoImport = async () => {
    if (!lastImportToast || !onUndoImport || undoImportInProgress) return;
    if (!window.confirm(`Remove the ${lastImportToast.count} member(s) that were just imported? This cannot be undone.`)) return;
    setUndoImportInProgress(true);
    try {
      const removed = await onUndoImport(lastImportToast.sessionId);
      setLastImportToast(null);
      alert(`Undo complete. Removed ${removed} member(s).`);
    } catch (err: any) {
      alert(err?.message || 'Failed to undo import.');
    } finally {
      setUndoImportInProgress(false);
    }
  };

  const handleDeleteAllClients = async () => {
    if (!onDeleteAllClients || deleteAllInProgress) return;
    const count = sortedClients.length;
    if (count === 0) {
      alert('There are no members to delete.');
      return;
    }
    const msg = `Permanently delete all ${count} member(s)? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setDeleteAllInProgress(true);
    try {
      const removed = await onDeleteAllClients();
      alert(`Deleted ${removed} member(s).`);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete all members.');
    } finally {
      setDeleteAllInProgress(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 animate-fadeIn text-[13px] md:text-base pb-24 sm:pb-6">
      <div className="hidden sm:block">
        <MemberPageHeader clientCount={clients.length} />
      </div>
      <div className="sm:hidden -mt-1 flex items-baseline justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Members</h1>
        <span className="flex-shrink-0 text-xs font-medium text-slate-500 tabular-nums">
          {clients.length.toLocaleString()} clients
        </span>
      </div>
      {/* Recent import toast: show last import count + Undo button */}
      {lastImportToast && (
        <div className="fixed bottom-6 right-6 z-[70] max-w-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-slate-800">
              Recent activity
            </p>
            <p className="text-slate-600 text-sm">
              Imported <span className="font-bold text-teal-600">{lastImportToast.count}</span> member{lastImportToast.count !== 1 ? 's' : ''}.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUndoImport}
                disabled={undoImportInProgress}
                className="flex-1 py-2.5 rounded-xl bg-rose-100 text-rose-700 font-semibold text-sm hover:bg-rose-200 disabled:opacity-50 transition-colors"
              >
                {undoImportInProgress ? 'Undoing...' : 'Undo Import'}
              </button>
              <button
                type="button"
                onClick={() => setLastImportToast(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input — shared by the desktop toolbar and the mobile Actions sheet */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportClients}
        accept=".csv"
        className="hidden"
      />

      <MemberToolbar
        search={search}
        onSearchChange={setSearch}
        onAddMember={() => setShowAddClientModal(true)}
        onOpenFilters={() => setShowMobileActions(true)}
        desktopActions={
          <>
            <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <button 
                onClick={() => isExportLocked ? alert("Action locked. Admin permission required.") : setShowExportConfirm(true)}
                className={`px-3 md:px-4 py-2.5 md:py-3 border-r border-slate-100 transition-colors flex items-center gap-2 ${isExportLocked ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {isExportLocked ? <Icons.Lock /> : <Icons.Export />}
                <span className="hidden lg:inline text-sm font-semibold">Export</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="px-3 md:px-4 py-2.5 md:py-3 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isImporting ? <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div> : <Icons.Import />}
                <span className="hidden lg:inline text-sm font-semibold">Import</span>
              </button>
            </div>
            <button 
              onClick={() => setShowRewardsModal(true)}
              className="bg-white border border-slate-200 text-slate-600 px-3 md:px-4 py-2.5 md:py-3 rounded-xl font-semibold text-sm md:text-base flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Icons.Settings /> <span className="hidden sm:inline">Loyalty Program</span>
            </button>
            <button 
              onClick={() => setShowAddClientModal(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 md:px-5 py-2.5 md:py-3 rounded-xl font-semibold text-sm md:text-base flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Icons.Add /> <span className="hidden sm:inline">Add Client</span>
            </button>
          </>
        }
        sortTabs={
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-fit overflow-x-auto">
            {(['Recent', 'New', 'Birthday', 'Name'] as SortFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSortFilter(tab)}
                className={`flex-1 sm:flex-none whitespace-nowrap px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                  sortFilter === tab ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        }
      />

      {/* Client list — compact rows */}
      <div className="space-y-2 sm:space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-thin">
        {sortedClients.map((client) => {
          const latest = formatLatestActivity(client.id);
          const vouchers = client.voucherCount ?? 0;
          const tier = (client.memberTier ?? '').trim();
          const hasTier = tier === 'VIP' || tier === 'VVIP' || tier === 'VVVIP';
          const goToDetails = () => navigate('/member-details/' + client.id);
          const secondary =
            [
              latest.date !== '—' ? `${latest.type} ${latest.date}` : null,
              vouchers > 0 ? `${vouchers} vouchers` : null,
            ]
              .filter(Boolean)
              .join(' · ') || undefined;
          return (
            <MemberRow
              key={client.id}
              name={client.name}
              phoneOrId={maskPhone(client.phone)}
              membershipLabel={hasTier ? tier : undefined}
              balanceOrActivity={`${client.points.toLocaleString()} pts`}
              secondaryMeta={secondary}
              highlighted={hasTier}
              onSelect={goToDetails}
              onEdit={() => startEditClient(client)}
            />
          );
        })}
        {sortedClients.length === 0 && (
          <EmptyState
            title="No members found."
            description={search ? 'Try another search or add a new member.' : 'Add your first member to get started.'}
          />
        )}
      </div>

      {/* Bottom bar: Total + Delete All + Add */}
      <div className="flex items-center justify-between py-4 px-2 border-t border-slate-200 bg-slate-50/50 rounded-xl">
        <div className="flex items-center gap-2 text-slate-600">
          <Icons.Clients />
          <span className="font-semibold">Total {sortedClients.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDeleteAllClients}
            disabled={deleteAllInProgress || sortedClients.length === 0}
            className="py-2.5 px-4 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            title="Delete all members"
          >
            {deleteAllInProgress ? (
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                Deleting...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete All
              </>
            )}
          </button>
          <button
            onClick={() => setShowAddClientModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors"
            aria-label="Add member"
          >
            <Icons.Add />
          </button>
        </div>
      </div>

      <MemberFilterSheet open={showMobileActions} onClose={() => setShowMobileActions(false)}>
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={isImporting}
            onClick={() => { setShowMobileActions(false); fileInputRef.current?.click(); }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors disabled:opacity-50"
          >
            <span className="text-teal-600"><Icons.Import /></span> Import Members
          </button>
          <button
            type="button"
            onClick={() => {
              setShowMobileActions(false);
              if (isExportLocked) { alert('Action locked. Admin permission required.'); } else { setShowExportConfirm(true); }
            }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors"
          >
            <span className="text-teal-600">{isExportLocked ? <Icons.Lock /> : <Icons.Export />}</span> Export Members
          </button>
          <button
            type="button"
            onClick={() => { setShowMobileActions(false); setShowRewardsModal(true); }}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors"
          >
            <span className="text-teal-600"><Icons.Settings /></span> Loyalty Program
          </button>
        </div>
      </MemberFilterSheet>

      {/* Edit Client Modal */}
      <AppModal
        open={showEditClientModal && !!activeClient}
        onClose={() => setShowEditClientModal(false)}
        title="Edit Client Profile"
        description="Update contact details and internal notes."
        size="md"
        zIndexClass="z-[80]"
        busy={isSaving}
        asForm
        formId="edit-client-form"
        onSubmit={handleUpdateClientSubmit}
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setShowEditClientModal(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="edit-client-form" disabled={isSaving}>
              {isSaving ? 'Updating…' : 'Save Changes'}
            </Button>
          </ModalFooterActions>
        }
      >
        <FormSection>
          <Field id="edit-client-name" label="Full Name" required>
            <input
              id="edit-client-name"
              required
              type="text"
              className={fieldControlClassName}
              value={editClientData.name}
              onChange={(e) => setEditClientData({ ...editClientData, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field id="edit-client-email" label="Email">
              <input
                id="edit-client-email"
                type="email"
                className={fieldControlClassName}
                value={editClientData.email}
                onChange={(e) => setEditClientData({ ...editClientData, email: e.target.value })}
              />
            </Field>
            <Field id="edit-client-phone" label="Phone">
              <input
                id="edit-client-phone"
                type="tel"
                className={fieldControlClassName}
                value={editClientData.phone}
                onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field id="edit-client-notes" label="Internal Notes">
            <textarea
              id="edit-client-notes"
              rows={4}
              className={`${fieldControlClassName} h-auto py-2`}
              value={editClientData.notes}
              onChange={(e) => setEditClientData({ ...editClientData, notes: e.target.value })}
            />
          </Field>
        </FormSection>
      </AppModal>

      {/* Reward Settings Modal */}
      <AppModal
        open={showRewardsModal}
        onClose={() => {
          setShowRewardsModal(false);
          setEditingReward(null);
        }}
        title="Loyalty Rewards Program"
        description="Define point-based gifts and benefits for your clients."
        size="lg"
        zIndexClass="z-[70]"
        footer={
          <ModalFooterActions>
            <Button
              variant="secondary"
              onClick={() => {
                setShowRewardsModal(false);
                setEditingReward(null);
              }}
            >
              Close
            </Button>
          </ModalFooterActions>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-ui-md border border-[var(--line)] bg-[var(--bg-soft)] p-4">
            <FormSection title={editingReward ? 'Edit Reward Item' : 'Create New Reward Item'}>
              <form id="reward-form" onSubmit={handleSaveReward} className="space-y-3">
                <div className="flex gap-3">
                  <Field id="reward-icon" label="Icon" className="w-16 shrink-0">
                    <input
                      id="reward-icon"
                      type="text"
                      maxLength={2}
                      className={`${fieldControlClassName} text-center text-xl`}
                      value={rewardFormData.icon}
                      onChange={(e) => setRewardFormData({ ...rewardFormData, icon: e.target.value })}
                    />
                  </Field>
                  <Field id="reward-name" label="Reward Name" required className="flex-1">
                    <input
                      id="reward-name"
                      required
                      type="text"
                      placeholder="e.g. Free Facial"
                      className={fieldControlClassName}
                      value={rewardFormData.name}
                      onChange={(e) => setRewardFormData({ ...rewardFormData, name: e.target.value })}
                    />
                  </Field>
                </div>
                <Field id="reward-cost" label="Point Cost" required>
                  <input
                    id="reward-cost"
                    required
                    type="number"
                    min="1"
                    placeholder="Points required"
                    className={`${fieldControlClassName} font-bold tabular-nums`}
                    value={rewardFormData.cost || ''}
                    onChange={(e) =>
                      setRewardFormData({ ...rewardFormData, cost: parseInt(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Button type="submit" fullWidth disabled={isSavingReward}>
                  {isSavingReward ? 'Saving…' : editingReward ? 'Save Changes' : 'Add to Catalog'}
                </Button>
              </form>
            </FormSection>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-app-label font-bold uppercase text-[var(--text-secondary)]">
                Program Catalog
              </p>
              <span className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-soft)] px-2 py-0.5 rounded-ui-sm">
                {rewards.length}
              </span>
            </div>
            <div className="space-y-2">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{reward.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{reward.name}</p>
                      <p className="text-xs font-semibold text-[var(--brand)]">{reward.cost} pts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton label="Edit reward" size="sm" onClick={() => startEditReward(reward)}>
                      <Icons.Edit />
                    </IconButton>
                    <IconButton
                      label="Remove reward"
                      size="sm"
                      onClick={() => handleRemoveReward(reward.id)}
                    >
                      <Icons.Trash />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppModal>

      {/* Adjust Points Modal */}
      <AppModal
        open={showEditPointsModal && !!activeClient}
        onClose={() => setShowEditPointsModal(false)}
        title="Manual Balance Update"
        description={activeClient ? `Updating for ${activeClient.name}` : undefined}
        size="sm"
        zIndexClass="z-[90]"
        asForm
        formId="edit-points-form"
        onSubmit={handleUpdatePointsSubmit}
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setShowEditPointsModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-points-form">
              Confirm Update
            </Button>
          </ModalFooterActions>
        }
      >
        <FormSection>
          <Field id="edit-points-total" label="New Points Total" required>
            <input
              id="edit-points-total"
              autoFocus
              required
              type="number"
              min="0"
              className={`${fieldControlClassName} text-center text-3xl font-bold tabular-nums h-16`}
              value={editingPointsValue}
              onChange={(e) => setEditingPointsValue(parseInt(e.target.value) || 0)}
            />
          </Field>
        </FormSection>
      </AppModal>

      <ConfirmationDialog
        open={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        onConfirm={executeExport}
        title="Secure Export"
        description="Download client records as CSV."
        confirmLabel="Download Now"
        cancelLabel="Cancel"
        tone="primary"
      />

      {/* Add Client Modal */}
      <AppModal
        open={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
        title="Register New Client"
        description="Create a new member profile for this outlet."
        size="xl"
        zIndexClass="z-[60]"
        busy={isSaving}
        asForm
        formId="register-client-form"
        onSubmit={handleSaveClient}
        bodyClassName="!p-0"
        headerActions={
          <IconButton
            label="Member Form Setting"
            size="md"
            onClick={() => setShowMemberFormSettings((prev) => !prev)}
            className="min-w-[44px] min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l.7 2.148a1 1 0 00.95.69h2.262c.969 0 1.371 1.24.588 1.81l-1.833 1.333a1 1 0 00-.364 1.118l.7 2.148c.3.921-.755 1.688-1.54 1.118l-1.833-1.333a1 1 0 00-1.176 0l-1.833 1.333c-.784.57-1.838-.197-1.539-1.118l.7-2.148a1 1 0 00-.364-1.118L5.45 7.575c-.783-.57-.38-1.81.588-1.81H8.3a1 1 0 00.95-.69l.7-2.148z"
              />
            </svg>
          </IconButton>
        }
        footer={
          <ModalFooterActions>
            <Button
              variant="secondary"
              onClick={() => setShowAddClientModal(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="register-client-form"
              disabled={isSaving || newClientHasDuplicate}
            >
              {isSaving
                ? 'Registering…'
                : newClientHasDuplicate
                  ? 'Fix duplicate name or phone'
                  : 'Complete Registration'}
            </Button>
          </ModalFooterActions>
        }
      >
        <div className="flex flex-col md:flex-row min-h-0">
          <div className="p-4 sm:p-5 space-y-3 md:w-1/2 border-b md:border-b-0 md:border-r border-[var(--line)]">
            <FormSection>
              <Field
                id="new-client-name"
                label="Full Name"
                required
                error={
                  newClientNameDuplicate
                    ? 'This name already exists. Please use a different name.'
                    : undefined
                }
              >
                <input
                  id="new-client-name"
                  required
                  type="text"
                  className={`${fieldControlClassName} ${newClientNameDuplicate ? 'border-[var(--danger)]' : ''}`}
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memberFormSettings.fields.email && (
                  <Field id="new-client-email" label="Email">
                    <input
                      id="new-client-email"
                      type="email"
                      className={fieldControlClassName}
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    />
                  </Field>
                )}
                <Field
                  id="new-client-phone"
                  label="Phone"
                  required
                  error={
                    newClientPhoneDuplicate
                      ? 'This phone number already exists. Please use a different number.'
                      : undefined
                  }
                >
                  <input
                    id="new-client-phone"
                    required
                    type="tel"
                    className={`${fieldControlClassName} ${newClientPhoneDuplicate ? 'border-[var(--danger)]' : ''}`}
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  />
                </Field>
              </div>
              {memberFormSettings.fields.birthday && (
                <Field id="new-client-birthday" label="Birthday">
                  <input
                    id="new-client-birthday"
                    type="date"
                    className={fieldControlClassName}
                    value={newClient.birthday || ''}
                    onChange={(e) => setNewClient({ ...newClient, birthday: e.target.value })}
                  />
                </Field>
              )}
              {memberFormSettings.fields.gender && (
                <Field id="new-client-gender" label="Gender">
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <input
                        type="radio"
                        name="newClientGender"
                        value="Male"
                        checked={newClient.gender === 'Male'}
                        onChange={() => setNewClient({ ...newClient, gender: 'Male' })}
                      />
                      <span>Male</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <input
                        type="radio"
                        name="newClientGender"
                        value="Female"
                        checked={newClient.gender === 'Female'}
                        onChange={() => setNewClient({ ...newClient, gender: 'Female' })}
                      />
                      <span>Female</span>
                    </label>
                  </div>
                </Field>
              )}
              {memberFormSettings.fields.ic && (
                <Field id="new-client-ic" label="IC">
                  <input
                    id="new-client-ic"
                    type="text"
                    className={fieldControlClassName}
                    value={newClient.ic}
                    onChange={(e) => setNewClient({ ...newClient, ic: e.target.value })}
                  />
                </Field>
              )}
              {memberFormSettings.fields.marital && (
                <Field id="new-client-marital" label="Marital">
                  <input
                    id="new-client-marital"
                    type="text"
                    className={fieldControlClassName}
                    value={newClient.marital}
                    onChange={(e) => setNewClient({ ...newClient, marital: e.target.value })}
                  />
                </Field>
              )}
              {memberFormSettings.fields.tag && (
                <Field id="new-client-tag" label="Tag">
                  <input
                    id="new-client-tag"
                    type="text"
                    className={fieldControlClassName}
                    value={newClient.tag}
                    onChange={(e) => setNewClient({ ...newClient, tag: e.target.value })}
                  />
                </Field>
              )}
              {memberFormSettings.fields.source && (
                <Field id="new-client-source" label="Source">
                  <input
                    id="new-client-source"
                    type="text"
                    className={fieldControlClassName}
                    value={newClient.source}
                    onChange={(e) => setNewClient({ ...newClient, source: e.target.value })}
                  />
                </Field>
              )}
              {memberFormSettings.fields.ethnic && (
                <Field id="new-client-ethnic" label="Ethnic">
                  <input
                    id="new-client-ethnic"
                    type="text"
                    className={fieldControlClassName}
                    value={newClient.ethnic}
                    onChange={(e) => setNewClient({ ...newClient, ethnic: e.target.value })}
                  />
                </Field>
              )}
              {memberFormSettings.fields.memberTier && (
                <Field id="new-client-tier" label="Member Tier">
                  <input
                    id="new-client-tier"
                    type="text"
                    className={fieldControlClassName}
                    value={newClient.memberTier}
                    onChange={(e) => setNewClient({ ...newClient, memberTier: e.target.value })}
                  />
                </Field>
              )}
              <Field
                id="new-client-join-date"
                label="Join Date"
                hint="Optional. If left empty, today's date will be used."
              >
                <input
                  id="new-client-join-date"
                  type="date"
                  className={fieldControlClassName}
                  value={newClient.createdAt || ''}
                  onChange={(e) => setNewClient({ ...newClient, createdAt: e.target.value })}
                />
              </Field>
              <Field id="new-client-notes" label="Internal Notes">
                <textarea
                  id="new-client-notes"
                  rows={3}
                  className={`${fieldControlClassName} h-auto py-2`}
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                />
              </Field>
            </FormSection>
          </div>

          {showMemberFormSettings && (
            <div className="hidden md:flex flex-col md:w-1/2 bg-[var(--bg-soft)]">
              <div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Member Form Setting</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMemberFormSettings(false)}
                >
                  Save
                </Button>
              </div>
              <div className="p-5 space-y-6">
                <div>
                  <p className="text-app-label font-bold uppercase text-[var(--text-secondary)] mb-2">
                    Member
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <label className="flex items-center gap-2 text-[var(--text-primary)]">
                      <input type="checkbox" checked disabled className="rounded" />
                      <span>Mobile</span>
                    </label>
                    <label className="flex items-center gap-2 text-[var(--text-primary)]">
                      <input type="checkbox" checked disabled className="rounded" />
                      <span>Name</span>
                    </label>
                    {(
                      [
                        ['birthday', 'Birthday'],
                        ['gender', 'Gender'],
                        ['ic', 'IC'],
                        ['marital', 'Marital'],
                        ['tag', 'Tag'],
                        ['source', 'Source'],
                        ['email', 'Email'],
                        ['ethnic', 'Ethnic'],
                        ['memberTier', 'Member Tier'],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-[var(--text-primary)]"
                      >
                        <input
                          type="checkbox"
                          checked={memberFormSettings.fields[key]}
                          onChange={(e) =>
                            setMemberFormSettings((prev) => ({
                              ...prev,
                              fields: { ...prev.fields, [key]: e.target.checked },
                            }))
                          }
                          className="rounded"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-app-label font-bold uppercase text-[var(--text-secondary)] mb-2">
                    Preset Gender
                  </p>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      <input
                        type="radio"
                        name="presetGender"
                        value="Male"
                        checked={memberFormSettings.presetGender === 'Male'}
                        onChange={() =>
                          setMemberFormSettings((prev) => ({
                            ...prev,
                            presetGender: 'Male',
                          }))
                        }
                      />
                      <span>Male</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      <input
                        type="radio"
                        name="presetGender"
                        value="Female"
                        checked={memberFormSettings.presetGender === 'Female'}
                        onChange={() =>
                          setMemberFormSettings((prev) => ({
                            ...prev,
                            presetGender: 'Female',
                          }))
                        }
                      />
                      <span>Female</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppModal>
    </div>
  );
};


export default CRM;
