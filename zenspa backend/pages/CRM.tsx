
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client, Transaction, TransactionType, Service, Reward } from '../types';
import { Icons, COLORS } from '../constants';
import { getCurrentOutletID } from '../services/firestoreService';

type SortFilter = 'Recent' | 'New' | 'Birthday' | 'Name';

interface CRMProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id' | 'points'> & { points?: number }) => Promise<void>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<void>;
  onUndoImport?: (sessionId: string) => Promise<number>;
  onDeleteAllClients?: () => Promise<number>;
  transactions: Transaction[];
  onUpdatePoints: (clientId: string, change: number) => void;
  onAddTransaction: (txn: Transaction) => Promise<void>;
  services: Service[];
  rewards: Reward[];
  onUpdateRewards: (rewards: Reward[]) => void;
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
    link.setAttribute("download", `zenflow_clients_${new Date().toISOString().split('T')[0]}.csv`);
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
    <div className="space-y-6 animate-fadeIn">
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

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-xl">
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full pl-12 pr-4 py-3 bg-slate-100 border-0 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="absolute left-4 top-3.5 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportClients}
            accept=".csv"
            className="hidden"
          />
          
          <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button 
              onClick={() => isExportLocked ? alert("Action locked. Admin permission required.") : setShowExportConfirm(true)}
              className={`px-4 py-3 border-r border-slate-100 transition-colors flex items-center gap-2 ${isExportLocked ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {isExportLocked ? <Icons.Lock /> : <Icons.Export />}
              <span className="hidden lg:inline text-sm font-semibold">Export</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-4 py-3 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isImporting ? <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div> : <Icons.Import />}
              <span className="hidden lg:inline text-sm font-semibold">Import</span>
            </button>
          </div>

          <button 
            onClick={() => setShowRewardsModal(true)}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Icons.Settings /> <span className="hidden sm:inline">Loyalty Program</span>
          </button>
          
          <button 
            onClick={() => setShowAddClientModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Icons.Add /> <span className="hidden sm:inline">Add Client</span>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(['Recent', 'New', 'Birthday', 'Name'] as SortFilter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSortFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortFilter === tab ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Client cards list */}
      <div className="space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-thin">
        {sortedClients.map((client) => {
          const latest = formatLatestActivity(client.id);
          const vouchers = client.voucherCount ?? 0;
          const tier = (client.memberTier ?? '').trim();
          const hasTier = tier === 'VIP' || tier === 'VVIP' || tier === 'VVVIP';
          return (
            <button
              key={client.id}
              type="button"
              onClick={() => navigate('/member-details/' + client.id)}
              className={`w-full rounded-2xl border shadow-sm p-4 flex items-center gap-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                hasTier
                  ? 'bg-amber-50/80 border-amber-300 hover:bg-amber-100/80 hover:border-amber-400'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-teal-200'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm flex-shrink-0 ${
                hasTier ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {client.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800 truncate">{client.name}</p>
                  {hasTier && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-200 text-amber-800">
                      {tier}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">{maskPhone(client.phone)}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    {client.points.toLocaleString()}
                  </span>
                  {vouchers > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm text-sky-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      {vouchers}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{latest.type} · {latest.date}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); startEditClient(client); }}
                  className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                  title="Edit profile"
                >
                  <Icons.Edit />
                </button>
                <span className="text-teal-500" title="View member details">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                </span>
              </div>
            </button>
          );
        })}
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

      {/* Edit Client Modal */}
      {showEditClientModal && activeClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-teal-600 text-white">
              <h3 className="text-xl font-black">Edit Client Profile</h3>
              <button onClick={() => setShowEditClientModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleUpdateClientSubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Full Name</label>
                <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold shadow-inner" value={editClientData.name} onChange={e => setEditClientData({ ...editClientData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Email</label>
                  <input type="email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner" value={editClientData.email} onChange={e => setEditClientData({ ...editClientData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Phone</label>
                  <input type="tel" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner" value={editClientData.phone} onChange={e => setEditClientData({ ...editClientData, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Internal Notes</label>
                <textarea rows={4} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-inner" value={editClientData.notes} onChange={e => setEditClientData({ ...editClientData, notes: e.target.value })}></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditClientModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">Cancel</button>
                <button disabled={isSaving} type="submit" className="flex-[2] py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl shadow-xl shadow-teal-100 transition-all">{isSaving ? 'Updating...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reward Settings Modal */}
      {showRewardsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl animate-scaleIn overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h3 className="text-xl font-black">Loyalty Rewards Program</h3>
                <p className="text-xs text-slate-400 font-medium">Define point-based gifts and benefits for your clients.</p>
              </div>
              <button onClick={() => { setShowRewardsModal(false); setEditingReward(null); }} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8 scrollbar-thin">
              <div className="space-y-6">
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{editingReward ? 'Edit Reward Item' : 'Create New Reward Item'}</h4>
                    <form onSubmit={handleSaveReward} className="space-y-4">
                       <div className="flex gap-4">
                          <div className="w-16">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Icon</label>
                            <input type="text" maxLength={2} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-center text-xl shadow-inner outline-none focus:ring-2 focus:ring-teal-500" value={rewardFormData.icon} onChange={e => setRewardFormData({ ...rewardFormData, icon: e.target.value })} />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Reward Name</label>
                            <input required type="text" placeholder="e.g. Free Facial" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-bold shadow-inner" value={rewardFormData.name} onChange={e => setRewardFormData({ ...rewardFormData, name: e.target.value })} />
                          </div>
                       </div>
                       <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Point Cost</label>
                          <input required type="number" min="1" placeholder="Points required" className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-black text-teal-600 shadow-inner" value={rewardFormData.cost || ''} onChange={e => setRewardFormData({ ...rewardFormData, cost: parseInt(e.target.value) || 0 })} />
                       </div>
                       <button 
                         type="submit" 
                         disabled={isSavingReward}
                         className={`w-full py-3 text-white font-black rounded-xl shadow-lg shadow-teal-100 transition-all active:scale-95 flex items-center justify-center gap-2 ${
                           isSavingReward 
                             ? 'bg-teal-400 cursor-not-allowed' 
                             : 'bg-teal-600 hover:bg-teal-700'
                         }`}
                       >
                         {isSavingReward ? (
                           <>
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             <span>Saving...</span>
                           </>
                         ) : (
                           <span>{editingReward ? 'Save Changes' : 'Add to Catalog'}</span>
                         )}
                       </button>
                    </form>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center justify-between">
                    <span>Program Catalog</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{rewards.length}</span>
                 </h4>
                 <div className="space-y-2">
                    {rewards.map(reward => (
                      <div key={reward.id} className="group p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <span className="text-2xl">{reward.icon}</span>
                            <div>
                               <p className="text-sm font-black text-slate-800 leading-tight">{reward.name}</p>
                               <p className="text-[10px] font-bold text-teal-600">{reward.cost} pts</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditReward(reward)} className="p-2 text-slate-400 hover:text-teal-600 transition-all"><Icons.Edit /></button>
                            <button onClick={() => handleRemoveReward(reward.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><Icons.Trash /></button>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100">
               <button onClick={() => setShowRewardsModal(false)} className="w-full py-3 bg-slate-900 text-white font-black rounded-xl">Close Program Manager</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Points Modal */}
      {showEditPointsModal && activeClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-teal-600 text-white text-center">
              <h3 className="text-xl font-black w-full">Manual Balance Update</h3>
            </div>
            <form onSubmit={handleUpdatePointsSubmit} className="p-8 space-y-6">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-500">Updating for <span className="font-bold text-slate-800">{activeClient.name}</span></p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 text-center">New Points Total</label>
                <input autoFocus required type="number" min="0" className="w-full bg-transparent border-none text-center text-4xl font-black text-teal-600 outline-none" value={editingPointsValue} onChange={e => setEditingPointsValue(parseInt(e.target.value) || 0)} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEditPointsModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-100">Confirm Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Confirmation */}
      {showExportConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-fadeIn overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6"><Icons.Export /></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Secure Export</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">Download client records as CSV.</p>
              <div className="flex flex-col gap-3">
                <button onClick={executeExport} className="w-full py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-100 transition-all">Download Now</button>
                <button onClick={() => setShowExportConfirm(false)} className="w-full py-3 bg-slate-100 text-slate-500 font-bold rounded-xl">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-teal-600 text-white">
              <h3 className="text-lg md:text-xl font-black">Register New Client</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMemberFormSettings((prev) => !prev)}
                  className="p-2 rounded-xl hover:bg-white/10 transition-all"
                  title="Member Form Setting"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l.7 2.148a1 1 0 00.95.69h2.262c.969 0 1.371 1.24.588 1.81l-1.833 1.333a1 1 0 00-.364 1.118l.7 2.148c.3.921-.755 1.688-1.54 1.118l-1.833-1.333a1 1 0 00-1.176 0l-1.833 1.333c-.784.57-1.838-.197-1.539-1.118l.7-2.148a1 1 0 00-.364-1.118L5.45 7.575c-.783-.57-.38-1.81.588-1.81H8.3a1 1 0 00.95-.69l.7-2.148z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setShowAddClientModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row">
              {/* New Member form */}
              <form onSubmit={handleSaveClient} className="p-6 md:p-8 space-y-5 md:w-1/2 border-b md:border-b-0 md:border-r border-slate-100">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                    Full Name
                  </label>
                  <input
                    required
                    type="text"
                    className={`w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 font-bold shadow-inner ${newClientNameDuplicate ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-teal-500'}`}
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  />
                  {newClientNameDuplicate && (
                    <p className="mt-1 text-xs text-red-600 font-medium">This name already exists. Please use a different name.</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {memberFormSettings.fields.email && (
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                      Phone
                    </label>
                    <input
                      required
                      type="tel"
                      className={`w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 font-medium shadow-inner ${newClientPhoneDuplicate ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-teal-500'}`}
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    />
                    {newClientPhoneDuplicate && (
                      <p className="mt-1 text-xs text-red-600 font-medium">This phone number already exists. Please use a different number.</p>
                    )}
                  </div>
                </div>
                {memberFormSettings.fields.birthday && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                      Birthday
                    </label>
                    <input
                      type="date"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner"
                      value={newClient.birthday || ''}
                      onChange={(e) => setNewClient({ ...newClient, birthday: e.target.value })}
                    />
                  </div>
                )}
                {memberFormSettings.fields.gender && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                      Gender
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="radio"
                          name="newClientGender"
                          value="Male"
                          checked={newClient.gender === 'Male'}
                          onChange={() => setNewClient({ ...newClient, gender: 'Male' })}
                          className="text-teal-600 border-slate-300 focus:ring-teal-500"
                        />
                        <span>Male</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="radio"
                          name="newClientGender"
                          value="Female"
                          checked={newClient.gender === 'Female'}
                          onChange={() => setNewClient({ ...newClient, gender: 'Female' })}
                          className="text-teal-600 border-slate-300 focus:ring-teal-500"
                        />
                        <span>Female</span>
                      </label>
                    </div>
                  </div>
                )}
                {memberFormSettings.fields.ic && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                      IC
                    </label>
                    <input
                      type="text"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner"
                      value={newClient.ic}
                      onChange={(e) => setNewClient({ ...newClient, ic: e.target.value })}
                    />
                  </div>
                )}
                {memberFormSettings.fields.marital && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                      Marital
                    </label>
                    <input
                      type="text"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner"
                      value={newClient.marital}
                      onChange={(e) => setNewClient({ ...newClient, marital: e.target.value })}
                    />
                  </div>
                )}
                {memberFormSettings.fields.tag && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                      Tag
                    </label>
                    <input
                      type="text"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner"
                      value={newClient.tag}
                      onChange={(e) => setNewClient({ ...newClient, tag: e.target.value })}
                    />
                  </div>
                )}
                {memberFormSettings.fields.source && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                      Source
                    </label>
                    <input
                      type="text"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner"
                      value={newClient.source}
                      onChange={(e) => setNewClient({ ...newClient, source: e.target.value })}
                    />
                  </div>
                )}
                {memberFormSettings.fields.ethnic && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                      Ethnic
                    </label>
                    <input
                      type="text"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner"
                      value={newClient.ethnic}
                      onChange={(e) => setNewClient({ ...newClient, ethnic: e.target.value })}
                    />
                  </div>
                )}
                {memberFormSettings.fields.memberTier && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                      Member Tier
                    </label>
                    <input
                      type="text"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner"
                      value={newClient.memberTier}
                      onChange={(e) => setNewClient({ ...newClient, memberTier: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                    Join Date
                  </label>
                  <input
                    type="date"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium shadow-inner"
                    value={newClient.createdAt || ''}
                    onChange={(e) => setNewClient({ ...newClient, createdAt: e.target.value })}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Optional. If left empty, today&apos;s date will be used.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">
                    Internal Notes
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-inner"
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  ></textarea>
                </div>
                <button
                  disabled={isSaving || newClientHasDuplicate}
                  type="submit"
                  className={`w-full py-5 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 ${isSaving || newClientHasDuplicate ? 'bg-slate-400 cursor-not-allowed shadow-slate-200' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-100'}`}
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Icons.Add />
                  )}
                  <span>{isSaving ? 'Registering...' : newClientHasDuplicate ? 'Fix duplicate name or phone' : 'Complete Registration'}</span>
                </button>
              </form>

              {/* Member Form Setting panel (like 1.png) */}
              {showMemberFormSettings && (
                <div className="hidden md:flex flex-col md:w-1/2 bg-slate-50/80">
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-800">Member Form Setting</h4>
                    <button
                      type="button"
                      className="text-xs font-semibold text-teal-600 hover:underline"
                      onClick={() => setShowMemberFormSettings(false)}
                    >
                      Save
                    </button>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Member</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <label className="flex items-center gap-2 text-slate-700">
                          <input type="checkbox" checked disabled className="rounded border-slate-300 text-teal-600" />
                          <span>Mobile</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                          <input type="checkbox" checked disabled className="rounded border-slate-300 text-teal-600" />
                          <span>Name</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={memberFormSettings.fields.birthday}
                            onChange={(e) =>
                              setMemberFormSettings((prev) => ({
                                ...prev,
                                fields: { ...prev.fields, birthday: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 text-teal-600"
                          />
                          <span>Birthday</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={memberFormSettings.fields.gender}
                            onChange={(e) =>
                              setMemberFormSettings((prev) => ({
                                ...prev,
                                fields: { ...prev.fields, gender: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 text-teal-600"
                          />
                          <span>Gender</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={memberFormSettings.fields.ic}
                            onChange={(e) =>
                              setMemberFormSettings((prev) => ({
                                ...prev,
                                fields: { ...prev.fields, ic: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 text-teal-600"
                          />
                          <span>IC</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={memberFormSettings.fields.marital}
                            onChange={(e) =>
                              setMemberFormSettings((prev) => ({
                                ...prev,
                                fields: { ...prev.fields, marital: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 text-teal-600"
                          />
                          <span>Marital</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={memberFormSettings.fields.tag}
                            onChange={(e) =>
                              setMemberFormSettings((prev) => ({
                                ...prev,
                                fields: { ...prev.fields, tag: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 text-teal-600"
                          />
                          <span>Tag</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={memberFormSettings.fields.source}
                            onChange={(e) =>
                              setMemberFormSettings((prev) => ({
                                ...prev,
                                fields: { ...prev.fields, source: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 text-teal-600"
                          />
                          <span>Source</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={memberFormSettings.fields.email}
                            onChange={(e) =>
                              setMemberFormSettings((prev) => ({
                                ...prev,
                                fields: { ...prev.fields, email: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 text-teal-600"
                          />
                          <span>Email</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={memberFormSettings.fields.ethnic}
                            onChange={(e) =>
                              setMemberFormSettings((prev) => ({
                                ...prev,
                                fields: { ...prev.fields, ethnic: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 text-teal-600"
                          />
                          <span>Ethnic</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-700">
                          <input
                            type="checkbox"
                            checked={memberFormSettings.fields.memberTier}
                            onChange={(e) =>
                              setMemberFormSettings((prev) => ({
                                ...prev,
                                fields: { ...prev.fields, memberTier: e.target.checked },
                              }))
                            }
                            className="rounded border-slate-300 text-teal-600"
                          />
                          <span>Member Tier</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">
                        Preset Gender
                      </p>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
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
                            className="text-teal-600 border-slate-300 focus:ring-teal-500"
                          />
                          <span>Male</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
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
                            className="text-teal-600 border-slate-300 focus:ring-teal-500"
                          />
                          <span>Female</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
