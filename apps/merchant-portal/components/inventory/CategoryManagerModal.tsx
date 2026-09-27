import React, { useEffect, useMemo, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppModal } from '../ui/AppModal';
import { Button } from '../ui/Button';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { ModalFooterActions } from '../ui/ModalParts';
import { fieldControlClassName } from '../ui/Field';
import { Icons } from '../../constants';
import {
  UNCATEGORIZED_CATEGORY,
  formatUsageSummary,
  usageTotal,
  validateCategoryName,
  type CategoryUsage,
} from '../../src/inventory/categories';

export interface CategoryManagerModalProps {
  open: boolean;
  onClose: () => void;
  categories: string[];
  locked?: boolean;
  usageFor: (category: string) => CategoryUsage;
  onAdd: (name: string) => void | Promise<void>;
  onRename?: (oldName: string, newName: string) => void | Promise<void>;
  onDelete: (category: string, options?: { reassignTo?: string }) => void | Promise<void>;
  onReorder?: (orderedNames: string[]) => void | Promise<void>;
}

const SortableRow: React.FC<{
  id: string;
  name: string;
  locked?: boolean;
  onStartEdit: () => void;
  onDelete: () => void;
}> = ({ id, name, locked, onStartEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
      }}
      className="flex items-center gap-2 p-2 bg-[var(--bg-soft)] rounded-ui-md border border-[var(--line)]"
    >
      <button
        type="button"
        className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-selection)] cursor-grab active:cursor-grabbing"
        aria-label={`Reorder ${name}`}
        disabled={locked}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-sm font-bold text-[var(--text-primary)] flex-1 truncate">{name}</span>
      <button
        type="button"
        onClick={onStartEdit}
        disabled={locked}
        className="p-2 min-h-11 min-w-11 text-[var(--text-muted)] hover:text-[var(--brand)]"
        aria-label={`Rename ${name}`}
      >
        <Icons.Edit />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={locked}
        className="p-2 min-h-11 min-w-11 text-[var(--text-muted)] hover:text-[var(--danger)]"
        aria-label={`Delete ${name}`}
      >
        <Icons.Trash />
      </button>
    </div>
  );
};

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  open,
  onClose,
  categories,
  locked,
  usageFor,
  onAdd,
  onRename,
  onDelete,
  onReorder,
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>(categories);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [reassignTo, setReassignTo] = useState('');

  useEffect(() => {
    if (open) {
      setOrder(categories);
      setNewName('');
      setAddError(null);
      setEditing(null);
      setPendingDelete(null);
    }
  }, [open, categories]);

  const pendingUsage = pendingDelete ? usageFor(pendingDelete) : null;
  const pendingUsed = pendingUsage ? usageTotal(pendingUsage) > 0 : false;
  const reassignOptions = useMemo(
    () => [
      ...order.filter((name) => name !== pendingDelete),
      ...(order.includes(UNCATEGORIZED_CATEGORY) || pendingDelete === UNCATEGORIZED_CATEGORY
        ? []
        : [UNCATEGORIZED_CATEGORY]),
    ],
    [order, pendingDelete],
  );

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (locked) return;
    const message = validateCategoryName(newName, order);
    if (message) {
      setAddError(message);
      return;
    }
    await Promise.resolve(onAdd(newName.trim()));
    setNewName('');
    setAddError(null);
  };

  const handleSaveEdit = async () => {
    if (!editing || !onRename) return;
    const message = validateCategoryName(editingValue, order, { ignore: editing });
    if (message) return;
    await Promise.resolve(onRename(editing, editingValue.trim()));
    setEditing(null);
    setEditingValue('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    void Promise.resolve(onReorder?.(next));
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingUsed && !reassignTo) return;
    await Promise.resolve(
      onDelete(pendingDelete, pendingUsed ? { reassignTo } : undefined),
    );
    setPendingDelete(null);
    setReassignTo('');
  };

  return (
    <>
      <AppModal
        open={open}
        onClose={onClose}
        title="Manage categories"
        description="Categories belong to this outlet. Deleting a category never deletes menu items."
        size="md"
        mobileFullscreen
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </ModalFooterActions>
        }
      >
        <form onSubmit={handleAdd} className="flex gap-2">
          <label className="sr-only" htmlFor="inventory-new-category">
            New category name
          </label>
          <input
            id="inventory-new-category"
            type="text"
            placeholder="New category…"
            className={`${fieldControlClassName} flex-1`}
            value={newName}
            disabled={locked}
            onChange={(event) => {
              setNewName(event.target.value);
              if (addError) setAddError(null);
            }}
            aria-invalid={Boolean(addError) || undefined}
            aria-describedby={addError ? 'inventory-new-category-error' : undefined}
          />
          <Button type="submit" size="md" disabled={locked} aria-label="Add category">
            <Icons.Add />
          </Button>
        </form>
        {addError ? (
          <p id="inventory-new-category-error" className="m-settings-hint text-[var(--danger)]" role="alert">
            {addError}
          </p>
        ) : null}

        {order.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No categories yet. Create your first category above.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {order.map((cat) =>
                  editing === cat ? (
                    <div key={`editing-${cat}`} className="flex items-center gap-2 p-2 bg-[var(--bg-soft)] rounded-ui-md border border-[var(--line)]">
                      <label className="sr-only" htmlFor={`rename-${cat}`}>
                        Rename {cat}
                      </label>
                      <input
                        id={`rename-${cat}`}
                        type="text"
                        className={`${fieldControlClassName} flex-1 h-9`}
                        value={editingValue}
                        onChange={(event) => setEditingValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void handleSaveEdit();
                          if (event.key === 'Escape') setEditing(null);
                        }}
                      />
                      <Button size="sm" variant="ghost" onClick={() => void handleSaveEdit()}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <SortableRow
                      key={cat}
                      id={cat}
                      name={cat}
                      locked={locked}
                      onStartEdit={() => {
                        setEditing(cat);
                        setEditingValue(cat);
                      }}
                      onDelete={() => {
                        const usage = usageFor(cat);
                        setPendingDelete(cat);
                        setReassignTo(
                          usageTotal(usage) > 0
                            ? order.find((name) => name !== cat) || UNCATEGORIZED_CATEGORY
                            : '',
                        );
                      }}
                    />
                  ),
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </AppModal>

      <ConfirmationDialog
        open={Boolean(pendingDelete) && !pendingUsed}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
        title={`Delete “${pendingDelete}”?`}
        description="This category is not used by any menu items."
        confirmLabel="Delete category"
        tone="danger"
        zIndexClass="z-[110]"
      />

      <AppModal
        open={Boolean(pendingDelete) && pendingUsed}
        onClose={() => setPendingDelete(null)}
        title={`Delete “${pendingDelete}”?`}
        description={
          pendingUsage
            ? `${formatUsageSummary(pendingUsage)} use this category. Choose where those items should go. Menu items will not be deleted.`
            : undefined
        }
        size="sm"
        zIndexClass="z-[110]"
        footer={
          <ModalFooterActions>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={!reassignTo}>
              Move items and delete
            </Button>
          </ModalFooterActions>
        }
      >
        <div>
          <label htmlFor="reassign-category" className="m-settings-label block uppercase">
            Move items to
          </label>
          <select
            id="reassign-category"
            className={fieldControlClassName}
            value={reassignTo}
            onChange={(event) => setReassignTo(event.target.value)}
          >
            {reassignOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </AppModal>
    </>
  );
};

export default CategoryManagerModal;
