import { RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let scrollLockCount = 0;
let originalBodyOverflow = '';

interface DialogInteractionOptions {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement | null>;
}

/**
 * Shared keyboard and focus behavior for modal surfaces.
 * Keeps focus inside the active overlay, restores it on close, and safely
 * coordinates body scroll locking when overlays are nested.
 */
export const useDialogInteraction = ({
  open,
  busy,
  onClose,
  panelRef,
}: DialogInteractionOptions) => {
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);
  busyRef.current = busy;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusableElements = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [])
        .filter((element) => {
          const style = window.getComputedStyle(element);
          return (
            !element.hasAttribute('disabled') &&
            element.getAttribute('aria-hidden') !== 'true' &&
            style.display !== 'none' &&
            style.visibility !== 'hidden'
          );
        });

    const focusFrame = window.requestAnimationFrame(() => {
      const first = focusableElements()[0];
      (first ?? panelRef.current)?.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!busyRef.current) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = focusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    if (scrollLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollLockCount += 1;

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) document.body.style.overflow = originalBodyOverflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open, panelRef]);
};

export default useDialogInteraction;
