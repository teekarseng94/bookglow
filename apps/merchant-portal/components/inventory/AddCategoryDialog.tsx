import React, { useEffect, useId, useState } from 'react';
import { AppModal } from '../ui/AppModal';
import { Button } from '../ui/Button';
import { ModalFooterActions } from '../ui/ModalParts';
import { fieldControlClassName } from '../ui/Field';
import { validateCategoryName } from '../../src/inventory/categories';

export interface AddCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  existing: string[];
  onAdd: (name: string) => void | Promise<void>;
  zIndexClass?: string;
}

export const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  open,
  onClose,
  existing,
  onAdd,
  zIndexClass = 'z-[110]',
}) => {
  const fieldId = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = validateCategoryName(name, existing);
    if (message) {
      setError(message);
      return;
    }
    setBusy(true);
    try {
      await Promise.resolve(onAdd(name.trim()));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add category.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Add category"
      description="This category is saved for your outlet and can be reused on services, products, and packages."
      size="sm"
      zIndexClass={zIndexClass}
      busy={busy}
      footer={
        <ModalFooterActions>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button form={`${fieldId}-form`} type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add category'}
          </Button>
        </ModalFooterActions>
      }
    >
      <form id={`${fieldId}-form`} onSubmit={submit} className="m-editor-stack">
        <div>
          <label htmlFor={fieldId} className="m-settings-label block uppercase">
            Category name
          </label>
          <input
            id={fieldId}
            autoFocus
            className={fieldControlClassName}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
          />
          {error ? (
            <p id={`${fieldId}-error`} className="mt-1 m-settings-hint text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </form>
    </AppModal>
  );
};

export default AddCategoryDialog;
