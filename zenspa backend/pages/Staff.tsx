import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Staff, Transaction, TransactionType, RoleCommission, Service } from '../types';
import { Icons } from '../constants';

const MAX_PHOTO_SIZE_MB = 2;
const MAX_PHOTO_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

interface StaffProps {
  staff: Staff[];
  services: Service[];
  roleCommissions: RoleCommission[];
  onUpdateRoleCommissions: (updated: RoleCommission[]) => void;
  onAddStaff: (member: Omit<Staff, 'id'>) => Promise<void>;
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
    qualifiedServices: []
  });

  // Staff photo upload (Edit Profile modal)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Top Performing Staff - ranked by commission
  const topPerformingStaff = useMemo(() => {
    return [...staffStats]
      .filter(member => member.totalCommission > 0)
      .sort((a, b) => b.totalCommission - a.totalCommission)
      .slice(0, 10); // Top 10
  }, [staffStats]);

  const activeStaff = staffStats.find(s => s.id === selectedStaffId) || null;

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

  const toggleSelectAllQualified = () => {
    const current = formData.qualifiedServices ?? [];
    const isAll = current.length >= allServiceIds.length && allServiceIds.length > 0;
    setFormData({
      ...formData,
      qualifiedServices: isAll ? [] : [...allServiceIds],
    });
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
          const path = `staff_photos/${staffId}_${Date.now()}.jpg`;
          const storageRef = ref(storage, path);
          try {
            const snapshot = await uploadBytes(storageRef, photoFile, {
              contentType: 'image/jpeg',
            });
            profilePictureUrl = await getDownloadURL(snapshot.ref);
          } catch (storageErr: unknown) {
            const code = storageErr && typeof (storageErr as { code?: string }).code === 'string' ? (storageErr as { code: string }).code : '';
            const isPermissionDenied = code === 'storage/unauthorized' || code === 'storage/canceled' || (storageErr as Error).message?.toLowerCase().includes('permission');
            setUploadError(isPermissionDenied ? 'Permission denied. Please check Firebase Storage Rules.' : (storageErr instanceof Error ? storageErr.message : 'Photo upload failed.'));
            setUploadLoading(false);
            return;
          }
        }

        const updatedMember: Staff = {
          ...editingMember,
          ...formData,
          qualifiedServices: formData.qualifiedServices ?? editingMember.qualifiedServices ?? [],
        } as Staff;

        if (profilePictureUrl) {
          updatedMember.profilePicture = profilePictureUrl;
          updatedMember.photoURL = profilePictureUrl;
        }

        await onUpdateStaff(updatedMember);
        handleCloseModal();
      } else {
        await onAddStaff({
          name: formData.name || '',
          role: formData.role || roleCommissions[0]?.role || 'Staff',
          email: formData.email || '',
          phone: formData.phone || '',
          createdAt: new Date().toISOString(),
          qualifiedServices: formData.qualifiedServices ?? [],
        });
        handleCloseModal();
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
    setFormData(member);
    setPhotoFile(null);
    setPhotoPreview(member.profilePicture || null);
    setUploadError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMember(null);
    setFormData({ name: '', role: roleCommissions[0]?.role || '', email: '', phone: '', qualifiedServices: [] });
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadError(null);
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
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

  const handleDelete = async (id: string) => {
    if (isLocked) return;
    if (window.confirm("Are you sure you want to remove this staff member? Their historical performance will remain in financial records, but they will be removed from active service lists.")) {
      await onDeleteStaff(id);
      if (selectedStaffId === id) setSelectedStaffId(null);
    }
  };

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

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-app-page sm:text-app-page-lg font-bold tracking-tight text-slate-900 leading-tight">Staff & Commissions</h2>
          <p className="text-slate-500 text-sm font-medium">Review metrics and manage your wellness team</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            {(['month', 'year', 'all', 'custom'] as PerformancePeriod[]).map((p) => (
              <button 
                key={p} 
                onClick={() => setPeriod(p)} 
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${period === p ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
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
          <button 
            disabled={isLocked}
            onClick={() => setShowCommissionModal(true)}
            className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all border shadow-sm ${isLocked ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95'}`}
          >
            {isLocked ? <Icons.Lock /> : <Icons.Settings />} Role Rates
          </button>
          <button 
            disabled={isLocked}
            onClick={() => { 
              setEditingMember(null); 
              setFormData({ name: '', role: roleCommissions[0]?.role || '', email: '', phone: '' }); 
              setPhotoFile(null);
              setPhotoPreview(null);
              setUploadError(null);
              setShowModal(true); 
            }}
            className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg ${isLocked ? 'bg-slate-50 text-slate-300 shadow-none cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95 shadow-teal-100'}`}
          >
            {isLocked ? <Icons.Lock /> : <Icons.Add />} Add Staff
          </button>
        </div>
      </div>

      {/* Top Performing Staff Section */}
      {topPerformingStaff.length > 0 && (
        <div className="bg-gradient-to-br from-teal-50 to-slate-50 rounded-2xl border border-teal-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Top Performing Staff
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Ranked by total commission earned in selected period
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
        <div className="xl:col-span-1 space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
          {staffStats.map(member => (
            <div 
              key={member.id}
              onClick={() => setSelectedStaffId(member.id)}
              className={`p-4 rounded-2xl border cursor-pointer relative transition-all group ${
                selectedStaffId === member.id 
                  ? 'bg-teal-600 text-white shadow-xl translate-x-1' 
                  : 'bg-white border-slate-200 text-slate-700 hover:border-teal-300'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden ${selectedStaffId === member.id ? 'bg-white/20' : 'bg-teal-50 text-teal-600'}`}>
                    {member.profilePicture ? (
                      <img src={member.profilePicture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold truncate text-sm leading-tight">{member.name}</p>
                    <p className={`text-[9px] uppercase font-black tracking-tighter opacity-70`}>{member.role}</p>
                  </div>
                </div>
                {!isLocked && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(member); }} 
                      className={`p-1.5 rounded-lg hover:bg-black/5 ${selectedStaffId === member.id ? 'text-white' : 'text-slate-400'}`}
                    >
                      <Icons.Edit />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(member.id); }} 
                      className={`p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-500 ${selectedStaffId === member.id ? 'text-white' : 'text-slate-400'}`}
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                )}
              </div>
              <div className={`mt-4 pt-4 border-t flex justify-between items-end ${selectedStaffId === member.id ? 'border-white/10' : 'border-slate-50'}`}>
                 <div className="flex flex-col">
                   <span className="text-[8px] font-black uppercase opacity-60">Services</span>
                   <span className="text-xs font-bold">{member.totalServices}</span>
                 </div>
                 <div className="text-right">
                   <span className="text-[8px] font-black uppercase opacity-60">Earnings</span>
                   <span className="text-xs font-black block">${member.totalCommission.toLocaleString()}</span>
                 </div>
              </div>
            </div>
          ))}
          {staffStats.length === 0 && (
            <div className="p-8 text-center text-slate-400 italic text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No staff members registered.
            </div>
          )}
        </div>

        {/* Staff Performance Details */}
        <div className="xl:col-span-3">
          {activeStaff ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-teal-100 text-teal-700 rounded-3xl flex items-center justify-center text-4xl font-black border-4 border-white shadow-xl">
                      {activeStaff.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 leading-tight">{activeStaff.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase rounded-full tracking-wider">{activeStaff.role}</span>
                        <span className="text-slate-400 text-xs font-medium">{activeStaff.email} • {activeStaff.phone}</span>
                      </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Rev.</p>
                       <p className="text-xl font-black text-slate-800">${activeStaff.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-teal-600 p-4 rounded-2xl shadow-lg shadow-teal-100">
                       <p className="text-[10px] font-black uppercase text-teal-100 tracking-widest mb-1">Commission</p>
                       <p className="text-xl font-black text-white">${activeStaff.totalCommission.toLocaleString()}</p>
                    </div>
                 </div>
              </div>

              <div className="flex-1 p-8">
                 <div className="flex items-center justify-between mb-3">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                     <span className="w-4 h-px bg-slate-200"></span> Service History Breakdown
                   </h4>
                   <p className="text-[10px] text-slate-400">
                     <span className="font-black uppercase tracking-widest mr-1">Fixed</span>
                     = product commission using a fixed dollar amount. Other rows use role percentage on services.
                   </p>
                 </div>
                 <div className="overflow-x-auto">
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

      {/* Add/Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scaleIn overflow-hidden">
            <div className={`p-6 border-b border-slate-100 flex justify-between items-center text-white ${editingMember ? 'bg-amber-600' : 'bg-teal-600'}`}>
              <h3 className="text-lg font-bold">{editingMember ? 'Edit Profile' : 'Add New Staff'}</h3>
              <button type="button" onClick={handleCloseModal} className="hover:rotate-90 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {editingMember && (
                <div className="flex flex-col items-center gap-3 pb-2">
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
                      <Icons.Staff className="w-12 h-12 text-slate-300" />
                    )}
                  </button>
                  <span className="text-sm font-medium text-slate-500">Change Photo</span>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Full Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Assigned Role</label>
                <select 
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="" disabled>-- Select Role --</option>
                  {roleCommissions.map(rc => (
                    <option key={rc.role} value={rc.role}>{rc.role}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Email</label>
                  <input 
                    type="email" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Phone</label>
                  <input 
                    type="tel" 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                      Qualified Services
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Select which treatments this staff member is trained to perform.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSelectAllQualified}
                    className="text-[11px] font-semibold text-teal-600 hover:text-teal-700"
                  >
                    {(formData.qualifiedServices ?? []).length >= allServiceIds.length && allServiceIds.length > 0
                      ? 'Clear all'
                      : 'Select all'}
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto mt-2 space-y-3">
                  {Object.entries(servicesByCategory).map(([cat, list]) => (
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
                              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={assigned}
                                onChange={() => toggleQualifiedService(s.id)}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span className="text-xs text-slate-700 truncate">
                                {s.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {uploadError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{uploadError}</p>
              )}
              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className={`flex-[2] py-4 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 min-h-[52px] ${editingMember ? 'bg-amber-600 shadow-amber-100' : 'bg-teal-600 shadow-teal-100'} disabled:opacity-70 disabled:cursor-not-allowed`}
                >
                  {uploadLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Updating…
                    </>
                  ) : editingMember ? (
                    'Update Profile'
                  ) : (
                    'Register Member'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Commission Rates Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPage;
