
import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Service, Product, Package, Client, Transaction, TransactionType, CartItem, Staff, RoleCommission, Appointment, OutletSettings } from '../types';
import { Icons } from '../constants';
import ReceiptTemplate from '../components/ReceiptTemplate';

export interface SelectedMemberFromRoute {
  id: string;
  name: string;
  phone?: string;
}

interface POSProps {
  services: Service[];
  products: Product[];
  packages: Package[];
  clients: Client[];
  staff: Staff[];
  roleCommissions: RoleCommission[];
  onCompleteSale: (txn: Transaction) => Promise<void>;
  activeAppointmentForSale?: Appointment | null;
  onClearActiveAppointment?: () => void;
  paymentMethods: string[];
  outletSettings: OutletSettings;
}

const POS: React.FC<POSProps> = ({ 
  services, 
  products, 
  packages,
  clients, 
  staff, 
  roleCommissions, 
  onCompleteSale,
  activeAppointmentForSale,
  onClearActiveAppointment,
  paymentMethods,
  outletSettings
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(paymentMethods[0] || '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [posCategory, setPosCategory] = useState<string>('All');
  const [posSortBy, setPosSortBy] = useState<'a-z' | 'z-a' | 'price-low' | 'price-high'>('a-z');
  const [activeCatalog, setActiveCatalog] = useState<'all' | 'services' | 'products' | 'packages'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quickPOSMemberName, setQuickPOSMemberName] = useState<string | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerDropdownRect, setCustomerDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const customerInputRef = React.useRef<HTMLInputElement>(null);
  const customerDropdownRef = React.useRef<HTMLDivElement>(null);
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<{
    items: CartItem[];
    total: number;
    date: string;
    customerName: string;
    paymentMethod: string;
  } | null>(null);

  // Apply selectedMember from Quick POS or voucher redemption (Member Details → /pos with state)
  const [isVoucherRedemptionMode, setIsVoucherRedemptionMode] = useState(false);
  // Optional override for sale date/time (default is currentTime when not set)
  const [useCustomDateTime, setUseCustomDateTime] = useState(false);
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');
  useEffect(() => {
    const state = location.state as { selectedMember?: SelectedMemberFromRoute; redeemVoucher?: boolean } | null;
    if (state?.selectedMember?.id) {
      setSelectedClient(state.selectedMember.id);
      setQuickPOSMemberName(state.selectedMember.name || null);
      if (state.redeemVoucher) setIsVoucherRedemptionMode(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // When user turns on custom date/time, prefill with current clock values for convenience
  useEffect(() => {
    if (!useCustomDateTime) return;
    if (customDate) return;
    const d = currentTime;
    const dateStr = d.toISOString().slice(0, 10);
    const timeStr = d.toTimeString().slice(0, 5); // HH:mm
    setCustomDate(dateStr);
    setCustomTime(timeStr);
  }, [useCustomDateTime, customDate, currentTime]);

  useEffect(() => {
    if (activeAppointmentForSale && onClearActiveAppointment) {
      const service = services.find(s => s.id === activeAppointmentForSale.serviceId);
      const assignedStaff = staff.find(s => s.id === activeAppointmentForSale.staffId);
      
      if (service) {
        const roleRate = roleCommissions.find(rc => rc.role === assignedStaff?.role)?.rate || 0;
        const commission = (assignedStaff && service.isCommissionable) ? (service.price * (roleRate / 100)) : 0;
        const newItem: CartItem = { id: service.id, cartItemId: crypto.randomUUID(), name: service.name, price: service.price, quantity: 1, type: 'service', points: service.points, staffId: activeAppointmentForSale.staffId, commissionEarned: commission };
        setCart([newItem]);
        setSelectedClient(activeAppointmentForSale.clientId === 'guest' ? '' : activeAppointmentForSale.clientId);
      }
      onClearActiveAppointment();
    }
  }, [activeAppointmentForSale, services, staff, roleCommissions, onClearActiveAppointment]);

  // When voucher redemption mode is activated from Member Details, auto-add 1 default voucher service to the cart if empty.
  // Default voucher service is derived from the first configured package's first service; if none, fall back to the first service.
  useEffect(() => {
    if (!isVoucherRedemptionMode) return;
    if (cart.length > 0) return;

    let defaultService: Service | undefined;
    const pkgWithServices = packages.find((pk) => pk.services && pk.services.length > 0);
    if (pkgWithServices) {
      const primaryServiceId = pkgWithServices.services[0].serviceId;
      defaultService = services.find((s) => s.id === primaryServiceId);
    }
    if (!defaultService && services.length > 0) {
      defaultService = services[0];
    }
    if (!defaultService) return;

    const newItem: CartItem = {
      id: defaultService.id,
      cartItemId: crypto.randomUUID(),
      name: defaultService.name,
      price: 0,
      quantity: 1,
      type: 'service',
      points: defaultService.points,
      redeemedWithPoints: false,
      redeemPointsEnabled: !!defaultService.redeemPointsEnabled && !!defaultService.redeemPoints,
      redeemPoints: defaultService.redeemPoints,
      voucherRedemption: true,
      originalPrice: defaultService.price,
    };
    setCart([newItem]);
  }, [isVoucherRedemptionMode, cart, packages, services]);

  const posCategories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      const cat = s.category || s.categoryId;
      if (cat) set.add(cat);
    });
    products.forEach((p) => p.category && set.add(p.category));
    packages.forEach((p) => p.category && set.add(p.category));
    return ['All', ...Array.from(set).sort()];
  }, [services, products, packages]);

  const sortCatalog = <T extends { name: string; price: number }>(list: T[], sort: string): T[] => {
    const sorted = [...list];
    if (sort === 'a-z') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'z-a') sorted.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === 'price-low') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-high') sorted.sort((a, b) => b.price - a.price);
    return sorted;
  };

  const filteredServices = useMemo(() => {
    let list = services.filter((s) => {
      const cat = s.category || s.categoryId || '';
      const matchCategory = posCategory === 'All' || cat === posCategory;
      const matchSearch =
        !globalSearch.trim() ||
        s.name.toLowerCase().includes(globalSearch.toLowerCase());
      return matchCategory && matchSearch;
    });
    return sortCatalog(list, posSortBy);
  }, [services, posCategory, globalSearch, posSortBy]);
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchCategory = posCategory === 'All' || p.category === posCategory;
      const matchSearch = !globalSearch.trim() || p.name.toLowerCase().includes(globalSearch.toLowerCase());
      return matchCategory && matchSearch;
    });
    return sortCatalog(list, posSortBy);
  }, [products, posCategory, globalSearch, posSortBy]);
  const filteredPackages = useMemo(() => {
    let list = packages.filter((pk) => {
      const matchCategory = posCategory === 'All' || pk.category === posCategory;
      const matchSearch = !globalSearch.trim() || pk.name.toLowerCase().includes(globalSearch.toLowerCase());
      return matchCategory && matchSearch;
    });
    return sortCatalog(list, posSortBy);
  }, [packages, posCategory, globalSearch, posSortBy]);

  // Net total: voucher redemption and point-redemption lines contribute 0; others use price × quantity
  const total = useMemo(
    () =>
      cart.reduce((sum, item) => {
        if (item.voucherRedemption || item.redeemedWithPoints) return sum;
        return sum + item.price * item.quantity;
      }, 0),
    [cart]
  );

  const hasRedemptionsInCart = useMemo(() => cart.some((i) => i.redeemedWithPoints), [cart]);

  const selectedClientData = useMemo(
    () => (selectedClient ? clients.find((c) => c.id === selectedClient) : null),
    [clients, selectedClient]
  );

  // Customer autocomplete: filter by name (starts with or contains) or phone, limit for performance
  const customerSuggestions = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return clients.slice(0, 30);
    const nameMatch = (name: string) => {
      const n = (name || '').trim().toLowerCase();
      return n.startsWith(q) || n.includes(q);
    };
    const phoneDigits = q.replace(/\D/g, '');
    return clients
      .filter(
        (c) =>
          nameMatch(c.name) ||
          (phoneDigits.length >= 2 && c.phone && c.phone.replace(/\D/g, '').includes(phoneDigits))
      )
      .slice(0, 30);
  }, [clients, customerSearchQuery]);

  // Keep search input in sync when selection is set from outside (e.g. Quick POS)
  useEffect(() => {
    if (selectedClient && selectedClientData) {
      setCustomerSearchQuery(selectedClientData.name);
    }
  }, [selectedClient, selectedClientData]);

  // Position dropdown under input (for portal); update when open or scroll/resize so it stays aligned
  const updateCustomerDropdownRect = () => {
    if (customerInputRef.current) {
      const r = customerInputRef.current.getBoundingClientRect();
      setCustomerDropdownRect({ top: r.bottom, left: r.left, width: r.width });
    }
  };
  useLayoutEffect(() => {
    if (!customerDropdownOpen) {
      setCustomerDropdownRect(null);
      return;
    }
    updateCustomerDropdownRect();
    const onScrollOrResize = () => updateCustomerDropdownRect();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [customerDropdownOpen, customerSearchQuery]);
  const memberCreditBalance = selectedClientData ? (selectedClientData.credit ?? 0) : 0;
  const paymentMethodsWithCredit = useMemo(() => {
    let list = [...paymentMethods];
    if (memberCreditBalance > 0) {
      list = [...list, `Member Credit (RM ${memberCreditBalance.toFixed(2)})`];
    }
    if (!list.includes('Voucher')) {
      list = ['Voucher', ...list];
    }
    return list;
  }, [paymentMethods, memberCreditBalance]);

  useEffect(() => {
    if (selectedPaymentMethod.startsWith('Member Credit') && memberCreditBalance <= 0) {
      setSelectedPaymentMethod(paymentMethods[0] || '');
    }
  }, [selectedClient, memberCreditBalance, paymentMethods, selectedPaymentMethod]);

  // When total is $0 (e.g. voucher redemption), default payment to Voucher so sale can complete without cash/card
  useEffect(() => {
    if (total === 0 && (isVoucherRedemptionMode || cart.some((i) => i.voucherRedemption))) {
      setSelectedPaymentMethod('Voucher');
    }
  }, [total, isVoucherRedemptionMode, cart]);

  const addToCart = (item: any, type: 'service' | 'product' | 'package') => {
    const newItem: CartItem = {
      id: item.id,
      cartItemId: crypto.randomUUID(),
      name: item.name,
      price: item.price,
      quantity: 1,
      type,
      points: item.points,
      staffId: type === 'service' ? undefined : undefined,
      redeemPointsEnabled: type === 'service' ? !!item.redeemPointsEnabled && !!item.redeemPoints : false,
      redeemPoints: type === 'service' && item.redeemPoints ? Number(item.redeemPoints) : undefined,
      redeemedWithPoints: false
    };
    setCart(prev => [...prev, newItem]);
  };

  const toggleRedeemWithPoints = (lineId: string) => {
    const client = selectedClientData;
    if (!client) {
      alert('Select a member to redeem services with points.');
      return;
    }
    const target = cart.find((item) =>
      (item.cartItemId != null ? item.cartItemId === lineId : item.id === lineId)
    );
    if (!target || !target.redeemPointsEnabled || !target.redeemPoints) {
      return;
    }

    const currentBalance = client.points ?? 0;
    const currentlyUsed = cart.reduce((sum, item) => {
      if (!item.redeemedWithPoints || !item.redeemPoints) return sum;
      return sum + item.redeemPoints * item.quantity;
    }, 0);
    const thisLineCost = target.redeemPoints * target.quantity;
    const willRedeem = !target.redeemedWithPoints;
    const nextUsed = willRedeem ? currentlyUsed + thisLineCost : currentlyUsed - thisLineCost;

    if (willRedeem && nextUsed > currentBalance) {
      alert(
        `Member does not have enough points for this redemption.\nRequired (including this): ${nextUsed} pts, available: ${currentBalance} pts.`
      );
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        const isThisLine =
          item.cartItemId != null ? item.cartItemId === lineId : item.id === lineId;
        if (!isThisLine) return item;
        return {
          ...item,
          redeemedWithPoints: !item.redeemedWithPoints,
        };
      })
    );
  };

  const updateStaffAssignment = (lineId: string, staffId: string) => {
    setCart(prev => prev.map(item => {
      const isThisLine = item.cartItemId != null ? item.cartItemId === lineId : item.id === lineId;
      if (isThisLine) {
        const assignedStaff = staff.find(s => s.id === staffId);
        let commission = 0;

        if (item.type === 'product') {
          const product = products.find((p) => p.id === item.id);
          const fixed = product?.fixedCommissionAmount ?? 0;
          commission = assignedStaff ? fixed : 0;
        } else if (item.type === 'service') {
          const isCommissionable = services.find((s) => s.id === item.id)?.isCommissionable ?? false;
          const roleRate = roleCommissions.find((rc) => rc.role === assignedStaff?.role)?.rate || 0;
          commission = assignedStaff && isCommissionable ? item.price * item.quantity * (roleRate / 100) : 0;
        }

        return { ...item, staffId, commissionEarned: commission };
      }
      return item;
    }));
  };

  const removeFromCart = (lineId: string) => {
    setCart(prev => prev.filter(i => (i.cartItemId != null ? i.cartItemId !== lineId : i.id !== lineId)));
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || isProcessing) return;
    const hasPackage = cart.some((item) => item.type === 'package');
    if (hasPackage && !selectedClient) {
      alert("Bundle packages can only be purchased by a member. Please select a customer.");
      return;
    }
    const hasRedemptions = cart.some((item) => item.redeemedWithPoints);
    if (hasRedemptions && !selectedClient) {
      alert('Select a member before redeeming services with points.');
      return;
    }
    const unassignedServices = cart.filter(item => item.type === 'service' && !item.staffId);
    if (unassignedServices.length > 0) {
      alert("Please assign a staff member to all individual services before checkout.");
      return;
    }
    if (isVoucherRedemptionMode) {
      if (!selectedClient) {
        alert('Voucher redemption requires a member. Please select the member.');
        return;
      }
      const hasServiceOrPackage = cart.some(item => item.type === 'service' || item.type === 'package');
      if (!hasServiceOrPackage) {
        alert('Add at least one service or package for voucher redemption, and assign the therapist.');
        return;
      }
    } else if (total > 0 && !selectedPaymentMethod) {
      alert("Please select a payment method.");
      return;
    } else if (total > 0 && selectedPaymentMethod.startsWith('Member Credit') && (memberCreditBalance <= 0 || total > memberCreditBalance)) {
      alert(
        memberCreditBalance <= 0
          ? 'Selected member has no credit balance.'
          : `Member credit (RM ${memberCreditBalance.toFixed(2)}) is less than total (RM ${total.toFixed(2)}).`
      );
      return;
    }

    if (useCustomDateTime && !customDate) {
      alert('Please select a sale date for this transaction.');
      return;
    }

    let pointsToRedeem = 0;
    if (hasRedemptions && selectedClientData) {
      pointsToRedeem = cart.reduce((sum, item) => {
        if (!item.redeemedWithPoints || !item.redeemPoints) return sum;
        return sum + item.redeemPoints * item.quantity;
      }, 0);
      const availablePoints = selectedClientData.points ?? 0;
      if (pointsToRedeem > availablePoints) {
        alert(
          `Member does not have enough points to redeem these services.\nRequired: ${pointsToRedeem} pts, available: ${availablePoints} pts.`
        );
        return;
      }
    }

    setIsProcessing(true);
    try {
      const isVoucherSale = isVoucherRedemptionMode;
      const now = new Date();
      let saleDate = now;
      if (useCustomDateTime && customDate) {
        const time = customTime && customTime.trim().length > 0 ? customTime : '00:00';
        const candidate = new Date(`${customDate}T${time}:00`);
        if (!isNaN(candidate.getTime())) {
          saleDate = candidate;
        }
      }
      const itemsToSave = cart.map((i) =>
        i.voucherRedemption ? { ...i, price: 0 } : i
      );
      const newTxn: Transaction = {
        id: `txn_${Date.now()}`,
        outletID: '', // Will be set by handleAddTransactionWithLogic in App.tsx
        date: saleDate.toISOString(),
        type: TransactionType.SALE,
        clientId: selectedClient || undefined,
        items: itemsToSave,
        amount: isVoucherSale ? 0 : total,
        category: isVoucherSale ? 'Redemption' : (hasRedemptions ? 'Redemption' : 'Sales'),
        description: isVoucherSale ? `Voucher redemption: ${cart.map(i => i.name).join(', ')}` : `Sale: ${cart.map(i => i.name).join(', ')}`,
        paymentMethod: isVoucherSale ? 'Voucher' : (selectedPaymentMethod.startsWith('Member Credit') ? 'Member Credit' : selectedPaymentMethod)
      };
      await onCompleteSale(newTxn);

      if (hasRedemptions && selectedClientData && pointsToRedeem > 0) {
        try {
          const { pointTransactionService } = await import('../services/pointTransactionService');
          await pointTransactionService.add(selectedClientData.id, 'Redeem', pointsToRedeem);
        } catch (err) {
          console.error('Failed to record point redemption from POS:', err);
        }
      }
      const customerName = selectedClientData?.name ?? 'Guest';
      const paymentLabel = selectedPaymentMethod.startsWith('Member Credit') ? 'Member Credit' : selectedPaymentMethod;
      setLastSaleData({
        items: [...cart],
        total: isVoucherSale ? 0 : total,
        date: saleDate.toISOString(),
        customerName,
        paymentMethod: isVoucherSale ? 'Voucher' : paymentLabel,
        receiptSettings: {
          shopName: outletSettings.shopName,
          receiptHeaderTitle: outletSettings.receiptHeaderTitle,
          receiptCompanyName: outletSettings.receiptCompanyName,
          receiptPhone: outletSettings.receiptPhone,
          receiptAddress: outletSettings.receiptAddress,
          receiptFooterNote: outletSettings.receiptFooterNote,
        }
      });
      setSaleComplete(true);
      setCart([]);
      setSelectedClient('');
      setSelectedPaymentMethod(paymentMethods[0] || '');
      setQuickPOSMemberName(null);
      if (isVoucherSale) setIsVoucherRedemptionMode(false);
    } catch (error: any) {
      alert(`Checkout failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewSale = () => {
    setCart([]);
    setSaleComplete(false);
    setLastSaleData(null);
    setIsCartOpen(false);
    setIsVoucherRedemptionMode(false);
    setUseCustomDateTime(false);
    setCustomDate('');
    setCustomTime('');
  };

  return (
    <div className="flex flex-col md:grid md:grid-cols-[65%_35%] gap-6 lg:gap-8 h-full pb-24 md:pb-0">
      {isVoucherRedemptionMode && (
        <div className="lg:col-span-3 rounded-xl bg-sky-100 border border-sky-300 px-4 py-3 flex items-center gap-2 text-sky-800 text-sm font-medium">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          <span>Voucher redemption — Add a service or package, assign therapist, then complete. Payment: $0 (Voucher).</span>
        </div>
      )}
      <div className="space-y-6 order-2 md:order-1 md:pr-2 md:overflow-y-auto md:max-h-[calc(100vh-8rem)]">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <input type="text" placeholder="Search catalog..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none shadow-sm" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} />
            <div className="absolute left-4 top-3.5 text-slate-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            {(['all', 'services', 'products', 'packages'] as const).map(cat => (
              <button key={cat} onClick={() => setActiveCatalog(cat)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeCatalog === cat ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400'}`}>{cat}</button>
            ))}
          </div>
          <select value={posSortBy} onChange={(e) => setPosSortBy(e.target.value as 'a-z' | 'z-a' | 'price-low' | 'price-high')} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium">
            <option value="a-z">A–Z</option>
            <option value="z-a">Z–A</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        <div className="overflow-x-auto scrollbar-thin pb-2">
          <div className="flex gap-2 min-w-0">
            {posCategories.map((cat) => (
              <button key={cat} type="button" onClick={() => setPosCategory(cat)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${posCategory === cat ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {(activeCatalog === 'all' || activeCatalog === 'services') && filteredServices.length > 0 && (
            <section className="animate-fadeIn">
              <h3 className="text-sm font-black uppercase text-teal-600 mb-4 flex items-center gap-2"><Icons.Services /> Treatments</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredServices.map(service => (
                  <button key={service.id} onClick={() => addToCart(service, 'service')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all text-left">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800 leading-tight">{service.name}</span>
                      <span className="text-teal-600 font-black text-sm">${service.price}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-[9px] font-black text-slate-400 uppercase">
                      <span>{service.duration} mins</span>
                      <span className="text-amber-500">+{service.points} PTS</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(activeCatalog === 'all' || activeCatalog === 'products') && filteredProducts.length > 0 && (
            <section className="animate-fadeIn">
              <h3 className="text-sm font-black uppercase text-amber-600 mb-4 flex items-center gap-2"><Icons.POS /> Retail Products</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredProducts.map(product => (
                  <button key={product.id} onClick={() => addToCart(product, 'product')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-500 hover:shadow-md transition-all text-left">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800">{product.name}</span>
                      <span className="text-amber-600 font-black text-sm">${product.price}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Stock: {product.stock}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(activeCatalog === 'all' || activeCatalog === 'packages') && filteredPackages.length > 0 && (
            <section className="animate-fadeIn">
              <h3 className="text-sm font-black uppercase text-indigo-600 mb-4 flex items-center gap-2"><Icons.Package /> Bundled Packages</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredPackages.map(pkg => (
                  <button key={pkg.id} onClick={() => addToCart(pkg, 'package')} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all text-left group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800 leading-tight">{pkg.name}</span>
                      <span className="text-indigo-600 font-black text-sm">${pkg.price}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {pkg.services.map((ps, idx) => {
                        const srv = services.find(s => s.id === ps.serviceId);
                        return <span key={idx} className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">{ps.quantity}x {srv?.name.split(' ')[0]}</span>
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-black text-amber-500 uppercase">
                      <span>+{pkg.points} PTS</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(activeCatalog === 'all' || activeCatalog === 'services') && filteredServices.length === 0 && (
            <section className="animate-fadeIn">
              <h3 className="text-sm font-black uppercase text-teal-600 mb-4 flex items-center gap-2"><Icons.Services /> Treatments</h3>
              <div className="py-12 text-center text-slate-500 text-sm">No services found. Try a different category or search.</div>
            </section>
          )}
          {(activeCatalog === 'all' || activeCatalog === 'products') && filteredProducts.length === 0 && activeCatalog === 'products' && (
            <div className="py-12 text-center text-slate-500 text-sm">No products found. Try a different category or search.</div>
          )}
          {(activeCatalog === 'all' || activeCatalog === 'packages') && filteredPackages.length === 0 && activeCatalog === 'packages' && (
            <div className="py-12 text-center text-slate-500 text-sm">No packages found. Try a different category or search.</div>
          )}
          {activeCatalog === 'all' && filteredServices.length === 0 && filteredProducts.length === 0 && filteredPackages.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">No items found. Try a different category or search.</div>
          )}
        </div>
      </div>

      {/* Mobile Cart Bottom Bar (phones only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(15,23,42,0.12)]">
        <button
          onClick={() => setIsCartOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex flex-col items-start">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Checkout
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {cart.length} item{cart.length === 1 ? '' : 's'} · ${total.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-teal-600 text-white text-xs font-bold uppercase tracking-wide">
              Review order
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </span>
          </div>
        </button>
      </div>

      {/* Checkout Cart sidebar: sticky on tablet/desktop, slide-up sheet on mobile */}
      <div
        className={`
          order-3 md:order-2
          md:sticky md:top-20 md:h-[calc(100vh-8rem)]
          md:flex md:flex-col
          ${isCartOpen ? 'fixed inset-0 z-40 flex items-end md:static md:z-auto' : 'hidden md:flex'}
        `}
      >
        {/* Mobile overlay background */}
        {isCartOpen && (
          <div
            className="absolute inset-0 bg-slate-900/40 md:hidden"
            onClick={() => setIsCartOpen(false)}
          />
        )}

        <div
          className={`
            relative bg-white/95 border border-slate-200 rounded-t-2xl md:rounded-2xl shadow-md
            flex flex-col overflow-hidden
            w-full md:w-auto
            max-h-[90vh] md:h-full
            md:h-[calc(100vh-8rem)]
            md:static md:shadow-md
          `}
        >
          {/* Real-time Clock and Date Display */}
          <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-slate-50">
          <div className="flex flex-col items-center justify-center">
            <div className="text-3xl font-black text-teal-700 tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </div>
            <div className="text-sm font-bold text-slate-600 mt-1">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Checkout Cart</h3>
            <button
              onClick={() => setIsCartOpen(false)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-200 transition-colors"
              aria-label="Close cart"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-3">
            {quickPOSMemberName && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 border border-teal-200">
                <span className="text-xs font-semibold text-teal-700">Customer: {quickPOSMemberName} selected.</span>
              </div>
            )}
            {selectedClientData && memberCreditBalance > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-xs font-semibold text-blue-700">
                  Member credit: RM {memberCreditBalance.toFixed(2)}
                </span>
              </div>
            )}
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Customer</label>
             <div className="relative" ref={customerDropdownRef}>
               <input
                 ref={customerInputRef}
                 type="text"
                 placeholder="Search by name or phone..."
                 autoComplete="off"
                 className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                 value={selectedClientData ? selectedClientData.name : customerSearchQuery}
                 onChange={(e) => {
                   setCustomerSearchQuery(e.target.value);
                   setSelectedClient('');
                   setQuickPOSMemberName(null);
                   setCustomerDropdownOpen(true);
                 }}
                 onFocus={() => setCustomerDropdownOpen(true)}
                 onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 180)}
               />
               {customerDropdownOpen && customerDropdownRect &&
                 createPortal(
                   <div
                     className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl text-sm py-1"
                     style={{
                       position: 'fixed',
                       top: customerDropdownRect.top + 4,
                       left: customerDropdownRect.left,
                       width: customerDropdownRect.width,
                       zIndex: 9999,
                     }}
                   >
                     <button
                       type="button"
                       className="w-full px-3 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100 text-slate-500 font-medium"
                       onMouseDown={(e) => { e.preventDefault(); setSelectedClient(''); setCustomerSearchQuery(''); setQuickPOSMemberName(null); setCustomerDropdownOpen(false); }}
                     >
                       Guest (Anonymous)
                     </button>
                     {customerSuggestions.length === 0 ? (
                       <div className="px-3 py-4 text-slate-400 text-center">No matching customer</div>
                     ) : (
                       customerSuggestions.map((client) => (
                         <button
                           key={client.id}
                           type="button"
                           className="w-full px-3 py-2.5 text-left hover:bg-teal-50 flex justify-between items-center gap-2"
                           onMouseDown={(e) => {
                             e.preventDefault();
                             setSelectedClient(client.id);
                             setCustomerSearchQuery(client.name);
                             setQuickPOSMemberName(null);
                             setCustomerDropdownOpen(false);
                           }}
                         >
                           <span className="font-medium text-slate-800 truncate">{client.name}</span>
                           {client.phone && <span className="text-slate-400 text-xs shrink-0">{client.phone.slice(-4)}</span>}
                         </button>
                       ))
                     )}
                   </div>,
                   document.body
                 )}
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {saleComplete ? (
            <div className="flex flex-col items-center justify-center py-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xl font-bold text-emerald-800">Sale Complete!</p>
              {lastSaleData && (
                <p className="text-2xl font-black text-slate-800 mt-3">Order Total: ${lastSaleData.total.toFixed(2)}</p>
              )}
              <p className="text-sm text-slate-500 mt-2">Print receipt or start next sale</p>
            </div>
          ) : (
            <>
              {cart.map((item, idx) => {
                const lineId = item.cartItemId ?? item.id;
                const displayName =
                  isVoucherRedemptionMode && idx === 0
                    ? `Voucher Redemption - ${item.quantity} ${item.name}`
                    : item.name;
                const lineTotal = item.voucherRedemption ? 0 : item.price * item.quantity;
                const showOriginalPrice = item.voucherRedemption && (item.originalPrice ?? 0) > 0;
                return (
                  <div key={lineId} className="bg-white p-4 rounded-xl border border-slate-200 animate-fadeIn relative group shadow-sm">
                    <button onClick={() => removeFromCart(lineId)} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"><Icons.Trash /></button>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800 leading-tight">{displayName}</p>
                        {showOriginalPrice ? (
                          <p className="text-[10px] text-slate-400 font-bold uppercase">
                            <span className="line-through">{item.quantity} x ${(item.originalPrice ?? 0).toFixed(2)}</span>
                            <span className="ml-2 text-emerald-600">100% discount · $0</span>
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} x ${item.price.toFixed(2)}</p>
                        )}
                      </div>
                      <span className={`font-black text-sm ${item.voucherRedemption ? 'text-emerald-600' : 'text-slate-700'}`}>${lineTotal.toFixed(2)}</span>
                    </div>
                    {item.type === 'service' && item.redeemPointsEnabled && item.redeemPoints && (
                      <div className="mt-1 mb-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => toggleRedeemWithPoints(lineId)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                            item.redeemedWithPoints
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                          }`}
                        >
                          {item.redeemedWithPoints ? 'Redeeming' : 'Redeem'} · {item.redeemPoints} pts
                        </button>
                        {selectedClientData && (
                          <span className="text-[10px] font-bold text-slate-400">
                            Balance: {selectedClientData.points.toLocaleString()} pts
                          </span>
                        )}
                      </div>
                    )}
                    {item.type === 'service' && (
                      <div className="pt-3 border-t border-slate-100">
                        <select
                          className={`w-full p-2.5 text-xs rounded-lg border outline-none font-bold ${
                            item.staffId
                              ? 'bg-slate-50 border-slate-200 text-slate-700'
                              : 'bg-rose-50 border-rose-200 text-rose-600'
                          }`}
                          value={item.staffId || ''}
                          onChange={(e) => updateStaffAssignment(lineId, e.target.value)}
                        >
                          <option value="">-- Assign Therapist --</option>
                          {staff
                            .filter((s) => {
                              const qs = s.qualifiedServices;
                              if (!qs || qs.length === 0) return true;
                              return qs.includes(item.id);
                            })
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
              {cart.length === 0 && <div className="text-center py-20 text-slate-300 italic text-sm">Cart is empty</div>}
            </>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/80">
          {saleComplete ? (
            <div className="space-y-3 animate-fadeIn">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-3 rounded-xl font-semibold border-2 border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h2z" /></svg>
                Print Receipt
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-3 rounded-xl font-semibold border-2 border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Save PDF
              </button>
              <button
                type="button"
                onClick={handleNewSale}
                className="w-full py-4 rounded-xl font-black bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-teal-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {/* Sale date & time selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Sale Date &amp; Time
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-500">
                      <input
                        type="checkbox"
                        checked={useCustomDateTime}
                        onChange={(e) => setUseCustomDateTime(e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>Custom</span>
                    </label>
                  </div>
                  {useCustomDateTime ? (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="w-28 p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 tabular-nums">
                      {currentTime.toLocaleString('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </p>
                  )}
                </div>

                {/* Payment method & total */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Payment Method</label>
                  <select
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-bold"
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    disabled={isVoucherRedemptionMode}
                  >
                    {paymentMethodsWithCredit.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  {isVoucherRedemptionMode && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Payment is fixed to <span className="font-semibold text-teal-600">Voucher (RM 0)</span> for this redemption.
                    </p>
                  )}
                </div>
                <div className="flex justify-between text-2xl font-black text-slate-900">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>
              {cart.some((i) => i.type === 'package') && !selectedClient && (
                <p className="text-xs text-amber-600 font-medium">Select a member to purchase bundle packages.</p>
              )}
              <button 
                disabled={cart.length === 0 || isProcessing || (cart.some((i) => i.type === 'package') && !selectedClient)} 
                onClick={handleCheckout} 
                className={`w-full py-4 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 min-h-[56px] ${
                  cart.length === 0 || (cart.some((i) => i.type === 'package') && !selectedClient)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : isProcessing
                    ? 'bg-teal-400 text-white cursor-wait'
                    : hasRedemptionsInCart
                    ? 'bg-amber-400 text-slate-900 hover:bg-amber-500 active:scale-95 shadow-amber-100'
                    : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95 shadow-teal-100'
                }`}
              >
                {isProcessing ? 'Finalizing...' : 'Complete Sale'}
              </button>
            </>
          )}
        </div>
      </div>
      </div>

      {/* Hidden ReceiptTemplate: invisible on screen, targeted by @media print */}
      {lastSaleData && <ReceiptTemplate data={lastSaleData} />}
    </div>
  );
};

export default POS;
