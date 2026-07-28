import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Staff, Transaction, TransactionType, RoleCommission, Service } from '../types';
import { uploadImage, getStaffProfileImagePath } from '../services/storageService';
import { Icons } from '../constants';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
<<<<<<< HEAD
import {
  StaffCard,
  StaffCommissionSection,
  StaffEditor,
  StaffPageHeader,
  StaffPermissionSection,
  StaffProfileSection,
  StaffRoster,
  StaffScheduleSection,
  StaffServicesSection,
  type StaffStatusKind,
=======
import { FilterToolbar } from '../components/ui/FilterToolbar';
import {
  defaultStaffPermissions,
  emptyWeeklyHours,
  formatShiftLabel,
  normalizeStaffPermissions,
  normalizeWeeklyHours,
} from '../utils/staffExtras';
import {
  StaffCard,
  StaffCommissionSection,
  StaffDetailPanel,
  StaffEditor,
  StaffEditorSection,
  StaffPageHeader,
  StaffPermissionSection,
  StaffProfileSection,
  StaffRolesModal,
  StaffRoster,
  StaffScheduleSection,
  StaffServicesSection,
  StaffSummaryCards,
  type StaffDetailTab,
  type StaffStatusKind,
  type StaffSummaryCardItem,
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
} from '../components/staff';

const MAX_PHOTO_SIZE_MB = 2;
const MAX_PHOTO_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

interface StaffProps {
  staff: Staff[];
  services: Service[];
  roleCommissions: RoleCommission[];
  onUpdateRoleCommissions: (updated: RoleCommission[]) => void;
  onAddStaff: (member: Omit<Staff, 'id' | 'outletID'> & { outletID?: string }) => Promise<void | string | undefined>;
  onUpdateStaff: (member: Staff) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  transactions: Transaction[];
  isLocked?: boolean;
}

type PerformancePeriod = 'month' | 'year' | 'all' | 'custom';

const StaffPage: React.FC<StaffProps> = ({ 
  staff, 
  services,
  roleCommissions, 
  onUpdateRoleCommissions, 
  onAddStaff, 
  onUpdateStaff, 
  onDeleteStaff, 
  transactions, 
  isLocked 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Staff | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PerformancePeriod>('month');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Local state for role creation
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleRate, setNewRoleRate] = useState(0);

  const [formData, setFormData] = useState<Partial<Staff>>({
    name: '',
    role: '',
    email: '',
    phone: '',
    qualifiedServices: [],
    weeklyHours: emptyWeeklyHours(),
    permissions: defaultStaffPermissions(''),
  });

  // Staff photo upload (Edit Profile modal)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Qualified services search filter (Add/Edit modal)
  const [serviceSearch, setServiceSearch] = useState('');
  // Page-level success toast shown after a successful save
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingStaff, setDeletingStaff] = useState(false);
<<<<<<< HEAD
=======

  // Directory: search, filters, pagination, detail tab
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StaffStatusKind>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [detailTab, setDetailTab] = useState<StaffDetailTab>('overview');
  /** Mobile: list-first; open detail after tapping a card */
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

  // Auto-dismiss the success toast
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // Smart selection: Always select the first staff if none is selected
  useEffect(() => {
    if (!selectedStaffId && staff.length > 0) {
      setSelectedStaffId(staff[0].id);
    }
  }, [staff, selectedStaffId]);

  const staffStats = useMemo(() => {
    return staff.map(member => {
      const filteredHistory = transactions.flatMap(t => {
        // Staff performance & commission should only count ACTIVE sales.
        // When a sale is voided in Sales Reports we mark it as status: 'voided' (and remove it from Sales History view),
        // so it must be excluded here as well.
        const status = (t as Transaction & { status?: string }).status;
        if (t.type !== TransactionType.SALE) return [];
        if (status === 'voided') return [];

        const d = new Date(t.date);
        const now = new Date();
        let matches = false;
        
        if (period === 'all') {
          matches = true;
        } else if (period === 'custom') {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // Include entire end date
          matches = d >= start && d <= end;
        } else if (period === 'month') {
          matches = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        } else if (period === 'year') {
          matches = d.getFullYear() === now.getFullYear();
        }
        
        if (!matches) return [];
        return (t.items || [])
          .filter(item => item.staffId === member.id)
          .map(item => ({ ...item, date: t.date }));
      });

      return {
        ...member,
        totalServices: filteredHistory.length,
        totalRevenue: filteredHistory.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        totalCommission: filteredHistory.reduce((sum, item) => sum + (item.commissionEarned || 0), 0),
        history: filteredHistory
      };
    });
  }, [staff, transactions, period, startDate, endDate]);

  const staffStatusFor = (member: { totalCommission: number; totalServices: number }): StaffStatusKind => {
    if (member.totalCommission > 0) return 'earning';
    if (member.totalServices > 0) return 'active';
    return 'idle';
  };

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffStats.filter((member) => {
      if (roleFilter !== 'all' && member.role !== roleFilter) return false;
      const status = staffStatusFor(member);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!q) return true;
      const serviceNames = (member.qualifiedServices ?? [])
        .map((id) => services.find((s) => s.id === id)?.name || '')
        .join(' ')
        .toLowerCase();
      return (
        member.name.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        (member.email || '').toLowerCase().includes(q) ||
        serviceNames.includes(q)
      );
    });
  }, [staffStats, searchQuery, roleFilter, statusFilter, services]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter, pageSize]);

  useEffect(() => {
    if (filteredStaff.length === 0) return;
    const stillVisible = filteredStaff.some((m) => m.id === selectedStaffId);
    if (!stillVisible) setSelectedStaffId(filteredStaff[0].id);
  }, [filteredStaff, selectedStaffId]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const safePage = Math.min(page, totalPages);
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);
  const pageStart = filteredStaff.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filteredStaff.length);
  const paginatedStaff = useMemo(
    () => filteredStaff.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredStaff, safePage, pageSize],
  );

  const activeStaff = staffStats.find((s) => s.id === selectedStaffId) || null;

  const activeTodayCount = useMemo(() => {
    const now = new Date();
    const activeIds = new Set<string>();
    for (const t of transactions) {
      const status = (t as Transaction & { status?: string }).status;
      if (t.type !== TransactionType.SALE || status === 'voided') continue;
      const d = new Date(t.date);
      if (
        d.getFullYear() !== now.getFullYear() ||
        d.getMonth() !== now.getMonth() ||
        d.getDate() !== now.getDate()
      ) {
        continue;
      }
      for (const item of t.items || []) {
        if (item.staffId) activeIds.add(item.staffId);
      }
    }
    return staff.filter((s) => activeIds.has(s.id)).length;
  }, [transactions, staff]);

  const servicesCoveredCount = useMemo(() => {
    const ids = new Set<string>();
    let unrestricted = 0;
    for (const m of staff) {
      const qs = m.qualifiedServices ?? [];
      if (qs.length === 0) {
        unrestricted += 1;
      } else {
        qs.forEach((id) => ids.add(id));
      }
    }
    if (unrestricted > 0 && staff.length > 0) return services.length;
    return ids.size;
  }, [staff, services]);

  const periodCommissionTotal = useMemo(
    () => staffStats.reduce((sum, m) => sum + m.totalCommission, 0),
    [staffStats],
  );

  const summaryCards: StaffSummaryCardItem[] = useMemo(() => {
    const activePct =
      staff.length > 0 ? Math.round((activeTodayCount / staff.length) * 100) : 0;
    const periodLabel =
      period === 'month'
        ? 'This month'
        : period === 'year'
          ? 'This year'
          : period === 'custom'
            ? 'Custom range'
            : 'All time';
    return [
      {
        id: 'total',
        label: 'Total Staff',
        value: String(staff.length),
        hint: `${filteredStaff.length} shown in directory`,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        id: 'active-today',
        label: 'Active Today',
        value: String(activeTodayCount),
        hint: staff.length ? `${activePct}% of team with sales today` : 'No staff yet',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        id: 'services',
        label: 'Services Covered',
        value: String(servicesCoveredCount),
        hint: 'Across all staff',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        ),
      },
      {
        id: 'commission',
        label: 'Period Commission',
        value: `$${periodCommissionTotal.toLocaleString()}`,
        hint: periodLabel,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        id: 'rating',
        label: 'Avg. Rating',
        value: '—',
        hint: 'Not tracked yet',
        emphasize: true,
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ),
      },
    ];
  }, [
    staff.length,
    filteredStaff.length,
    activeTodayCount,
    servicesCoveredCount,
    periodCommissionTotal,
    period,
  ]);

  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(staff.map((s) => s.role).filter(Boolean))).sort();
    return roles;
  }, [staff]);

  const activeServiceNames = useMemo(() => {
    if (!activeStaff) return [];
    const qs = activeStaff.qualifiedServices ?? [];
    if (qs.length === 0) return [];
    return qs
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter((n): n is string => Boolean(n));
  }, [activeStaff, services]);

  const allServiceIds = useMemo(() => services.map(s => s.id), [services]);
  const servicesByCategory = useMemo(() => {
    const groups: Record<string, Service[]> = {};
    services.forEach((s) => {
      const cat = s.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    Object.keys(groups).forEach((cat) => {
      groups[cat].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });
    return groups;
  }, [services]);

  const toggleQualifiedService = (serviceId: string) => {
    const current = formData.qualifiedServices ?? [];
    const exists = current.includes(serviceId);
    const next = exists ? current.filter((id) => id !== serviceId) : [...current, serviceId];
    setFormData({ ...formData, qualifiedServices: next });
  };

  const selectAllQualified = () => {
    setFormData((prev) => ({ ...prev, qualifiedServices: [...allServiceIds] }));
  };

  const clearAllQualified = () => {
    setFormData((prev) => ({ ...prev, qualifiedServices: [] }));
  };

  const qualifiedCount = (formData.qualifiedServices ?? []).length;

  // Services grouped by category, filtered by the search box (keeps original grouping intact)
  const filteredServicesByCategory = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) return servicesByCategory;
    const groups: Record<string, Service[]> = {};
    (Object.entries(servicesByCategory) as [string, Service[]][]).forEach(([cat, list]) => {
      const matches = list.filter(
        (s) => (s.name || '').toLowerCase().includes(term) || cat.toLowerCase().includes(term)
      );
      if (matches.length) groups[cat] = matches;
    });
    return groups;
  }, [servicesByCategory, serviceSearch]);

  // Detect unsaved edits so we can warn before discarding
  const isFormDirty = (): boolean => {
    if (photoFile) return true;
    if (editingMember) {
      const sameServices =
        JSON.stringify([...(formData.qualifiedServices ?? [])].sort()) ===
        JSON.stringify([...(editingMember.qualifiedServices ?? [])].sort());
      const sameHours =
        JSON.stringify(normalizeWeeklyHours(formData.weeklyHours)) ===
        JSON.stringify(normalizeWeeklyHours(editingMember.weeklyHours));
      const samePerms =
        JSON.stringify(normalizeStaffPermissions(formData.permissions, formData.role || '')) ===
        JSON.stringify(
          normalizeStaffPermissions(editingMember.permissions, editingMember.role || ''),
        );
      return (
        (formData.name ?? '') !== (editingMember.name ?? '') ||
        (formData.role ?? '') !== (editingMember.role ?? '') ||
        (formData.email ?? '') !== (editingMember.email ?? '') ||
        (formData.phone ?? '') !== (editingMember.phone ?? '') ||
        !sameServices ||
        !sameHours ||
        !samePerms
      );
    }
    return Boolean(
      formData.name ||
        formData.email ||
        formData.phone ||
        (formData.qualifiedServices ?? []).length,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setUploadError(null);

    try {
      if (editingMember) {
        let profilePictureUrl = formData.profilePicture ?? editingMember.profilePicture;
        setUploadLoading(true);
        if (photoFile) {
          const staffId = editingMember.id;
          const outletId = editingMember.outletID || '';
          const path = outletId
            ? getStaffProfileImagePath(outletId, staffId)
            : `outlets/unknown/staff/${staffId}/profile.jpg`;
          try {
            profilePictureUrl = await uploadImage(photoFile, path);
          } catch (storageErr: unknown) {
            const msg = storageErr instanceof Error ? storageErr.message : 'Photo upload failed.';
            const isPermissionDenied = msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('policy');
            setUploadError(isPermissionDenied ? 'Permission denied. Please check storage rules / outlet access.' : msg);
            setUploadLoading(false);
            return;
          }
        }

        const role = formData.role || editingMember.role || '';
        const updatedMember: Staff = {
          ...editingMember,
          ...formData,
          role,
          qualifiedServices: formData.qualifiedServices ?? editingMember.qualifiedServices ?? [],
          weeklyHours:
            normalizeWeeklyHours(formData.weeklyHours) ??
            normalizeWeeklyHours(editingMember.weeklyHours),
          permissions: normalizeStaffPermissions(
            formData.permissions ?? editingMember.permissions,
            role,
          ),
        } as Staff;

        if (profilePictureUrl) {
          updatedMember.profilePicture = profilePictureUrl;
          updatedMember.photoURL = profilePictureUrl;
        }

        await onUpdateStaff(updatedMember);
        handleCloseModal();
        setSuccessMessage('Staff profile updated.');
      } else {
        const role = formData.role || roleCommissions[0]?.role || 'Staff';
        await onAddStaff({
          name: formData.name || '',
          role,
          email: formData.email || '',
          phone: formData.phone || '',
          createdAt: new Date().toISOString(),
          qualifiedServices: formData.qualifiedServices ?? [],
          weeklyHours: normalizeWeeklyHours(formData.weeklyHours) ?? emptyWeeklyHours(),
          permissions: normalizeStaffPermissions(formData.permissions, role),
        });
        handleCloseModal();
        setSuccessMessage('Staff member added.');
      }
    } catch (err) {
      console.error('Staff Save Error:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleEdit = (member: Staff) => {
    if (isLocked) return;
    setEditingMember(member);
    setFormData({
      ...member,
      weeklyHours: normalizeWeeklyHours(member.weeklyHours) ?? emptyWeeklyHours(),
      permissions: normalizeStaffPermissions(member.permissions, member.role),
    });
    setPhotoFile(null);
    setPhotoPreview(member.profilePicture || null);
    setUploadError(null);
    setServiceSearch('');
    setShowModal(true);
  };

  const blankForm = (role = roleCommissions[0]?.role || ''): Partial<Staff> => ({
    name: '',
    role,
    email: '',
    phone: '',
    qualifiedServices: [],
    weeklyHours: emptyWeeklyHours(),
    permissions: defaultStaffPermissions(role),
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
    setFormData(blankForm());
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadError(null);
    setServiceSearch('');
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
  };

  // Close with a discard-confirmation when there are unsaved edits
  const handleRequestClose = () => {
    if (uploadLoading) return;
    if (isFormDirty() && !window.confirm('Discard unsaved changes?')) return;
    handleCloseModal();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setUploadError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPEG, PNG, etc.).');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setUploadError(`File is too large. Maximum size is ${MAX_PHOTO_SIZE_MB} MB.`);
      return;
    }
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const requestDelete = (id: string) => {
    if (isLocked) return;
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId || isLocked) return;
    setDeletingStaff(true);
    try {
      await onDeleteStaff(pendingDeleteId);
<<<<<<< HEAD
      if (selectedStaffId === pendingDeleteId) setSelectedStaffId(null);
=======
      if (selectedStaffId === pendingDeleteId) {
        setSelectedStaffId(null);
        setMobileDetailOpen(false);
      }
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
      setPendingDeleteId(null);
    } finally {
      setDeletingStaff(false);
    }
  };

<<<<<<< HEAD
  const staffStatusFor = (member: { totalCommission: number; totalServices: number }): StaffStatusKind => {
    if (member.totalCommission > 0) return 'earning';
    if (member.totalServices > 0) return 'active';
    return 'idle';
  };

=======
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
  const pendingDeleteMember = pendingDeleteId
    ? staff.find((s) => s.id === pendingDeleteId) || null
    : null;

  const editorRoleRate = roleCommissions.find((rc) => rc.role === formData.role)?.rate;

  const updateRoleRate = (role: string, rate: number) => {
    if (isLocked) return;
    const updated = roleCommissions.map(rc => rc.role === role ? { ...rc, rate } : rc);
    onUpdateRoleCommissions(updated);
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (newRoleName.trim() && !roleCommissions.find(rc => rc.role === newRoleName)) {
      onUpdateRoleCommissions([...roleCommissions, { role: newRoleName.trim(), rate: newRoleRate }]);
      setNewRoleName('');
      setNewRoleRate(0);
    }
  };

  const handleDeleteRole = (role: string) => {
    if (isLocked) return;
    const isAssigned = staff.some(s => s.role === role);
    if (isAssigned) {
      alert(`Cannot delete role "${role}" because it is currently assigned to one or more staff members.`);
      return;
    }
    onUpdateRoleCommissions(roleCommissions.filter(rc => rc.role !== role));
  };

  const periodControls = (
    <>
      <div className="flex p-1 bg-[var(--bg-soft)] rounded-xl overflow-x-auto">
        {(['month', 'year', 'all', 'custom'] as PerformancePeriod[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              period === p
                ? 'bg-[var(--bg-surface)] text-[var(--brand)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--line)] rounded-xl px-3 py-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs font-bold text-[var(--text-primary)] outline-none border-none bg-transparent"
          />
          <span className="text-[var(--text-muted)] font-bold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs font-bold text-[var(--text-primary)] outline-none border-none bg-transparent"
          />
        </div>
      )}
    </>
  );

  const activeRoleRate = activeStaff
    ? roleCommissions.find((rc) => rc.role === activeStaff.role)?.rate
    : null;

  const editorFieldClass =
    'w-full min-h-[44px] px-3 py-2.5 text-[13px] sm:text-sm bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-sm outline-none focus:ring-2 focus:ring-[var(--brand)] text-[var(--text-primary)] font-medium';
  const editorLabelClass =
    'block text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5';

  const chipClass = (active: boolean, tone: 'brand' | 'success' | 'neutral' = 'brand') => {
    if (!active) {
      return 'bg-[var(--bg-surface)] border-[var(--line)] text-[var(--text-secondary)]';
    }
    if (tone === 'success') return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (tone === 'neutral') return 'bg-slate-100 border-slate-200 text-slate-600';
    return 'bg-[var(--brand)] border-[var(--brand)] text-white';
  };

  return (
    <div className="space-y-4 xl:space-y-5 animate-fadeIn">
      {successMessage && (
        <div className="fixed top-16 lg:top-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 px-4 py-2.5 rounded-ui-md bg-[var(--brand)] text-white text-sm font-bold shadow-ui-lg animate-fadeIn">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

<<<<<<< HEAD
      <StaffPageHeader
        locked={isLocked}
        addDisabled={isLocked}
        ratesDisabled={isLocked}
        onOpenRoleRates={() => setShowCommissionModal(true)}
        onAddStaff={() => {
          setEditingMember(null);
          setFormData({ name: '', role: roleCommissions[0]?.role || '', email: '', phone: '', qualifiedServices: [] });
          setPhotoFile(null);
          setPhotoPreview(null);
          setUploadError(null);
          setServiceSearch('');
          setShowModal(true);
        }}
        periodControls={
          <>
            <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {(['month', 'year', 'all', 'custom'] as PerformancePeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${period === p ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-bold text-slate-700 outline-none border-none bg-transparent"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs font-bold text-slate-700 outline-none border-none bg-transparent"
                />
              </div>
            )}
          </>
        }
      />
=======
      <div className={mobileDetailOpen ? 'hidden xl:block' : undefined}>
        <StaffPageHeader
          locked={isLocked}
          addDisabled={isLocked}
          ratesDisabled={isLocked}
          onOpenRoleRates={() => setShowCommissionModal(true)}
          onAddStaff={() => {
            setEditingMember(null);
            setFormData(blankForm());
            setPhotoFile(null);
            setPhotoPreview(null);
            setUploadError(null);
            setServiceSearch('');
            setShowModal(true);
          }}
        />
      </div>

      <div className={mobileDetailOpen ? 'hidden xl:block' : undefined}>
        <StaffSummaryCards cards={summaryCards} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 xl:gap-5">
        <div className={`xl:col-span-5 ${mobileDetailOpen ? 'hidden xl:block' : ''}`}>
          <StaffRoster
            empty={paginatedStaff.length === 0}
            emptyTitle={staff.length === 0 ? 'No staff members registered.' : 'No staff match your filters.'}
            emptyDescription={
              staff.length === 0
                ? 'Add staff to track performance and commissions.'
                : 'Try adjusting search or filters.'
            }
            toolbar={
              <div className="space-y-3">
                <FilterToolbar
                  search={
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                        />
                      </svg>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search staff by name or role..."
                        className="w-full pl-9 pr-3 py-2.5 min-h-[44px] xl:min-h-[40px] bg-[var(--bg-surface)] xl:bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-md xl:rounded-ui-sm outline-none focus:ring-2 focus:ring-[var(--brand)] text-sm"
                      />
                    </div>
                  }
                  filters={
                    <div className="hidden xl:flex flex-wrap items-center gap-2">
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="min-h-[40px] px-3 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-primary)]"
                        aria-label="Filter by role"
                      >
                        <option value="all">All Roles</option>
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | StaffStatusKind)}
                        className="min-h-[40px] px-3 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-primary)]"
                        aria-label="Filter by status"
                      >
                        <option value="all">All Statuses</option>
                        <option value="earning">Earning</option>
                        <option value="active">Active</option>
                        <option value="idle">No sales</option>
                      </select>
                    </div>
                  }
                />

                {/* Mobile filter chips */}
                <div className="xl:hidden space-y-2">
                  <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
                    <button
                      type="button"
                      onClick={() => setRoleFilter('all')}
                      className={`shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-bold ${chipClass(roleFilter === 'all')}`}
                    >
                      All ({staff.length})
                    </button>
                    {roleOptions.map((role) => {
                      const count = staff.filter((s) => s.role === role).length;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setRoleFilter(role)}
                          className={`shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-bold ${chipClass(roleFilter === role)}`}
                        >
                          {role} ({count})
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
                    {(
                      [
                        { id: 'all', label: 'All', tone: 'brand' as const },
                        { id: 'earning', label: 'Earning', tone: 'success' as const },
                        { id: 'active', label: 'Active', tone: 'brand' as const },
                        { id: 'idle', label: 'No sales', tone: 'neutral' as const },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStatusFilter(s.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-bold ${chipClass(statusFilter === s.id, s.tone)}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            }
            footer={
              filteredStaff.length > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[var(--text-secondary)]">
                  <p className="font-semibold">
                    Showing {pageStart} to {pageEnd} of {filteredStaff.length} staff
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="min-w-[36px] h-9 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] disabled:opacity-40"
                      aria-label="Previous page"
                    >
                      ‹
                    </button>
                    <span className="font-bold tabular-nums px-1">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="min-w-[36px] h-9 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] disabled:opacity-40"
                      aria-label="Next page"
                    >
                      ›
                    </button>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-9 px-2 rounded-ui-sm border border-[var(--line)] bg-[var(--bg-surface)] text-xs font-bold"
                      aria-label="Rows per page"
                    >
                      <option value={8}>8 / page</option>
                      <option value={25}>25 / page</option>
                      <option value={50}>50 / page</option>
                    </select>
                  </div>
                </div>
              ) : null
            }
          >
            {paginatedStaff.map((member) => {
              const qs = member.qualifiedServices ?? [];
              const names = qs
                .map((id) => services.find((s) => s.id === id)?.name)
                .filter((n): n is string => Boolean(n));
              const specialty =
                names.length === 0
                  ? `${member.totalServices} services this period`
                  : names.length <= 2
                    ? names.join(', ')
                    : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
              return (
                <StaffCard
                  key={member.id}
                  name={member.name}
                  role={member.role}
                  photoUrl={member.profilePicture}
                  status={staffStatusFor(member)}
                  metaSecondary={specialty}
                  shiftLabel={formatShiftLabel(member.weeklyHours)}
                  revenueLabel={`$${member.totalRevenue.toLocaleString()}`}
                  commissionLabel={`$${member.totalCommission.toLocaleString()}`}
                  selected={selectedStaffId === member.id}
                  onSelect={() => {
                    setSelectedStaffId(member.id);
                    setDetailTab('overview');
                    setMobileDetailOpen(true);
                  }}
                />
              );
            })}
          </StaffRoster>
        </div>

        <div className={`xl:col-span-7 ${mobileDetailOpen ? '' : 'hidden xl:block'}`}>
          <StaffDetailPanel
            member={
              activeStaff
                ? {
                    id: activeStaff.id,
                    name: activeStaff.name,
                    role: activeStaff.role,
                    email: activeStaff.email,
                    phone: activeStaff.phone,
                    createdAt: activeStaff.createdAt,
                    profilePicture: activeStaff.profilePicture,
                    qualifiedServices: activeStaff.qualifiedServices,
                    totalServices: activeStaff.totalServices,
                    totalRevenue: activeStaff.totalRevenue,
                    totalCommission: activeStaff.totalCommission,
                    history: activeStaff.history,
                    status: staffStatusFor(activeStaff),
                    weeklyHours: activeStaff.weeklyHours,
                    permissions: normalizeStaffPermissions(
                      activeStaff.permissions,
                      activeStaff.role,
                    ),
                  }
                : null
            }
            tab={detailTab}
            onTabChange={setDetailTab}
            serviceNames={activeServiceNames}
            roleRatePercent={typeof activeRoleRate === 'number' ? activeRoleRate : null}
            periodControls={periodControls}
            locked={isLocked}
            onBack={() => setMobileDetailOpen(false)}
            onEdit={activeStaff ? () => handleEdit(activeStaff) : undefined}
            onDelete={activeStaff ? () => requestDelete(activeStaff.id) : undefined}
            onManageRates={() => setShowCommissionModal(true)}
          />
        </div>
      </div>
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

      <StaffEditor
        open={showModal}
        title={editingMember ? 'Edit Staff' : 'Add New Staff'}
        onClose={handleRequestClose}
        onSubmit={handleSubmit}
        saving={uploadLoading}
        saveLabel={editingMember ? 'Save Changes' : 'Add Staff'}
        saveStatus={uploadLoading ? 'saving' : uploadError ? 'failed' : 'idle'}
      >
        <StaffProfileSection
          photoSlot={
            editingMember ? (
              <div className="flex items-center gap-3 pb-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full overflow-hidden w-14 h-14 border border-[var(--line)] hover:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] bg-[var(--bg-soft)] flex items-center justify-center shrink-0"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-7 h-7 text-[var(--text-muted)] inline-flex items-center justify-center">
                      <Icons.Staff />
                    </span>
                  )}
                </button>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm font-semibold text-[var(--brand)] hover:underline"
                  >
                    Change photo
                  </button>
                  {uploadLoading ? (
                    <p className="text-xs font-semibold text-[var(--brand)] mt-0.5">Uploading…</p>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">JPEG or PNG, max 2 MB</p>
                  )}
                </div>
              </div>
<<<<<<< HEAD
            ))}
          </div>

          {/* Desktop: original grid cards */}
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {topPerformingStaff.map((member, index) => (
              <div
                key={member.id}
                onClick={() => setSelectedStaffId(member.id)}
                className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:border-teal-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white flex items-center justify-center font-black text-lg shadow-lg overflow-hidden">
                      {member.profilePicture ? (
                        <img src={member.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    {index < 3 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-black shadow-lg">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{member.name}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{member.role}</p>
                  </div>
                </div>
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-slate-400">Commission</span>
                    <span className="text-lg font-black text-teal-600">${member.totalCommission.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">{member.totalServices} services</span>
                    <span className="text-slate-400 font-bold">${member.totalRevenue.toLocaleString()} revenue</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Staff List Sidebar */}
        <div className="xl:col-span-1">
          <StaffRoster empty={staffStats.length === 0}>
            {staffStats.map((member) => (
              <StaffCard
                key={member.id}
                name={member.name}
                role={member.role}
                photoUrl={member.profilePicture}
                status={staffStatusFor(member)}
                contextLabel={`${member.totalServices} services · $${member.totalCommission.toLocaleString()}`}
                selected={selectedStaffId === member.id}
                onSelect={() => setSelectedStaffId(member.id)}
                actionsDisabled={isLocked}
                onEdit={() => handleEdit(member)}
                onDelete={() => requestDelete(member.id)}
              />
            ))}
          </StaffRoster>
        </div>

        {/* Staff Performance Details */}
        <div className="xl:col-span-3">
          {activeStaff ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-4 sm:p-8 border-b border-slate-100 bg-slate-50/50 space-y-5">
                 <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                       <div className="w-16 h-16 sm:w-24 sm:h-24 bg-teal-100 text-teal-700 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-4xl font-black border-4 border-white shadow-xl overflow-hidden flex-shrink-0">
                         {activeStaff.profilePicture ? (
                           <img src={activeStaff.profilePicture} alt="" className="w-full h-full object-cover" />
                         ) : (
                           activeStaff.name.charAt(0)
                         )}
                       </div>
                       <div className="min-w-0">
                         <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight truncate">{activeStaff.name}</h3>
                         <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mt-1.5">
                           <span className="self-start px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase rounded-full tracking-wider">{activeStaff.role}</span>
                           {(activeStaff.email || activeStaff.phone) && (
                             <span className="text-slate-400 text-xs font-medium truncate">
                               {[activeStaff.email, activeStaff.phone].filter(Boolean).join(' • ')}
                             </span>
                           )}
                         </div>
                       </div>
                    </div>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleEdit(activeStaff)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 min-h-[44px] rounded-xl bg-teal-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 active:scale-95 transition-all"
                      >
                        <Icons.Edit /> <span className="hidden sm:inline">Edit Staff</span><span className="sm:hidden">Edit</span>
                      </button>
                    )}
                 </div>
                 <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
                       <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Rev.</p>
                       <p className="text-base sm:text-xl font-black text-slate-800 tabular-nums">${activeStaff.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-teal-600 p-3 sm:p-4 rounded-2xl shadow-lg shadow-teal-100">
                       <p className="text-[9px] sm:text-[10px] font-black uppercase text-teal-100 tracking-widest mb-1">Commission</p>
                       <p className="text-base sm:text-xl font-black text-white tabular-nums">${activeStaff.totalCommission.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
                       <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Services</p>
                       <p className="text-base sm:text-xl font-black text-slate-800 tabular-nums">{activeStaff.totalServices}</p>
                    </div>
                 </div>
              </div>

              <div className="flex-1 p-4 sm:p-8">
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-3">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                     <span className="w-4 h-px bg-slate-200"></span> Service History Breakdown
                   </h4>
                   <p className="text-[10px] text-slate-400 leading-relaxed">
                     <span className="font-black uppercase tracking-widest mr-1">Fixed</span>
                     = product commission using a fixed dollar amount. Other rows use role percentage on services.
                   </p>
                 </div>

                 {/* Mobile: card list (no cramped table) */}
                 <div className="sm:hidden space-y-2">
                    {activeStaff.history.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-700 leading-snug">{item.name}</p>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{new Date(item.date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-teal-600 tabular-nums">${item.commissionEarned?.toFixed(2)}</p>
                            <p className="text-[11px] text-slate-400 font-bold tabular-nums">Price ${item.price}</p>
                          </div>
                        </div>
                        {item.type === 'product' && item.commissionEarned ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 mt-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                            Fixed
                          </span>
                        ) : null}
                      </div>
                    ))}
                    {activeStaff.history.length === 0 && (
                      <div className="py-12 text-center">
                        <p className="text-sm font-semibold text-slate-400">No service history yet.</p>
                        <p className="text-xs text-slate-300 mt-1">No service activity in this period.</p>
                      </div>
                    )}
                 </div>

                 {/* Desktop: table */}
                 <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <th className="pb-4">Date</th>
                          <th className="pb-4">Treatment</th>
                          <th className="pb-4 text-right">Price</th>
                          <th className="pb-4 text-right">Commission Earned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {activeStaff.history.map((item, idx) => (
                          <tr key={idx} className="group">
                            <td className="py-4 text-xs font-bold text-slate-500">
                              {new Date(item.date).toLocaleDateString()}
                            </td>
                            <td className="py-4 text-sm font-bold text-slate-700">{item.name}</td>
                            <td className="py-4 text-sm font-bold text-slate-500 text-right">${item.price}</td>
                            <td className="py-4 text-sm font-black text-teal-600 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span>${item.commissionEarned?.toFixed(2)}</span>
                                {item.type === 'product' && item.commissionEarned ? (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Fixed
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {activeStaff.history.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-slate-400 italic text-sm">No service activity in this period.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                 </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-20 flex flex-col items-center justify-center text-center h-full min-h-[500px]">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                 <Icons.Staff />
               </div>
               <h3 className="text-xl font-bold text-slate-400">Select a Staff Member</h3>
               <p className="text-sm text-slate-300 mt-1">Review performance metrics and commission logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Staff Editor — full-screen on mobile, centered on desktop */}
      <StaffEditor
        open={showModal}
        title={editingMember ? 'Edit Staff' : 'Add New Staff'}
        tone={editingMember ? 'edit' : 'create'}
        onClose={handleRequestClose}
        onSubmit={handleSubmit}
        saving={uploadLoading}
        saveLabel={editingMember ? 'Save Changes' : 'Add Staff'}
        saveStatus={uploadLoading ? 'saving' : uploadError ? 'failed' : 'idle'}
      >
        <StaffProfileSection
          photoSlot={
            editingMember ? (
              <div className="flex flex-col items-center gap-2 pb-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full overflow-hidden w-24 h-24 border-2 border-slate-200 hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 flex items-center justify-center"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-12 h-12 text-slate-300 inline-flex items-center justify-center">
                      <Icons.Staff />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-semibold text-teal-600 hover:text-teal-700"
                >
                  Change Photo
                </button>
                {uploadLoading ? (
                  <p className="text-xs font-semibold text-teal-600">Uploading photo…</p>
                ) : null}
              </div>
=======
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
            ) : undefined
          }
        >
          <div>
<<<<<<< HEAD
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Full Name</label>
            <input
              required
              type="text"
              className="w-full p-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-base font-medium"
=======
            <label className={editorLabelClass}>Full name</label>
            <input
              required
              type="text"
              className={editorFieldClass}
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
              value={formData.name ?? ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
<<<<<<< HEAD

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Assigned Role</label>
            <select
              required
              className="w-full p-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-base font-medium"
              value={formData.role ?? ''}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="" disabled>-- Select Role --</option>
              {roleCommissions.map((rc) => (
                <option key={rc.role} value={rc.role}>{rc.role}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Email</label>
              <input
                type="email"
                className="w-full p-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-base font-medium"
=======
        </StaffProfileSection>

        <StaffEditorSection title="Role" description="Assign a commission role for this staff member.">
          <div>
            <label className={editorLabelClass}>Assigned role</label>
            <select
              required
              className={editorFieldClass}
              value={formData.role ?? ''}
              onChange={(e) => {
                const role = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  role,
                  permissions: editingMember ? prev.permissions : defaultStaffPermissions(role),
                }));
              }}
            >
              <option value="" disabled>
                -- Select role --
              </option>
              {roleCommissions.map((rc) => (
                <option key={rc.role} value={rc.role}>
                  {rc.role}
                </option>
              ))}
            </select>
          </div>
        </StaffEditorSection>

        <StaffEditorSection title="Contact details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={editorLabelClass}>Email</label>
              <input
                type="email"
                className={editorFieldClass}
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
                value={formData.email ?? ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
<<<<<<< HEAD
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Phone</label>
              <input
                type="tel"
                className="w-full p-4 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-base font-medium"
=======
              <label className={editorLabelClass}>Phone</label>
              <input
                type="tel"
                className={editorFieldClass}
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
                value={formData.phone ?? ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
<<<<<<< HEAD
        </StaffProfileSection>
=======
        </StaffEditorSection>
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda

        <StaffServicesSection
          selectedCount={qualifiedCount}
          toolbar={
            <div className="space-y-2">
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={selectAllQualified}
<<<<<<< HEAD
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-teal-600 hover:bg-teal-50"
=======
                  className="px-2.5 py-1.5 rounded-ui-sm text-[11px] font-bold text-[var(--brand)] hover:bg-[var(--brand-soft)]"
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearAllQualified}
<<<<<<< HEAD
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:bg-slate-50"
=======
                  className="px-2.5 py-1.5 rounded-ui-sm text-[11px] font-bold text-[var(--text-muted)] hover:bg-[var(--bg-soft)]"
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
                >
                  Clear all
                </button>
              </div>
              <div className="relative">
<<<<<<< HEAD
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
=======
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
                </svg>
                <input
                  type="text"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  placeholder="Search services..."
<<<<<<< HEAD
                  className="w-full pl-9 pr-3 py-2.5 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm"
=======
                  className={`${editorFieldClass} pl-9`}
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
                />
              </div>
            </div>
          }
        >
<<<<<<< HEAD
          <div className="mt-1 space-y-3 sm:max-h-64 sm:overflow-y-auto">
            {(Object.entries(filteredServicesByCategory) as [string, Service[]][]).map(([cat, list]) => (
              <div key={cat}>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  {cat}
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {list.map((s) => {
                    const assigned = (formData.qualifiedServices ?? []).includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-3 min-h-[44px] rounded-lg cursor-pointer transition-colors ${assigned ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={assigned}
                          onChange={() => toggleQualifiedService(s.id)}
                          className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="flex-1 text-sm text-slate-700 truncate">{s.name}</span>
                        {typeof s.duration === 'number' && s.duration > 0 && (
                          <span className="text-[11px] text-slate-400 font-medium flex-shrink-0">{s.duration} min</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {Object.keys(filteredServicesByCategory).length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">
                {services.length === 0 ? 'No services available yet.' : 'No services match your search.'}
              </p>
            )}
          </div>
        </StaffServicesSection>

        <StaffScheduleSection />

        <StaffPermissionSection roleLabel={formData.role || ''} />

        <StaffCommissionSection
          roleLabel={formData.role || ''}
          ratePercent={typeof editorRoleRate === 'number' ? editorRoleRate : null}
          manageDisabled={isLocked}
          onManageRates={() => {
            setShowCommissionModal(true);
          }}
        />

        {uploadError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2 mt-3">{uploadError}</p>
        )}
      </StaffEditor>

      <ConfirmationDialog
        open={Boolean(pendingDeleteId)}
        onClose={() => {
          if (!deletingStaff) setPendingDeleteId(null);
        }}
        onConfirm={confirmDelete}
        tone="danger"
        busy={deletingStaff}
        title="Remove staff member?"
        confirmLabel="Remove"
        description={
          pendingDeleteMember
            ? `Remove ${pendingDeleteMember.name} from the active roster? Their historical performance will remain in financial records, but they will be removed from active service lists.`
            : 'Their historical performance will remain in financial records, but they will be removed from active service lists.'
        }
      />

      {/* Role Commission Rates Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scaleIn overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-800 text-white">
              <h3 className="text-lg font-bold">Role & Commission Settings</h3>
              <button onClick={() => setShowCommissionModal(false)} className="hover:rotate-90 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
              {/* Add New Role Section */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Create New Role</h4>
                <form onSubmit={handleAddRole} className="flex flex-col md:flex-row gap-4">
                  <input 
                    type="text" 
                    placeholder="Role Name (e.g. Master)"
                    className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Rate %"
                      className="w-24 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-bold"
                      value={newRoleRate || ''}
                      onChange={e => setNewRoleRate(parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm font-bold text-slate-400">%</span>
                  </div>
                  <button 
                    type="submit"
                    className="px-6 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Roles List */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Existing Role Incentives</h4>
                {roleCommissions.map((rc) => (
                  <div key={rc.role} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm group">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{rc.role}</span>
                      <span className="text-[10px] font-black uppercase text-slate-400">Commission Rate</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-teal-600 outline-none focus:ring-2 focus:ring-teal-500"
                          value={rc.rate}
                          onChange={(e) => updateRoleRate(rc.role, parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-sm font-bold text-slate-400">%</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteRole(rc.role)}
                        className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                ))}
                {roleCommissions.length === 0 && (
                  <p className="text-center py-8 text-slate-400 italic text-sm">No roles defined. Please add one above.</p>
                )}
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                <div className="text-amber-500 shrink-0"><Icons.Settings /></div>
                <p className="text-[10px] text-amber-700 font-medium leading-relaxed italic">
                  Note: Commission rates are applied only to services marked as "Commissionable" in the Menu.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
               <button 
                onClick={() => setShowCommissionModal(false)}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                Close Settings
              </button>
            </div>
=======
          <div className="mt-1 space-y-3 max-h-48 sm:max-h-56 overflow-y-auto">
            {(Object.entries(filteredServicesByCategory) as [string, Service[]][]).map(
              ([cat, list]) => (
                <div key={cat}>
                  <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                    {cat}
                  </p>
                  <div className="grid grid-cols-1 gap-0.5">
                    {list.map((s) => {
                      const assigned = (formData.qualifiedServices ?? []).includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 px-3 min-h-[44px] rounded-ui-sm cursor-pointer transition-colors ${
                            assigned ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--bg-soft)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={assigned}
                            onChange={() => toggleQualifiedService(s.id)}
                            className="w-4 h-4 rounded border-[var(--line)] text-[var(--brand)] focus:ring-[var(--brand)]"
                          />
                          <span className="flex-1 text-sm text-[var(--text-primary)] truncate">
                            {s.name}
                          </span>
                          {typeof s.duration === 'number' && s.duration > 0 && (
                            <span className="text-[11px] text-[var(--text-muted)] font-medium shrink-0">
                              {s.duration} min
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
            {Object.keys(filteredServicesByCategory).length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--text-muted)]">
                {services.length === 0
                  ? 'No services available yet.'
                  : 'No services match your search.'}
              </p>
            )}
>>>>>>> 27312fa3951009f3285eb2f65a1e2fd20d5a8dda
          </div>
        </StaffServicesSection>

        <StaffScheduleSection
          weeklyHours={formData.weeklyHours}
          onChange={(weeklyHours) => setFormData((prev) => ({ ...prev, weeklyHours }))}
        />

        <StaffPermissionSection
          roleLabel={formData.role || ''}
          permissions={formData.permissions}
          onChange={(permissions) => setFormData((prev) => ({ ...prev, permissions }))}
        />

        <StaffCommissionSection
          roleLabel={formData.role || ''}
          ratePercent={typeof editorRoleRate === 'number' ? editorRoleRate : null}
          manageDisabled={isLocked}
          onManageRates={() => {
            setShowCommissionModal(true);
          }}
        />

        {uploadError ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-ui-sm px-3 py-2 mt-2">
            {uploadError}
          </p>
        ) : null}
      </StaffEditor>

      <ConfirmationDialog
        open={Boolean(pendingDeleteId)}
        onClose={() => {
          if (!deletingStaff) setPendingDeleteId(null);
        }}
        onConfirm={confirmDelete}
        tone="danger"
        busy={deletingStaff}
        title="Remove staff member?"
        confirmLabel="Remove"
        description={
          pendingDeleteMember
            ? `Remove ${pendingDeleteMember.name} from the active roster? Their historical performance will remain in financial records, but they will be removed from active service lists.`
            : 'Their historical performance will remain in financial records, but they will be removed from active service lists.'
        }
      />

      <StaffRolesModal
        open={showCommissionModal}
        onClose={() => setShowCommissionModal(false)}
        roleCommissions={roleCommissions}
        onAddRole={handleAddRole}
        onUpdateRate={updateRoleRate}
        onDeleteRole={handleDeleteRole}
        newRoleName={newRoleName}
        newRoleRate={newRoleRate}
        onNewRoleNameChange={setNewRoleName}
        onNewRoleRateChange={setNewRoleRate}
        locked={isLocked}
      />
    </div>
  );
};

export default StaffPage;
