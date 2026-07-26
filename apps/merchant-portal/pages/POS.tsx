
import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Service, Product, Package, Client, Transaction, TransactionType, CartItem, Staff, RoleCommission, Appointment, OutletSettings } from '../types';
import { Icons } from '../constants';
import ReceiptTemplate, { type ReceiptTemplateData } from '../components/ReceiptTemplate';
import {
  POSCartItem,
  POSCartSheet,
  POSCatalogueList,
  POSCatalogueSection,
  POSCatalogueToolbar,
  POSItemCard,
  POSMemberSummary,
  POSPageHeader,
  POSPaymentSection,
  POSSaleCompleteActions,
  POSStickyCartAction,
  POSTotals,
} from '../components/pos';
import type { POSCatalogTab, POSSortBy } from '../components/pos';

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
  const [posSortBy, setPosSortBy] = useState<POSSortBy>('a-z');
  const [activeCatalog, setActiveCatalog] = useState<POSCatalogTab>('all');
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
  const [lastSaleData, setLastSaleData] = useState<ReceiptTemplateData | null>(null);

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

  const updateCartQuantity = (lineId: string, nextQty: number) => {
    const qty = Math.max(1, Math.floor(nextQty));
    setCart((prev) =>
      prev.map((item) => {
        const isThisLine = item.cartItemId != null ? item.cartItemId === lineId : item.id === lineId;
        if (!isThisLine) return item;
        const assignedStaff = item.staffId ? staff.find((s) => s.id === item.staffId) : undefined;
        let commission = item.commissionEarned ?? 0;
        if (item.type === 'service' && assignedStaff) {
          const isCommissionable = services.find((s) => s.id === item.id)?.isCommissionable ?? false;
          const roleRate = roleCommissions.find((rc) => rc.role === assignedStaff.role)?.rate || 0;
          commission = isCommissionable ? item.price * qty * (roleRate / 100) : 0;
        } else if (item.type === 'product' && assignedStaff) {
          const product = products.find((p) => p.id === item.id);
          commission = product?.fixedCommissionAmount ?? 0;
        }
        return { ...item, quantity: qty, commissionEarned: commission };
      }),
    );
  };

  const clearCart = () => {
    if (cart.length === 0 && !saleComplete) return;
    setCart([]);
    setSaleComplete(false);
    setLastSaleData(null);
    setIsVoucherRedemptionMode(false);
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
    <div className="flex flex-col gap-4 md:gap-5 h-full min-h-0 pb-28 md:pb-0">
      <POSPageHeader
        shopName={outletSettings.shopName}
        banner={
          isVoucherRedemptionMode ? (
            <div className="rounded-ui-md bg-sky-100 border border-sky-300 px-4 py-3 flex items-center gap-2 text-sky-800 text-sm font-medium">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>
                Voucher redemption — Add a service or package, assign therapist, then complete. Payment: $0
                (Voucher).
              </span>
            </div>
          ) : null
        }
      />

      <div className="flex-1 min-h-0 flex flex-col md:flex-row md:items-start gap-4 lg:gap-5">
        <div className="flex-1 min-w-0 space-y-4 md:overflow-y-auto md:max-h-[calc(100vh-8rem)] md:pr-1">
        <POSCatalogueToolbar
          search={globalSearch}
          onSearchChange={setGlobalSearch}
          activeCatalog={activeCatalog}
          onCatalogChange={setActiveCatalog}
          sortBy={posSortBy}
          onSortChange={setPosSortBy}
          categories={posCategories}
          selectedCategory={posCategory}
          onCategoryChange={setPosCategory}
        />

        <POSCatalogueList>
          {(activeCatalog === 'all' || activeCatalog === 'services') && (
            <POSCatalogueSection
              title="Services"
              empty={filteredServices.length === 0}
              emptyMessage="No services found. Try a different category or search."
            >
              {filteredServices.map((service) => (
                <POSItemCard
                  key={service.id}
                  name={service.name}
                  priceLabel={`$${service.price}`}
                  metaLeft={`${service.duration} mins`}
                  metaRight={service.points ? `+${service.points} pts` : undefined}
                  imageUrl={service.imageUrl}
                  onAdd={() => addToCart(service, 'service')}
                />
              ))}
            </POSCatalogueSection>
          )}

          {(activeCatalog === 'all' || activeCatalog === 'products') &&
            (filteredProducts.length > 0 || activeCatalog === 'products') && (
            <POSCatalogueSection
              title="Products"
              empty={filteredProducts.length === 0}
              emptyMessage="No products found. Try a different category or search."
            >
              {filteredProducts.map((product) => (
                <POSItemCard
                  key={product.id}
                  name={product.name}
                  priceLabel={`$${product.price}`}
                  metaLeft={`Stock: ${product.stock}`}
                  onAdd={() => addToCart(product, 'product')}
                />
              ))}
            </POSCatalogueSection>
          )}

          {(activeCatalog === 'all' || activeCatalog === 'packages') &&
            (filteredPackages.length > 0 || activeCatalog === 'packages') && (
            <POSCatalogueSection
              title="Packages"
              empty={filteredPackages.length === 0}
              emptyMessage="No packages found. Try a different category or search."
            >
              {filteredPackages.map((pkg) => (
                <POSItemCard
                  key={pkg.id}
                  name={pkg.name}
                  priceLabel={`$${pkg.price}`}
                  metaRight={pkg.points ? `+${pkg.points} pts` : undefined}
                  onAdd={() => addToCart(pkg, 'package')}
                  chips={
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pkg.services.map((ps, idx) => {
                        const srv = services.find((s) => s.id === ps.serviceId);
                        return (
                          <span
                            key={idx}
                            className="text-[9px] bg-[var(--bg-soft)] px-1.5 py-0.5 rounded text-[var(--text-muted)] font-bold"
                          >
                            {ps.quantity}x {srv?.name.split(' ')[0]}
                          </span>
                        );
                      })}
                    </div>
                  }
                />
              ))}
            </POSCatalogueSection>
          )}

          {activeCatalog === 'all' &&
            filteredServices.length === 0 &&
            filteredProducts.length === 0 &&
            filteredPackages.length === 0 && (
              <div className="py-12 text-center text-[var(--text-muted)] text-sm">
                No items found. Try a different category or search.
              </div>
            )}
        </POSCatalogueList>
        </div>

        <POSCartSheet
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        clockLabel={currentTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })}
        dateLabel={currentTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
        headerRight={
          <button
            type="button"
            onClick={clearCart}
            disabled={cart.length === 0 && !saleComplete}
            aria-label="Clear order"
            className="w-9 h-9 inline-flex items-center justify-center rounded-ui-sm text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-40 disabled:pointer-events-none"
          >
            <Icons.Trash />
          </button>
        }
        footer={
          saleComplete ? (
            <POSSaleCompleteActions onPrint={handlePrint} onNewSale={handleNewSale} />
          ) : (
            <>
              <POSPaymentSection
                useCustomDateTime={useCustomDateTime}
                onCustomDateTimeChange={setUseCustomDateTime}
                customDate={customDate}
                onCustomDateChange={setCustomDate}
                customTime={customTime}
                onCustomTimeChange={setCustomTime}
                currentDateTimeLabel={currentTime.toLocaleString('en-GB', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
                paymentMethod={selectedPaymentMethod}
                onPaymentMethodChange={setSelectedPaymentMethod}
                paymentMethods={paymentMethodsWithCredit}
                paymentDisabled={isVoucherRedemptionMode}
                paymentHint={
                  isVoucherRedemptionMode ? (
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Payment is fixed to <span className="font-semibold text-[var(--brand)]">Voucher (RM 0)</span>{' '}
                      for this redemption.
                    </p>
                  ) : null
                }
              />
              <POSTotals
                totalLabel={`$${total.toFixed(2)}`}
                subtotalLabel={`$${total.toFixed(2)}`}
                warning={
                  cart.some((i) => i.type === 'package') && !selectedClient ? (
                    <p className="text-xs text-amber-600 font-medium">
                      Select a member to purchase bundle packages.
                    </p>
                  ) : null
                }
                checkoutLabel="Complete Sale"
                onCheckout={handleCheckout}
                checkoutDisabled={
                  cart.length === 0 || (cart.some((i) => i.type === 'package') && !selectedClient)
                }
                isProcessing={isProcessing}
                hasRedemptions={hasRedemptionsInCart}
              />
            </>
          )
        }
      >
        {!saleComplete && (
          <POSMemberSummary
            quickPOSMemberName={quickPOSMemberName}
            creditLabel={
              selectedClientData && memberCreditBalance > 0
                ? `Member credit: RM ${memberCreditBalance.toFixed(2)}`
                : null
            }
            onNewCustomer={() => navigate('/member')}
          >
            <div className="relative" ref={customerDropdownRef}>
              <input
                ref={customerInputRef}
                type="text"
                placeholder="Search by name or phone..."
                autoComplete="off"
                className="w-full min-h-[40px] py-2 px-3 bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-md outline-none focus-visible:shadow-ui-focus-strong text-sm font-medium box-border"
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
              {customerDropdownOpen &&
                customerDropdownRect &&
                createPortal(
                  <div
                    className="max-h-56 overflow-y-auto rounded-ui-md border border-[var(--line)] bg-[var(--bg-surface)] shadow-ui-lg text-sm py-1"
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
                      className="w-full px-3 py-2.5 text-left hover:bg-[var(--bg-soft)] border-b border-[var(--line)] text-[var(--text-muted)] font-medium"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedClient('');
                        setCustomerSearchQuery('');
                        setQuickPOSMemberName(null);
                        setCustomerDropdownOpen(false);
                      }}
                    >
                      Guest (Anonymous)
                    </button>
                    {customerSuggestions.length === 0 ? (
                      <div className="px-3 py-4 text-[var(--text-muted)] text-center">No matching customer</div>
                    ) : (
                      customerSuggestions.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          className="w-full px-3 py-2.5 text-left hover:bg-[var(--brand-soft)] flex justify-between items-center gap-2"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedClient(client.id);
                            setCustomerSearchQuery(client.name);
                            setQuickPOSMemberName(null);
                            setCustomerDropdownOpen(false);
                          }}
                        >
                          <span className="font-medium text-[var(--text-primary)] truncate">{client.name}</span>
                          {client.phone ? (
                            <span className="text-[var(--text-muted)] text-xs shrink-0">{client.phone.slice(-4)}</span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>,
                  document.body,
                )}
            </div>
          </POSMemberSummary>
        )}

        <div className="space-y-2">
          {saleComplete ? (
            <div className="flex flex-col items-center justify-center py-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xl font-bold text-emerald-800">Sale Complete!</p>
              {lastSaleData ? (
                <p className="text-2xl font-black text-[var(--text-primary)] mt-3 tabular-nums">
                  Order Total: ${lastSaleData.total.toFixed(2)}
                </p>
              ) : null}
              <p className="text-sm text-[var(--text-muted)] mt-2">Print receipt or start next sale</p>
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
                  <POSCartItem
                    key={lineId}
                    displayName={displayName}
                    quantity={item.quantity}
                    onQuantityChange={(next) => updateCartQuantity(lineId, next)}
                    qtyPriceLabel={
                      showOriginalPrice ? (
                        <p>
                          <span className="line-through">
                            ${(item.originalPrice ?? 0).toFixed(2)} each
                          </span>
                          <span className="ml-2 text-emerald-600">100% discount · $0</span>
                        </p>
                      ) : (
                        <p>${item.price.toFixed(2)} each</p>
                      )
                    }
                    lineTotalLabel={`$${lineTotal.toFixed(2)}`}
                    lineTotalEmphasized={!!item.voucherRedemption}
                    onRemove={() => removeFromCart(lineId)}
                    redeemControl={
                      item.type === 'service' && item.redeemPointsEnabled && item.redeemPoints ? (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleRedeemWithPoints(lineId)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                              item.redeemedWithPoints
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                            }`}
                          >
                            {item.redeemedWithPoints ? 'Redeeming' : 'Redeem'} · {item.redeemPoints} pts
                          </button>
                          {selectedClientData ? (
                            <span className="text-[10px] font-bold text-[var(--text-muted)]">
                              Balance: {selectedClientData.points.toLocaleString()} pts
                            </span>
                          ) : null}
                        </div>
                      ) : null
                    }
                    staffControl={
                      item.type === 'service' ? (
                        <div className="mt-2 min-w-0">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                            Staff
                          </label>
                          <select
                            className={`w-full min-h-[36px] py-1.5 px-2 text-sm rounded-ui-sm border outline-none font-semibold box-border ${
                              item.staffId
                                ? 'bg-[var(--bg-surface)] border-[var(--line)] text-[var(--text-primary)]'
                                : 'bg-rose-50 border-rose-200 text-rose-600'
                            }`}
                            value={item.staffId || ''}
                            onChange={(e) => updateStaffAssignment(lineId, e.target.value)}
                          >
                            <option value="">Assign staff…</option>
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
                      ) : null
                    }
                  />
                );
              })}
              {cart.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-[var(--bg-soft)] rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-muted)]">No items selected</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Tap a service or product to start a sale.</p>
                </div>
              )}
            </>
          )}
        </div>
        </POSCartSheet>
      </div>

      <POSStickyCartAction
        itemCount={cart.length}
        totalLabel={`$${total.toFixed(2)}`}
        onOpen={() => setIsCartOpen(true)}
      />

      {lastSaleData && <ReceiptTemplate data={lastSaleData} />}
    </div>
  );
};

export default POS;
