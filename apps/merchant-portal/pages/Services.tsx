
import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { MoreVertical, Plus, Search, GripVertical, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Service, Product, Package, PackageService } from '../types';
import { Icons } from '../constants';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getCurrentOutletID } from '../services/databaseService';
import { uploadImage, deleteImage, getServiceImagePath } from '../services/storageService';
import { SERVICE_ICON_CATEGORIES } from '../serviceIcons';
import { useUserContext } from '../contexts/UserContext';
import {
  AppModal,
  Button,
  fieldControlClassName,
  ModalFooterActions,
  ConfirmationDialog,
  StatusBadge,
  type StatusTone,
} from '../components/ui';
import {
  InventoryEmptyState,
  InventoryEntityCard,
  InventoryFiltersSheet,
  InventorySortSheet,
  InventoryOutletCard,
  InventoryToolbar,
  InventoryTypeTabs,
  InventoryEditPanel,
  InventoryKpiCards,
  InventoryStatusBadge,
  type InventoryCatalogTab,
  type InventorySortOption,
  type InventoryStatusFilter,
  type InventoryVisibilityFilter,
} from '../components/inventory';

function resolveLucideIcon(iconId: string): LucideIcon | undefined {
  const candidate = (LucideIcons as Record<string, unknown>)[iconId];
  if (typeof candidate === 'function') {
    return candidate as LucideIcon;
  }
  return undefined;
}
interface ServicesProps {
  services: Service[];
  products: Product[];
  packages: Package[];
  onUpdateService: (service: Service) => void | Promise<void>;
  onAddService: (service: Omit<Service, 'id'> | Service) => void | Promise<void | string | undefined>;
  onDeleteService: (id: string) => void | Promise<void>;
  onUpdateProduct: (product: Product) => void | Promise<void>;
  onAddProduct: (product: Omit<Product, 'id'> | Product) => void | Promise<void | string | undefined>;
  onDeleteProduct: (id: string) => void | Promise<void>;
  onUpdatePackage: (pkg: Package) => void | Promise<void>;
  onAddPackage: (pkg: Omit<Package, 'id'> | Package) => void | Promise<void | string | undefined>;
  onDeletePackage: (id: string) => void | Promise<void>;
  categories: string[];
  onAddCategory: (category: string) => void | Promise<void>;
  onEditCategory?: (oldName: string, newName: string) => void | Promise<void>;
  onDeleteCategory: (category: string) => void | Promise<void>;
  onReorderCategories?: (orderedNames: string[]) => void | Promise<void>;
  isLocked?: boolean;
}

type CatalogTab = InventoryCatalogTab;
type SortOption = InventorySortOption;

const Services: React.FC<ServicesProps> = ({ 
  services, 
  products,
  packages,
  onUpdateService, 
  onAddService, 
  onDeleteService,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onUpdatePackage,
  onAddPackage,
  onDeletePackage,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onReorderCategories,
  isLocked
}) => {
  const [activeTab, setActiveTab] = useState<CatalogTab>('services');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editPanelTab, setEditPanelTab] = useState<'details' | 'pricing' | 'availability' | 'media'>('details');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showRearrangeCategoriesModal, setShowRearrangeCategoriesModal] = useState(false);
  const [reorderCategoriesList, setReorderCategoriesList] = useState<string[]>([]);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: CatalogTab } | null>(null);
  const [editingItem, setEditingItem] = useState<Service | Product | Package | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showIconPickerModal, setShowIconPickerModal] = useState(false);
  const [showServiceSelectorModal, setShowServiceSelectorModal] = useState(false);
  const [serviceSelectorSearch, setServiceSelectorSearch] = useState('');
  const [openPackageServiceMenuId, setOpenPackageServiceMenuId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const DESCRIPTION_MAX_LENGTH = 1000;

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuSortBy, setMenuSortBy] = useState<SortOption>('a-z');
  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<InventoryVisibilityFilter>('all');
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(8);
  const { outletId } = useUserContext();

  // Existing low-stock convention already used for product coloring (kept as single source of truth).
  const LOW_STOCK_THRESHOLD = 5;

  const categoriesForTab = useMemo(() => {
    if (activeTab === 'services') return categories;
    if (activeTab === 'products') return [...new Set(products.map((p) => p.category))].sort();
    return [...new Set(packages.map((p) => p.category))].sort();
  }, [activeTab, categories, products, packages]);

  const sortItems = <T extends { name: string; price: number }>(list: T[], sort: SortOption): T[] => {
    const sorted = [...list];
    if (sort === 'a-z') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'z-a') sorted.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === 'price-low') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-high') sorted.sort((a, b) => b.price - a.price);
    return sorted;
  };

  // Services/packages have no stock concept, so status filters other than "active" never match them —
  // that is the honest result (no fake low/out-of-stock states invented for non-stocked catalog types).
  const matchesStatusFilter = (kind: 'service' | 'product' | 'package', stock?: number): boolean => {
    if (statusFilter === 'all') return true;
    if (kind === 'product') {
      const level = stock ?? 0;
      if (statusFilter === 'active') return level > LOW_STOCK_THRESHOLD;
      if (statusFilter === 'low-stock') return level > 0 && level <= LOW_STOCK_THRESHOLD;
      if (statusFilter === 'out-of-stock') return level <= 0;
    }
    return statusFilter === 'active';
  };

  // Only services carry an isVisible field; products/packages have no hidden concept, so they only ever match "Visible".
  const matchesVisibilityFilter = (kind: 'service' | 'product' | 'package', isVisible?: boolean): boolean => {
    if (visibilityFilter === 'all') return true;
    if (kind === 'service') {
      return visibilityFilter === 'visible' ? isVisible !== false : isVisible === false;
    }
    return visibilityFilter === 'visible';
  };

  const filteredServices = useMemo(() => {
    let list = services.filter((s) => {
      const cat = s.category || s.categoryId || '';
      const matchCategory =
        selectedCategory === 'All' ||
        cat === selectedCategory;
      const matchSearch =
        !menuSearchQuery.trim() ||
        s.name.toLowerCase().includes(menuSearchQuery.toLowerCase());
      return (
        matchCategory &&
        matchSearch &&
        matchesStatusFilter('service') &&
        matchesVisibilityFilter('service', s.isVisible)
      );
    });
    // Preserve backend ordering (displayOrder) for manual drag-and-drop.
    return list;
  }, [services, selectedCategory, menuSearchQuery, statusFilter, visibilityFilter]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = !menuSearchQuery.trim() || p.name.toLowerCase().includes(menuSearchQuery.toLowerCase());
      return matchCategory && matchSearch && matchesStatusFilter('product', p.stock) && matchesVisibilityFilter('product');
    });
    return sortItems(list, menuSortBy);
  }, [products, selectedCategory, menuSearchQuery, menuSortBy, statusFilter, visibilityFilter]);

  const filteredPackages = useMemo(() => {
    let list = packages.filter((p) => {
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = !menuSearchQuery.trim() || p.name.toLowerCase().includes(menuSearchQuery.toLowerCase());
      return matchCategory && matchSearch && matchesStatusFilter('package') && matchesVisibilityFilter('package');
    });
    return sortItems(list, menuSortBy);
  }, [packages, selectedCategory, menuSearchQuery, menuSortBy, statusFilter, visibilityFilter]);

  // KPI cards reflect the whole catalog (not the current tab/filter), matching the reference's
  // "All services, products & packages" framing.
  const kpiTotals = useMemo(() => {
    const totalItems = services.length + products.length + packages.length;
    const hiddenServices = services.filter((s) => s.isVisible === false).length;
    const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length;
    const outOfStockProducts = products.filter((p) => p.stock <= 0).length;
    // Products/packages have no hidden concept, so only hidden services reduce the active count.
    const activeItems = totalItems - hiddenServices;
    return {
      totalItems,
      activeItems,
      lowStockItems: lowStockProducts,
      outOfStockItems: outOfStockProducts,
      hiddenItems: hiddenServices,
    };
  }, [services, products, packages]);

  // Reset to page 1 whenever the visible result set could change shape.
  useEffect(() => {
    setCatalogPage(1);
  }, [activeTab, selectedCategory, menuSearchQuery, menuSortBy, statusFilter, visibilityFilter]);

  const paginatedProducts = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return filteredProducts.slice(start, start + catalogPageSize);
  }, [filteredProducts, catalogPage, catalogPageSize]);

  const paginatedPackages = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return filteredPackages.slice(start, start + catalogPageSize);
  }, [filteredPackages, catalogPage, catalogPageSize]);

  // Services keep the existing unpaginated, fully drag-reorderable list — paginating it would require
  // restructuring the reorder feature (mapping page-local drag positions back to the full order), which
  // risks the one thing this task explicitly protects. Products/packages have no reorder, so they paginate safely.
  const totalForPagination = activeTab === 'products' ? filteredProducts.length : activeTab === 'packages' ? filteredPackages.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalForPagination / catalogPageSize));

  useEffect(() => {
    if (selectedCategory !== 'All' && !categoriesForTab.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [activeTab, categoriesForTab, selectedCategory]);

  const renderServiceIcon = (iconId: string | undefined, className: string = 'w-6 h-6') => {
    if (!iconId) return null;
    if (iconId.startsWith('custom:') || iconId.startsWith('/')) {
      const src = iconId.startsWith('custom:') ? `/assets/icons/${iconId.replace('custom:', '')}` : iconId;
      return <img src={src} alt="" className={className} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
    }
    const IconComponent = resolveLucideIcon(iconId);
    return IconComponent ? <IconComponent className={className} /> : null;
  };

  // Mixed form data for all types
  const [formData, setFormData] = useState<any>({
    type: 'service', // internal flag for the modal
    name: '',
    price: 0,
    duration: 60,
    category: categories[0] || '',
    points: 0,
    redeemPointsEnabled: false,
    redeemPoints: 0,
    isCommissionable: true,
    isVisible: true,
    description: '',
    fixedCommissionAmount: 0,
    stock: 0,
    packageServices: [] as PackageService[],
    imageUrl: '',
    iconId: ''
  });

  const handleOpenAddModal = () => {
    if (isLocked) return;
    setEditingItem(null);
    setImagePreview(null);
    setImageFile(null);
    setEditPanelTab('details');
    setFormData({
      type: activeTab === 'services' ? 'service' : activeTab === 'products' ? 'product' : 'package',
      name: '',
      price: 0,
      duration: 60,
      category: categories[0] || '',
      points: 0,
      redeemPointsEnabled: false,
      redeemPoints: 0,
      isCommissionable: true,
      isVisible: true,
      description: '',
      fixedCommissionAmount: 0,
      stock: 0,
      packageServices: [],
      imageUrl: '',
      iconId: '',
      createdAt: new Date().toISOString()
    });
    setShowItemModal(true);
  };

  const handleOpenEditModal = (item: any, type: CatalogTab) => {
    if (isLocked) return;
    setEditingItem(item);
    setImagePreview(item.imageUrl || null);
    setImageFile(null);
    setEditPanelTab('details');
    setFormData({
      ...item,
      type: type === 'services' ? 'service' : type === 'products' ? 'product' : 'package',
      packageServices: type === 'packages' ? [...(item.services || [])] : [],
      iconId: item.iconId ?? ''
    });
    setShowItemModal(true);
  };

  // Quick visibility toggle from the table row — reuses the exact same field/handler as the
  // "Show on Booking Page" switch inside the edit drawer; no new business logic introduced.
  const handleToggleServiceVisibility = (service: Service) => {
    if (isLocked) return;
    onUpdateService({ ...service, isVisible: service.isVisible === false });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB.');
        return;
      }
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, imageUrl: '', iconId: formData.iconId || '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectIcon = (iconId: string) => {
    setFormData({ ...formData, iconId });
    setShowIconPickerModal(false);
  };

  const getCategoryIcon = (category: string): string => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('massage')) return '💆';
    if (categoryLower.includes('facial')) return '✨';
    if (categoryLower.includes('nail')) return '💅';
    if (categoryLower.includes('aroma')) return '🌿';
    if (categoryLower.includes('package')) return '📦';
    return '✨'; // Default icon
  };

  // --- Drag & drop setup for services table ---
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  );

  // Local ordering of currently visible services (ids)
  const [serviceOrder, setServiceOrder] = useState<string[]>([]);

  // Keep local order in sync with filteredServices when filters/search change
  useEffect(() => {
    setServiceOrder(filteredServices.map((s) => s.id));
  }, [filteredServices]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = serviceOrder.indexOf(active.id as string);
    const newIndex = serviceOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderIds = arrayMove(serviceOrder, oldIndex, newIndex);
    setServiceOrder(newOrderIds);

    // Compute new displayOrder based on current filteredServices order
    const updated = newOrderIds.map((id, index): { id: string; displayOrder: number } => {
      const svc = filteredServices.find((s) => s.id === (id as string));
      return {
        id: id as string,
        displayOrder: svc?.displayOrder ?? index + 1
      };
    });

    // Optimistic UI: update local array by mutating displayOrder on services
    // (the parent hook will re-fetch from Firestore after batch update)
    try {
      const { serviceService } = await import('../services/databaseService');
      await serviceService.updateDisplayOrder(updated);
    } catch (err) {
      console.error('Failed to update service display order:', err);
    }
  };

  const SortableCategoryItem: React.FC<{ id: string; name: string }> = ({ id, name }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1
    };
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
        <button type="button" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-grab active:cursor-grabbing" {...attributes} {...listeners} aria-label="Drag to reorder">
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-800">{name}</span>
      </div>
    );
  };

  const SortableServiceRow: React.FC<{ service: Service }> = ({ service }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: service.id
    });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
      boxShadow: isDragging ? '0 4px 12px rgba(15, 23, 42, 0.15)' : undefined
    };

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className="hover:bg-slate-50/50 transition-colors group cursor-grab"
      >
        <td className="px-3 py-4 w-8 text-slate-400 align-middle">
          <button
            type="button"
            className="p-1 rounded hover:bg-slate-100 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            {service.imageUrl ? (
              <img
                src={service.imageUrl}
                alt={service.name}
                className="w-10 h-10 rounded-xl object-cover border-2 border-slate-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 border-slate-200 text-[var(--brand)] ${
                service.imageUrl ? 'hidden' : 'bg-[var(--brand-soft)]'
              }`}
            >
              {service.imageUrl
                ? null
                : service.iconId
                ? renderServiceIcon(service.iconId, 'w-5 h-5')
                : getCategoryIcon(service.category)}
            </div>
            <span className="text-sm font-bold text-slate-800">{service.name}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="m-inventory-badge bg-[var(--bg-soft)] text-[var(--text-muted)]">
            {service.category}
          </span>
        </td>
        <td className="px-6 py-4 text-xs font-bold text-slate-500">{service.duration} MINS</td>
        <td className="px-6 py-4">
          {/* Services have no stock concept, so they are always "Active" in the status sense. */}
          <StatusBadge tone="success">Active</StatusBadge>
        </td>
        <td className="px-6 py-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleServiceVisibility(service);
            }}
            disabled={Boolean(isLocked)}
            title={isLocked ? 'Feature is locked' : service.isVisible === false ? 'Hidden — click to show' : 'Visible — click to hide'}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              isLocked
                ? 'text-slate-200 cursor-not-allowed'
                : service.isVisible === false
                  ? 'text-slate-400 hover:bg-slate-100'
                  : 'text-[var(--brand)] hover:bg-[var(--brand-soft)]'
            }`}
          >
            {service.isVisible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-6 py-4">
          <span
            className={`m-inventory-badge ${
              service.isCommissionable ? 'text-[var(--brand)]' : 'text-slate-300'
            }`}
          >
            {service.isCommissionable ? 'Eligible' : 'Excluded'}
          </span>
        </td>
        <td className="px-6 py-4">
          <span className="m-caption font-semibold text-amber-600">+{service.points}</span>
        </td>
        <td className="px-6 py-4 text-right font-bold text-[var(--text-primary)] text-sm">
          ${service.price.toLocaleString()}
        </td>
        <td className="px-6 py-4 text-right">
          <div onClick={(e) => e.stopPropagation()}>
            <RowActionsMenu
              rowId={service.id}
              disabled={Boolean(isLocked)}
              onEdit={() => handleOpenEditModal(service, 'services')}
              onDelete={() => setItemToDelete({ id: service.id, name: service.name, type: 'services' })}
            />
          </div>
        </td>
      </tr>
    );
  };
  // Products/packages have no stock or hidden concept beyond what's modeled here — this only
  // reads the existing stock number using the same <=5 threshold already used elsewhere in this file.
  const productStatus = (stock: number): { tone: StatusTone; label: string } => {
    if (stock <= 0) return { tone: 'danger', label: 'Out of Stock' };
    if (stock <= LOW_STOCK_THRESHOLD) return { tone: 'warning', label: 'Low Stock' };
    return { tone: 'success', label: 'Active' };
  };

  // Compact 3-dot row menu — mirrors the existing per-row menu pattern already used for package services below.
  const RowActionsMenu: React.FC<{
    rowId: string;
    disabled?: boolean;
    onEdit: () => void;
    onDelete: () => void;
  }> = ({ rowId, disabled, onEdit, onDelete }) => {
    const open = openRowMenuId === rowId;
    return (
      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpenRowMenuId(open ? null : rowId)}
          disabled={disabled}
          aria-label="Row actions"
          aria-haspopup="menu"
          aria-expanded={open}
          className={`p-2 rounded-lg transition-colors ${
            disabled ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpenRowMenuId(null)} />
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[140px]"
            >
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setOpenRowMenuId(null);
                  onEdit();
                }}
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  setOpenRowMenuId(null);
                  onDelete();
                }}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    // Get outletID once for all types
    const outletID = getCurrentOutletID() || 
      (editingItem as Service)?.outletID || 
      (editingItem as Product)?.outletID || 
      (editingItem as Package)?.outletID || 
      '';
    
    if (!outletID) {
      alert('Error: No outlet assigned. Cannot save item. Please contact your administrator.');
      return;
    }

    setIsUploadingImage(true);
    let imageUrl = formData.imageUrl || '';

    try {
      if (formData.type === 'service') {
        if (editingItem) {
          // Update existing service
          if (!editingItem.id) {
            alert('Error: Cannot update service without a valid ID.');
            setIsUploadingImage(false);
            return;
          }
          
          // Handle image upload for update
          const existingService = editingItem as Service;
          if (imageFile) {
            const imagePath = getServiceImagePath(outletID, editingItem.id, imageFile.name);
            imageUrl = await uploadImage(imageFile, imagePath);
            // Delete old image if it exists
            if (existingService.imageUrl) {
              await deleteImage(existingService.imageUrl);
            }
          } else {
            // Keep existing image if no new file selected
            imageUrl = existingService.imageUrl || '';
          }

          const serviceData: Service = {
            id: editingItem.id,
            outletID: outletID,
            name: formData.name,
            price: formData.price,
            duration: formData.duration,
            category: formData.category,
            categoryId: formData.category,
            points: Number(formData.points) || 0,
            isCommissionable: formData.isCommissionable,
            redeemPointsEnabled: !!formData.redeemPointsEnabled,
            redeemPoints: formData.redeemPoints ? Number(formData.redeemPoints) : undefined,
            isVisible: formData.isVisible !== false,
            description: formData.description,
            imageUrl: imageUrl || undefined,
            iconId: formData.iconId || undefined,
            createdAt: existingService.createdAt || new Date().toISOString()
          };
          await onUpdateService(serviceData);
        } else {
          // Add new service - create service first, then upload image
          const serviceData: Service = {
            id: '', // Will be set by Firestore
            outletID: outletID,
            name: formData.name,
            price: formData.price,
            duration: formData.duration,
            category: formData.category,
            categoryId: formData.category,
            points: Number(formData.points) || 0,
            isCommissionable: formData.isCommissionable,
            redeemPointsEnabled: !!formData.redeemPointsEnabled,
            redeemPoints: formData.redeemPoints ? Number(formData.redeemPoints) : undefined,
            isVisible: formData.isVisible !== false,
            description: formData.description,
            iconId: formData.iconId || undefined,
            createdAt: new Date().toISOString()
          };
          
          // Create service first to get the ID
          const { id: _omitId, ...serviceWithoutId } = serviceData;
          const newServiceId = await onAddService(serviceWithoutId);
          
          // Upload image with the correct service ID
          if (imageFile && newServiceId) {
            const imagePath = getServiceImagePath(outletID, newServiceId, imageFile.name);
            imageUrl = await uploadImage(imageFile, imagePath);
            
            // Update service with image URL
            const updatedService: Service = {
              ...serviceData,
              id: newServiceId,
              categoryId: formData.category,
              imageUrl: imageUrl,
              iconId: formData.iconId || undefined
            };
            await onUpdateService(updatedService);
          }
        }
      } else if (formData.type === 'product') {
        const productData: Product = {
          id: editingItem?.id || '',
          outletID: outletID,
          name: formData.name,
          price: formData.price,
          stock: formData.stock,
          category: formData.category,
          fixedCommissionAmount:
            typeof formData.fixedCommissionAmount === 'number'
              ? formData.fixedCommissionAmount
              : parseFloat(formData.fixedCommissionAmount || '0') || 0
        };
        if (editingItem) {
          if (!editingItem.id) {
            alert('Error: Cannot update product without a valid ID.');
            setIsUploadingImage(false);
            return;
          }
          await onUpdateProduct(productData);
        } else {
          const { id, ...productWithoutId } = productData;
          await onAddProduct(productWithoutId as Omit<Product, 'id'>);
        }
      } else if (formData.type === 'package') {
        const packageData: Package = {
          id: editingItem?.id || '',
          outletID: outletID,
          name: formData.name,
          price: formData.price,
          points: Number(formData.points) || 0, // Ensure points is a number and properly saved
          category: formData.category,
          services: formData.packageServices,
          description: formData.description,
          createdAt: (editingItem as Package)?.createdAt || new Date().toISOString()
        };
        if (editingItem) {
          if (!editingItem.id) {
            alert('Error: Cannot update package without a valid ID.');
            setIsUploadingImage(false);
            return;
          }
          await onUpdatePackage(packageData);
        } else {
          const { id, ...packageWithoutId } = packageData;
          await onAddPackage(packageWithoutId as Omit<Package, 'id'>);
        }
      }
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert(`Failed to save ${formData.type}: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploadingImage(false);
      setImageFile(null);
      setImagePreview(null);
      setShowItemModal(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete || isLocked) return;
    
    try {
      // Find the item to get its imageUrl for deletion
      let itemToDeleteWithImage: Service | Product | Package | null = null;
      if (itemToDelete.type === 'services') {
        itemToDeleteWithImage = services.find(s => s.id === itemToDelete.id) || null;
        await onDeleteService(itemToDelete.id);
      } else if (itemToDelete.type === 'products') {
        itemToDeleteWithImage = products.find(p => p.id === itemToDelete.id) || null;
        await onDeleteProduct(itemToDelete.id);
      } else if (itemToDelete.type === 'packages') {
        itemToDeleteWithImage = packages.find(p => p.id === itemToDelete.id) || null;
        await onDeletePackage(itemToDelete.id);
      }
      
      // Delete associated image if it exists
      if (itemToDeleteWithImage && 'imageUrl' in itemToDeleteWithImage && itemToDeleteWithImage.imageUrl) {
        await deleteImage(itemToDeleteWithImage.imageUrl);
      }
      
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Error deleting item:', error);
      alert(`Failed to delete ${itemToDelete.type}: ${error.message || 'Unknown error'}`);
      // Keep modal open on error so user can try again
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (newCategoryName.trim()) {
      await Promise.resolve(onAddCategory(newCategoryName.trim()));
      setNewCategoryName('');
    }
  };

  const handleSaveEditCategory = async () => {
    const newName = editingCategoryValue.trim();
    if (!editingCategory || !newName || !onEditCategory) return;
    if (newName !== editingCategory && categories.includes(newName)) return;
    await Promise.resolve(onEditCategory(editingCategory, newName));
    setEditingCategory(null);
    setEditingCategoryValue('');
  };

  const handleReorderCategoriesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = reorderCategoriesList.indexOf(active.id as string);
    const newIndex = reorderCategoriesList.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    setReorderCategoriesList(arrayMove(reorderCategoriesList, oldIndex, newIndex));
  };

  const handleSaveReorderCategories = async () => {
    if (onReorderCategories && reorderCategoriesList.length > 0) {
      await Promise.resolve(onReorderCategories(reorderCategoriesList));
      setShowRearrangeCategoriesModal(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const handleAddServiceToPackage = (serviceId: string) => {
    if (!serviceId) return;
    const exists = formData.packageServices.find((ps: PackageService) => ps.serviceId === serviceId);
    if (exists) {
      setFormData({
        ...formData,
        packageServices: formData.packageServices.map((ps: PackageService) => ps.serviceId === serviceId ? { ...ps, quantity: ps.quantity + 1 } : ps)
      });
    } else {
      setFormData({
        ...formData,
        packageServices: [...formData.packageServices, { serviceId, quantity: 1 }]
      });
    }
  };

  const handleRemoveServiceFromPackage = (serviceId: string) => {
    setFormData({
      ...formData,
      packageServices: formData.packageServices.filter((ps: PackageService) => ps.serviceId !== serviceId)
    });
  };

  const handleUpdatePackageServiceQty = (serviceId: string, quantity: number) => {
    setFormData({
      ...formData,
      packageServices: formData.packageServices.map((ps: PackageService) => ps.serviceId === serviceId ? { ...ps, quantity: Math.max(1, quantity) } : ps)
    });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes <= 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  };

  const packageServicesTotals = useMemo(() => {
    let totalMinutes = 0;
    let totalPrice = 0;
    formData.packageServices.forEach((ps) => {
      const srv = services.find((s) => s.id === ps.serviceId);
      if (srv) {
        totalMinutes += (srv.duration ?? 0) * ps.quantity;
        totalPrice += (srv.price ?? 0) * ps.quantity;
      }
    });
    return { totalMinutes, totalPrice };
  }, [formData.packageServices, services]);

  const discountedPricePerService = useMemo(() => {
    const packagePrice = Number(formData.price) || 0;
    if (formData.packageServices.length === 0 || packagePrice <= 0) return [];
    const totalListPrice = packageServicesTotals.totalPrice;
    if (totalListPrice <= 0) return [];
    return formData.packageServices.map((ps) => {
      const srv = services.find((s) => s.id === ps.serviceId);
      const name = srv?.name || 'Service';
      const lineTotal = (srv?.price ?? 0) * ps.quantity;
      const allocated = totalListPrice > 0 ? (packagePrice * lineTotal) / totalListPrice : packagePrice / formData.packageServices.length;
      const perUnit = ps.quantity > 0 ? allocated / ps.quantity : 0;
      return { serviceId: ps.serviceId, name, perUnit, quantity: ps.quantity };
    });
  }, [formData.packageServices, formData.price, services, packageServicesTotals.totalPrice]);

  const serviceSelectorGrouped = useMemo(() => {
    const q = serviceSelectorSearch.trim().toLowerCase();
    const filtered = q
      ? services.filter((s) => (s.name || '').toLowerCase().includes(q))
      : services;
    const byCategory: Record<string, Service[]> = {};
    filtered.forEach((s) => {
      const cat = s.category || s.categoryId || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(s);
    });
    Object.keys(byCategory).forEach((cat) => byCategory[cat].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    return Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b));
  }, [services, serviceSelectorSearch]);

  const closeItemModal = () => {
    setShowItemModal(false);
    setImagePreview(null);
    setImageFile(null);
    setShowServiceSelectorModal(false);
    setOpenPackageServiceMenuId(null);
  };

  const itemModalTitle = `${editingItem ? 'Edit' : 'Add New'} ${
    formData.type === 'service' ? 'Service' : formData.type === 'product' ? 'Product' : 'Package'
  }`;
  const itemModalTitleNode = (
    <span className="block">
      <span className="block text-[11px] font-bold tracking-wide uppercase text-[var(--text-muted)]">
        {itemModalTitle}
      </span>
      <span className="block text-lg font-bold text-[var(--text-primary)] mt-0.5 truncate">
        {formData.name || 'Untitled'}
      </span>
    </span>
  );
  const EDIT_TABS: { id: 'details' | 'pricing' | 'availability' | 'media'; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'availability', label: 'Availability' },
    { id: 'media', label: 'Media' },
  ];
  // Products/packages keep their existing single-scroll layout (always shown, ignores the tab state).
  // Services get the same fields grouped behind Details/Pricing/Availability/Media.
  const showSection = (tabId: 'details' | 'pricing' | 'availability' | 'media') =>
    formData.type !== 'service' || editPanelTab === tabId;

  const filteredCount =
    activeTab === 'services'
      ? filteredServices.length
      : activeTab === 'products'
        ? filteredProducts.length
        : filteredPackages.length;
  const countNoun =
    activeTab === 'services' ? 'services' : activeTab === 'products' ? 'products' : 'packages';
  const fabLabel =
    activeTab === 'services'
      ? 'Add Service'
      : activeTab === 'products'
        ? 'Add Product'
        : 'Add Package';

  const renderServiceFallback = (service: Service) => (
    <div className="w-full h-full bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center text-sm">
      {service.iconId ? renderServiceIcon(service.iconId, 'w-5 h-5') : getCategoryIcon(service.category)}
    </div>
  );

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ——— Mobile chrome (below 768px) ——— */}
      <div className="md:hidden space-y-3">
        <InventoryOutletCard />

        <div>
          <h1 className="m-inventory-page-title">Menu & Inventory</h1>
          <p className="m-inventory-page-sub">
            Manage your services, products and packages.
          </p>
        </div>

        <InventoryTypeTabs activeTab={activeTab} onChange={setActiveTab} />

        <InventoryToolbar
          categories={categoriesForTab}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchQuery={menuSearchQuery}
          onSearchChange={setMenuSearchQuery}
          sortBy={menuSortBy}
          onSortChange={setMenuSortBy}
          onOpenFiltersSheet={() => setFiltersSheetOpen(true)}
          onOpenSortSheet={() => setSortSheetOpen(true)}
          activeTab={activeTab}
        />

        <div className="m-inventory-count-row">
          <span>
            {filteredCount} {countNoun}
          </span>
          {outletId ? (
            <span className="m-inventory-live">
              <span className="m-inventory-live__dot" aria-hidden />
              Live outlet
            </span>
          ) : null}
        </div>
      </div>

      {/* ——— Desktop header + toolbar ——— */}
      <div className="hidden md:block space-y-4">
        {/* Row 1: title + live badge | Categories / Rearrange / New X */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="m-page-header--compact ui-page-title truncate">Menu &amp; Inventory</h1>
            {outletId ? (
              <span className="m-pos-live-badge inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success-border)] shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" aria-hidden />
                Live outlet
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={Boolean(isLocked)}
              onClick={() => !isLocked && setShowCategoryModal(true)}
            >
              {isLocked ? <Icons.Lock /> : <Icons.Settings />} Categories
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={Boolean(isLocked)}
              onClick={() => {
                if (isLocked) return;
                setReorderCategoriesList([...categories]);
                setShowRearrangeCategoriesModal(true);
              }}
            >
              {isLocked ? <Icons.Lock /> : <GripVertical className="w-4 h-4" />} Rearrange
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenAddModal} disabled={Boolean(isLocked)}>
              {fabLabel}
            </Button>
          </div>
        </div>

        {/* Row 2: search + type tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden />
            <label className="sr-only" htmlFor="inventory-search-desktop">
              Search services, products, packages
            </label>
            <input
              id="inventory-search-desktop"
              type="search"
              placeholder="Search services, products, packages..."
              value={menuSearchQuery}
              onChange={(e) => setMenuSearchQuery(e.target.value)}
              className="m-inventory-search w-full h-10 pl-9 pr-3 rounded-ui-sm border border-[var(--line-strong)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus-visible:shadow-ui-focus-strong"
            />
          </div>
          <InventoryTypeTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Row 3: category / status / visibility filters (left), sort (right) */}
        <InventoryToolbar
          categories={categoriesForTab}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          searchQuery={menuSearchQuery}
          onSearchChange={setMenuSearchQuery}
          sortBy={menuSortBy}
          onSortChange={setMenuSortBy}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          visibilityFilter={visibilityFilter}
          onVisibilityFilterChange={setVisibilityFilter}
          onOpenFiltersSheet={() => setFiltersSheetOpen(true)}
          activeTab={activeTab}
        />

        {/* KPI summary cards — computed from the full catalog, not the current filtered view */}
        <InventoryKpiCards
          totalItems={kpiTotals.totalItems}
          activeItems={kpiTotals.activeItems}
          lowStockItems={kpiTotals.lowStockItems}
          outOfStockItems={kpiTotals.outOfStockItems}
          hiddenItems={kpiTotals.hiddenItems}
        />
      </div>

      <InventoryFiltersSheet
        open={filtersSheetOpen}
        onClose={() => setFiltersSheetOpen(false)}
        categories={categoriesForTab}
        selectedCategory={selectedCategory}
        onCategoryChange={(cat) => {
          setSelectedCategory(cat);
        }}
      />

      <InventorySortSheet
        open={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        sortBy={menuSortBy}
        onSortChange={setMenuSortBy}
      />

      {/* Mobile inventory cards */}
      <div className="m-service-list md:hidden flex flex-col space-y-0">
        {activeTab === 'services' && filteredServices.length === 0 && (
          <InventoryEmptyState title="No services found" />
        )}
        {activeTab === 'services' &&
          sortItems(filteredServices, menuSortBy).map((service) => {
            const durationLabel = `${service.duration} mins`;
            return (
              <InventoryEntityCard
                key={service.id}
                name={service.name}
                priceLabel={`$${service.price.toLocaleString()}`}
                metaLabel={`${durationLabel} • ${service.category || '—'}`}
                secondaryLabel={durationLabel}
                visible={service.isVisible !== false}
                imageUrl={service.imageUrl}
                fallback={renderServiceFallback(service)}
                actionsDisabled={Boolean(isLocked)}
                onEdit={() => !isLocked && handleOpenEditModal(service, 'services')}
                onDelete={() => !isLocked && setItemToDelete({ id: service.id, name: service.name, type: 'services' })}
              />
            );
          })}        {activeTab === 'products' && filteredProducts.length === 0 && (
          <InventoryEmptyState title="No products found" />
        )}
        {activeTab === 'products' &&
          filteredProducts.map((product) => (
            <InventoryEntityCard
              key={product.id}
              name={product.name}
              priceLabel={`$${product.price.toLocaleString()}`}
              metaLabel={product.category || '—'}
              secondaryLabel={`Stock: ${product.stock}`}
              lowStock={product.stock <= 5}
              visible
              fallback={
                <div className="w-full h-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Icons.POS />
                </div>
              }
              actionsDisabled={Boolean(isLocked)}
              onEdit={() => !isLocked && handleOpenEditModal(product, 'products')}
              onDelete={() => !isLocked && setItemToDelete({ id: product.id, name: product.name, type: 'products' })}
            />
          ))}
        {activeTab === 'packages' && filteredPackages.length === 0 && (
          <InventoryEmptyState title="No packages found" />
        )}
        {activeTab === 'packages' &&
          filteredPackages.map((pkg) => {
            const itemCount = pkg.services?.length || 0;
            return (
              <InventoryEntityCard
                key={pkg.id}
                name={pkg.name}
                priceLabel={`$${pkg.price.toLocaleString()}`}
                metaLabel={`${itemCount} items • ${pkg.category || '—'}`}
                secondaryLabel={`${itemCount} items`}
                visible
                fallback={
                  <div className="w-full h-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icons.Package />
                  </div>
                }
                actionsDisabled={Boolean(isLocked)}
                onEdit={() => !isLocked && handleOpenEditModal(pkg, 'packages')}
                onDelete={() => !isLocked && setItemToDelete({ id: pkg.id, name: pkg.name, type: 'packages' })}
              />
            );
          })}
      </div>

      {/* Floating Add — mobile only */}
      <button
        type="button"
        className="m-inventory-fab md:hidden focus-visible:shadow-ui-focus-strong"
        onClick={handleOpenAddModal}
        disabled={Boolean(isLocked)}
        aria-label={fabLabel}
      >
        <Plus className="h-5 w-5" aria-hidden />
        {fabLabel}
      </button>

      <div className="hidden md:block bg-[var(--bg-surface)] rounded-ui-md border border-[var(--line)] shadow-ui-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 m-settings-label text-[var(--text-muted)] uppercase tracking-widest">
                {activeTab === 'services' && <th className="px-3 py-4 w-8"></th>}
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Category</th>
                {activeTab === 'services' && <th className="px-6 py-4">Duration</th>}
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Visibility</th>
                {activeTab === 'services' && (
                  <>
                    <th className="px-6 py-4">Commission</th>
                    <th className="px-6 py-4">Loyalty Pts</th>
                  </>
                )}
                {activeTab === 'products' && (
                  <th className="px-6 py-4">Stock Level</th>
                )}
                {activeTab === 'packages' && (
                  <>
                    <th className="px-6 py-4">Included Items</th>
                    <th className="px-6 py-4">Loyalty Pts</th>
                  </>
                )}
                <th className="px-6 py-4 text-right">Rate</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'services' && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={serviceOrder} strategy={verticalListSortingStrategy}>
                    {serviceOrder.map((id) => {
                      const service = filteredServices.find((s) => s.id === id);
                      if (!service) return null;
                      return <SortableServiceRow key={service.id} service={service} />;
                    })}
                  </SortableContext>
                </DndContext>
              )}
              {activeTab === 'services' && filteredServices.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                    No services found. Try changing the category or search.
                  </td>
                </tr>
              )}
              {activeTab === 'products' && paginatedProducts.map(product => {
                const status = productStatus(product.stock);
                return (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600"><Icons.POS /></div>
                      <span className="text-sm font-bold text-slate-800">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="m-inventory-badge bg-[var(--bg-soft)] text-[var(--text-muted)]">{product.category}</span></td>
                  <td className="px-6 py-4">
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </td>
                  <td className="px-6 py-4 text-slate-300" aria-label="Visibility not tracked for products">—</td>
                  <td className="px-6 py-4"><span className={`text-xs font-bold ${product.stock <= LOW_STOCK_THRESHOLD ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>{product.stock} units</span></td>
                  <td className="px-6 py-4 text-right font-bold text-[var(--text-primary)] text-sm">${product.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActionsMenu
                        rowId={product.id}
                        disabled={Boolean(isLocked)}
                        onEdit={() => handleOpenEditModal(product, 'products')}
                        onDelete={() => setItemToDelete({ id: product.id, name: product.name, type: 'products' })}
                      />
                    </div>
                  </td>
                </tr>
                );
              })}
              {activeTab === 'products' && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No products found. Try changing the category or search.
                  </td>
                </tr>
              )}
              {activeTab === 'packages' && paginatedPackages.map(pkg => (
                <tr key={pkg.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600"><Icons.Package /></div>
                      <span className="text-sm font-bold text-slate-800">{pkg.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="m-inventory-badge bg-[var(--bg-soft)] text-[var(--text-muted)]">{pkg.category}</span></td>
                  <td className="px-6 py-4">
                    {/* Packages have no stock concept, so they are always "Active" in the status sense. */}
                    <StatusBadge tone="success">Active</StatusBadge>
                  </td>
                  <td className="px-6 py-4 text-slate-300" aria-label="Visibility not tracked for packages">—</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {pkg.services.map((ps, idx) => {
                        const s = services.find(srv => srv.id === ps.serviceId);
                        return <span key={idx} className="m-caption font-semibold text-[var(--text-muted)]">{ps.quantity}x {s?.name || 'Unknown'}</span>
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="m-caption font-semibold text-amber-600">+{pkg.points}</span></td>
                  <td className="px-6 py-4 text-right font-bold text-[var(--text-primary)] text-sm">${pkg.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActionsMenu
                        rowId={pkg.id}
                        disabled={Boolean(isLocked)}
                        onEdit={() => handleOpenEditModal(pkg, 'packages')}
                        onDelete={() => setItemToDelete({ id: pkg.id, name: pkg.name, type: 'packages' })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {activeTab === 'packages' && filteredPackages.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No packages found. Try changing the category or search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — client-side only, over already-loaded records. Services keep the full
            drag-reorderable list (see catalogPage effect above) since paginating it would require
            restructuring the reorder feature itself. */}
        {(activeTab === 'products' || activeTab === 'packages') && totalForPagination > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-[var(--line)]">
            <p className="text-xs text-[var(--text-muted)]">
              Showing {(catalogPage - 1) * catalogPageSize + 1} to{' '}
              {Math.min(catalogPage * catalogPageSize, totalForPagination)} of {totalForPagination} items
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                  disabled={catalogPage <= 1}
                  aria-label="Previous page"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-soft)]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - catalogPage) <= 1)
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-[var(--text-muted)]">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCatalogPage(p)}
                        aria-current={p === catalogPage ? 'page' : undefined}
                        className={`w-8 h-8 inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                          p === catalogPage
                            ? 'bg-[var(--brand)] text-white'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                <button
                  type="button"
                  onClick={() => setCatalogPage((p) => Math.min(totalPages, p + 1))}
                  disabled={catalogPage >= totalPages}
                  aria-label="Next page"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-soft)]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <label className="sr-only" htmlFor="inventory-page-size">
                Items per page
              </label>
              <select
                id="inventory-page-size"
                value={catalogPageSize}
                onChange={(e) => {
                  setCatalogPageSize(Number(e.target.value));
                  setCatalogPage(1);
                }}
                className="h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)]"
              >
                <option value={8}>8 / page</option>
                <option value={16}>16 / page</option>
                <option value={24}>24 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Item Modal — presentation chrome via InventoryEditPanel; handlers unchanged */}
      <InventoryEditPanel
        open={showItemModal}
        title={itemModalTitleNode}
        onClose={closeItemModal}
        formId="inventory-edit-form"
        saving={isUploadingImage}
        saveDisabled={Boolean(isLocked)}
      >
            <form id="inventory-edit-form" onSubmit={handleSubmit} className={`m-inventory-editor ${formData.type === 'package' ? 'space-y-8' : 'space-y-6'}`}>
              {/* Details / Pricing / Availability / Media tabs — services only. Products and packages
                  keep their existing single-scroll layout below: their smaller field sets don't gain
                  anything from tab-splitting, and forcing empty tabs onto them isn't the goal here. */}
              {formData.type === 'service' && (
                <div role="tablist" aria-label="Edit sections" className="flex items-center gap-1 -mt-2 mb-4 border-b border-[var(--line-soft)]">
                  {EDIT_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={editPanelTab === tab.id}
                      onClick={() => setEditPanelTab(tab.id)}
                      className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                        editPanelTab === tab.id
                          ? 'border-[var(--brand)] text-[var(--brand)]'
                          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Service Image / Icon Section */}
              {formData.type === 'service' && editPanelTab === 'media' && (
                <div className="mb-6">
                  <label className="m-settings-label block uppercase">Service Image</label>
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Preview: uploaded image, selected icon, or placeholder */}
                    <div className="flex-shrink-0">
                      {imagePreview ? (
                        <div className="relative">
                          <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-ui-sm object-cover border-2 border-[var(--line)]" />
                          <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-600" title="Remove image">×</button>
                        </div>
                      ) : formData.iconId ? (
                        <div className="w-20 h-20 rounded-xl bg-[var(--brand-soft)] border-2 border-[var(--brand)]/30 flex items-center justify-center text-[var(--brand)]">
                          {renderServiceIcon(formData.iconId, 'w-10 h-10')}
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-ui-sm bg-[var(--bg-soft)] border-2 border-dashed border-[var(--line-strong)] flex items-center justify-center text-app-section">
                          {getCategoryIcon(formData.category)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-[200px] space-y-2">
                      <p className="m-settings-label uppercase">Photo Library</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="service-image-upload" />
                        <label htmlFor="service-image-upload" className="w-14 h-14 rounded-xl bg-[var(--brand-soft)] border-2 border-dashed border-[var(--brand)]/40 flex items-center justify-center text-[var(--brand)] cursor-pointer hover:bg-[var(--bg-selection)] transition-colors" title="Upload Image">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </label>
                        <button type="button" onClick={() => setShowIconPickerModal(true)} className="m-btn m-btn--secondary m-btn--sm">
                          Select Icon
                        </button>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">Upload image or choose a preset icon. JPG, PNG or GIF (max 5MB).</p>
                    </div>
                  </div>
                </div>
              )}
              
              {formData.type === 'package' ? (
                <div className="space-y-10">
                  <section className="space-y-6">
                    <h4 className="text-app-section font-bold text-[var(--text-primary)]">Basic info</h4>
                    <div>
                      <label className="m-settings-label block mb-2">Bundle name</label>
                      <input
                        required
                        type="text"
                        placeholder="Add a bundle name, e.g. Cut and blow-dry"
                        className="m-settings-control w-full"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="m-settings-label block mb-2">Category</label>
                      <select
                        required
                        className="m-settings-control w-full appearance-none cursor-pointer"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <p className="mt-1.5 text-xs text-[var(--text-muted)]">The category displayed to you, and to clients online.</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="m-settings-label block">Description (Optional)</label>
                        <span className="text-xs text-[var(--text-muted)]">{(formData.description || '').length}/{DESCRIPTION_MAX_LENGTH}</span>
                      </div>
                      <textarea
                        rows={4}
                        maxLength={DESCRIPTION_MAX_LENGTH}
                        placeholder="Add a description about this bundle"
                        className="m-settings-control w-full resize-none"
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="m-settings-label block mb-2">Price (RM)</label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          className="m-settings-control w-full font-medium"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="m-settings-label block mb-2">Loyalty points</label>
                        <input
                          required
                          type="number"
                          min={0}
                          step={1}
                          className="m-settings-control w-full font-medium"
                          value={formData.points ?? 0}
                          onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </section>
                  <section className="space-y-4 pt-6 border-t border-[var(--line-soft)]">
                    <h4 className="text-app-section font-bold text-[var(--text-primary)]">Services</h4>
                    <p className="text-sm text-[var(--text-secondary)]">Select which services to include in this bundle and how they should be sequenced when booked.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceSelectorSearch('');
                        setShowServiceSelectorModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-sm text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:border-[var(--line-strong)] transition-colors"
                    >
                      <span className="w-6 h-6 rounded-full border-2 border-[var(--line-strong)] flex items-center justify-center text-[var(--text-muted)] flex-shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </span>
                      Add service
                    </button>
                    <div className="space-y-0 max-h-[280px] overflow-y-auto">
                      {formData.packageServices.map((ps: PackageService, idx: number) => {
                        const srv = services.find((s) => s.id === ps.serviceId);
                        const unitMins = srv?.duration ?? 60;
                        const totalMins = unitMins * ps.quantity;
                        const totalRowPrice = (srv?.price ?? 0) * ps.quantity;
                        const durationLabel = ps.quantity > 1
                          ? `${ps.quantity} times · ${formatDuration(totalMins)}`
                          : formatDuration(unitMins);
                        return (
                          <div
                            key={ps.serviceId + idx}
                            className="flex items-center justify-between gap-4 py-3 px-4 border-b border-[var(--line-soft)] last:border-b-0 bg-[var(--bg-surface)] hover:bg-[var(--bg-soft)] transition-colors border-l-4 border-l-[var(--brand)]"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-[var(--text-primary)] truncate">{srv?.name || 'Deleted Service'}</p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">{durationLabel}</p>
                            </div>
                            <span className="text-sm font-bold text-[var(--text-secondary)] flex-shrink-0">RM {totalRowPrice.toFixed(0)}</span>
                            <div className="flex items-center gap-1 flex-shrink-0 relative">
                              <input
                                type="number"
                                min={1}
                                className="w-12 p-1.5 text-center bg-[var(--bg-soft)] border border-[var(--line)] rounded-ui-xs text-sm font-semibold text-[var(--text-primary)]"
                                value={ps.quantity}
                                onChange={(e) => handleUpdatePackageServiceQty(ps.serviceId, Math.max(1, parseInt(e.target.value) || 1))}
                                aria-label="Quantity"
                              />
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setOpenPackageServiceMenuId((id) => (id === ps.serviceId ? null : ps.serviceId))}
                                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] rounded-ui-sm transition-colors"
                                  aria-label="Options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {openPackageServiceMenuId === ps.serviceId && (
                                  <>
                                    <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpenPackageServiceMenuId(null)} />
                                    <div className="absolute right-0 top-full mt-1 py-1 bg-[var(--bg-surface)] border border-[var(--line)] rounded-ui-sm shadow-ui-md z-20 min-w-[120px]">
                                      <button
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                                        onClick={() => {
                                          handleRemoveServiceFromPackage(ps.serviceId);
                                          setOpenPackageServiceMenuId(null);
                                        }}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {formData.packageServices.length === 0 && (
                        <p className="text-sm text-[var(--text-muted)] text-center py-6">No services added yet. Click &quot;Add service&quot; to include treatments.</p>
                      )}
                    </div>
                    {formData.packageServices.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[var(--line)] space-y-2">
                        <div className="flex justify-end">
                          <div className="bg-[var(--warning-soft)] border border-[var(--warning-border)] rounded-ui-sm px-4 py-2.5 inline-flex items-baseline gap-3">
                            <span className="text-sm font-semibold text-[var(--text-secondary)]">Total duration: {formatDuration(packageServicesTotals.totalMinutes)}</span>
                            <span className="text-sm font-bold text-[var(--text-primary)]">RM {packageServicesTotals.totalPrice.toFixed(0)}</span>
                          </div>
                        </div>
                        {discountedPricePerService.length > 0 && Number(formData.price) > 0 && (
                          <p className="text-sm text-[var(--text-secondary)] text-right">
                            {discountedPricePerService.map(({ serviceId, name, perUnit }) => (
                              <span key={serviceId} className="block mt-1">
                                RM{Math.round(perUnit)} per 1 {name}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {showSection('details') && (
                    <>
                      <div>
                        <label className="m-settings-label block uppercase">Name</label>
                        <input required type="text" className="m-settings-control w-full outline-none font-medium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="m-settings-label block uppercase">Category</label>
                        <select required className="m-settings-control w-full outline-none font-medium" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                  {showSection('pricing') && (
                    <div>
                      <label className="m-settings-label block uppercase">Price ($)</label>
                      <input required type="number" step="0.01" className="m-settings-control w-full outline-none font-bold text-lg" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                    </div>
                  )}
                  {(formData.type === 'service' || formData.type === 'package') && showSection('pricing') && (
                    <div>
                      <label className="m-settings-label block uppercase">Free Point (Loyalty)</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        className="m-settings-control w-full outline-none font-bold text-amber-600"
                        value={formData.points ?? 0}
                        onChange={e => {
                          const value = parseInt(e.target.value) || 0;
                          setFormData({ ...formData, points: value });
                        }}
                      />
                      <p className="mt-1 m-settings-hint">Free point is the point given to the customer when they buy this item.</p>
                    </div>
                  )}
                  {formData.type === 'service' && showSection('details') && (
                    <div>
                      <label className="m-settings-label block uppercase">Duration (Mins)</label>
                      <input required type="number" className="m-settings-control w-full outline-none font-medium" value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })} />
                    </div>
                  )}
                  {formData.type === 'service' && showSection('pricing') && (
                    <>
                      <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                        <input type="checkbox" checked={formData.isCommissionable} onChange={e => setFormData({ ...formData, isCommissionable: e.target.checked })} />
                        <span className="text-xs font-bold text-slate-700">Commission Eligible</span>
                      </label>
                      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="m-settings-label uppercase">Redeem Point</p>
                            <p className="m-settings-hint">Allow this service to be redeemed for free with member points.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, redeemPointsEnabled: !formData.redeemPointsEnabled })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              formData.redeemPointsEnabled ? 'bg-blue-500' : 'bg-slate-300'
                            }`}
                            aria-pressed={!!formData.redeemPointsEnabled}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                formData.redeemPointsEnabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <div>
                          <label className="m-settings-label block uppercase">Item Point Value</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={formData.redeemPoints ?? 0}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                redeemPoints: parseInt(e.target.value) || 0,
                              })
                            }
                            disabled={!formData.redeemPointsEnabled}
                            className={`w-full p-4 rounded-xl outline-none border text-sm font-semibold ${
                              formData.redeemPointsEnabled
                                ? 'bg-white border-blue-300 text-blue-700 focus:ring-2 focus:ring-blue-500'
                                : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          />
                          <p className="mt-1 m-settings-hint">
                            When a member has at least this many points, this service can be redeemed for free.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {formData.type === 'service' && showSection('availability') && (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="m-settings-label uppercase">Show on Booking Page</p>
                          <p className="m-settings-hint">When off, this service is hidden from the customer booking page but still available in POS.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={formData.isVisible !== false}
                          onClick={() => setFormData({ ...formData, isVisible: formData.isVisible === false })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            formData.isVisible !== false ? 'bg-[var(--brand-soft)]0' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              formData.isVisible !== false ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                  {formData.type === 'product' && (
                    <>
                      <div>
                        <label className="m-settings-label block uppercase">
                          Initial Stock
                        </label>
                        <input
                          required
                          type="number"
                          className="m-settings-control w-full outline-none font-medium"
                          value={formData.stock}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              stock: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="m-settings-label block uppercase">
                          Fixed Commission ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="m-settings-control w-full outline-none font-medium"
                          value={formData.fixedCommissionAmount ?? 0}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fixedCommissionAmount: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="mt-1 m-settings-hint">
                          This fixed amount will be paid as staff commission per sale of this product, instead of a percentage
                          rate.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {showSection('details') && (
                  <div className="space-y-4">
                    <div>
                      <label className="m-settings-label block uppercase">Description</label>
                      <textarea rows={8} className="m-settings-control w-full outline-none text-sm" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
              )}

              <div className={`pt-4 ${formData.type === 'package' ? 'border-t border-slate-100' : ''}`}>
                <button
                  type="button"
                  onClick={closeItemModal}
                  className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel without saving
                </button>
              </div>
            </form>
      </InventoryEditPanel>

      <AppModal
        open={showServiceSelectorModal}
        onClose={() => setShowServiceSelectorModal(false)}
        title="Services"
        description="Add a service to this package."
        size="md"
        zIndexClass="z-[95]"
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setShowServiceSelectorModal(false)}>
              Cancel
            </Button>
          </ModalFooterActions>
        }
      >
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Search by name"
            value={serviceSelectorSearch}
            onChange={(e) => setServiceSelectorSearch(e.target.value)}
            className={`${fieldControlClassName} pl-10`}
          />
        </div>
        <div className="space-y-4">
          {serviceSelectorGrouped.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] text-center py-8">
              No services match your search.
            </p>
          ) : (
            serviceSelectorGrouped.map(([categoryName, categoryServices]) => (
              <div key={categoryName}>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">{categoryName}</h4>
                <div className="overflow-hidden rounded-ui-md border border-[var(--line)]">
                  {categoryServices.map((s) => {
                    const durationMins = s.duration ?? 60;
                    const durationStr =
                      durationMins >= 60
                        ? `${Math.floor(durationMins / 60)}h${durationMins % 60 ? ` ${durationMins % 60}m` : ''}`
                        : `${durationMins}m`;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          handleAddServiceToPackage(s.id);
                          setShowServiceSelectorModal(false);
                        }}
                        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left border-b border-[var(--line)] last:border-b-0 bg-[var(--bg-surface)] hover:bg-[var(--bg-selection)] transition-colors border-l-4 border-l-transparent hover:border-l-[var(--brand)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {s.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{durationStr}</p>
                        </div>
                        <span className="text-sm font-bold text-[var(--text-primary)] flex-shrink-0">
                          MYR {Number(s.price ?? 0).toFixed(0)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </AppModal>

      <AppModal
        open={showIconPickerModal}
        onClose={() => setShowIconPickerModal(false)}
        title="Select Image"
        description="Upload a photo or pick an icon."
        size="lg"
        zIndexClass="z-[95]"
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setShowIconPickerModal(false)}>
              Cancel
            </Button>
          </ModalFooterActions>
        }
      >
        <div>
          <p className="text-app-label font-bold uppercase text-[var(--text-secondary)] mb-2">
            Photo Library
          </p>
          <div className="flex items-center gap-2">
            <label
              htmlFor="service-image-upload-picker"
              className="w-14 h-14 rounded-ui-md bg-[var(--brand-soft)] border-2 border-dashed border-[var(--brand)]/40 flex items-center justify-center text-[var(--brand)] cursor-pointer hover:bg-[var(--bg-selection)] transition-colors shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </label>
            <input
              id="service-image-upload-picker"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleImageChange(e);
                setShowIconPickerModal(false);
              }}
            />
            <span className="text-xs text-[var(--text-secondary)]">Upload your own image</span>
          </div>
        </div>
        {SERVICE_ICON_CATEGORIES.map((cat) => (
          <div key={cat.title}>
            <p className="text-app-label font-bold uppercase text-[var(--text-secondary)] mb-3">
              {cat.title}
            </p>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
              {cat.iconIds.map((iconId) => {
                const isSelected = formData.iconId === iconId;
                return (
                  <button
                    key={iconId}
                    type="button"
                    onClick={() => handleSelectIcon(iconId)}
                    className={`relative w-12 h-12 rounded-ui-md flex items-center justify-center border-2 transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[var(--brand-soft)] border-[var(--brand)] text-[var(--brand-deep)] ring-2 ring-[var(--brand)]/40'
                        : 'bg-[var(--bg-soft)] border-[var(--line)] text-[var(--text-secondary)] hover:bg-[var(--bg-selection)]'
                    }`}
                    title={iconId}
                  >
                    {renderServiceIcon(iconId, 'w-6 h-6')}
                    {isSelected && (
                      <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-[var(--brand)] rounded-full flex items-center justify-center text-white m-caption leading-none">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </AppModal>

      <ConfirmationDialog
        open={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (isLocked) return;
          void confirmDelete();
        }}
        title="Confirm Removal"
        description={
          itemToDelete
            ? isLocked
              ? `Inventory is locked. "${itemToDelete.name}" cannot be deleted right now.`
              : `Are you sure you want to delete "${itemToDelete.name}"?`
            : undefined
        }
        confirmLabel={itemToDelete ? `Yes, Delete ${itemToDelete.type}` : 'Delete'}
        tone="danger"
      />

      <AppModal
        open={showRearrangeCategoriesModal}
        onClose={() => setShowRearrangeCategoriesModal(false)}
        title="Rearrange Categories"
        description='Drag to reorder. "All" always stays first on the menu.'
        size="md"
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setShowRearrangeCategoriesModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReorderCategories}>Save Order</Button>
          </ModalFooterActions>
        }
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleReorderCategoriesDragEnd}
        >
          <SortableContext items={reorderCategoriesList} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {reorderCategoriesList.map((cat) => (
                <SortableCategoryItem key={cat} id={cat} name={cat} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </AppModal>

      <AppModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Manage Categories"
        description="Add, rename, or remove inventory categories."
        size="md"
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
              Close
            </Button>
          </ModalFooterActions>
        }
      >
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            required
            type="text"
            placeholder="New category..."
            className={`${fieldControlClassName} flex-1`}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <Button type="submit" size="md" aria-label="Add category">
            <Icons.Add />
          </Button>
        </form>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.map((cat) => (
            <div
              key={editingCategory === cat ? `editing-${cat}` : cat}
              className="flex items-center justify-between gap-2 p-3 bg-[var(--bg-soft)] rounded-ui-md border border-[var(--line)]"
            >
              {editingCategory === cat ? (
                <>
                  <input
                    type="text"
                    className={`${fieldControlClassName} flex-1 h-9`}
                    value={editingCategoryValue}
                    onChange={(e) => setEditingCategoryValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEditCategory();
                      if (e.key === 'Escape') {
                        setEditingCategory(null);
                        setEditingCategoryValue('');
                      }
                    }}
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveEditCategory}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingCategory(null);
                      setEditingCategoryValue('');
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-bold text-[var(--text-primary)] flex-1 truncate">
                    {cat}
                  </span>
                  {onEditCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setEditingCategoryValue(cat);
                      }}
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--brand)]"
                      title="Edit name"
                    >
                      <Icons.Edit />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => Promise.resolve(onDeleteCategory(cat))}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--danger)]"
                  >
                    <Icons.Trash />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </AppModal>
    </div>
  );
};

export default Services;
