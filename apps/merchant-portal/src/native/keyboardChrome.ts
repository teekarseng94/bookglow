const TEXT_ENTRY = [
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="file"]):not([type="range"]):not([type="color"]):not([type="hidden"])',
  'textarea',
  'select',
].join(', ');

const PHONE_QUERY = '(max-width: 767.98px)';
const KEYBOARD_SHRINK_PX = 120;

function fieldFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const field = target.closest(TEXT_ENTRY);
  return field instanceof HTMLElement ? field : null;
}

/** Choose a phone keyboard before focus, without overriding an explicit inputMode. */
export function applyMobileInputMode(input: HTMLInputElement): void {
  if (input.inputMode && input.inputMode !== 'text') return;
  if (input.type === 'tel') {
    input.inputMode = 'tel';
    return;
  }
  if (input.type === 'email') {
    input.inputMode = 'email';
    return;
  }
  if (input.type === 'number') {
    const step = Number(input.step);
    const decimal = input.step === 'any' || (Number.isFinite(step) && step > 0 && step < 1);
    input.inputMode = decimal ? 'decimal' : 'numeric';
  }
}

/**
 * Hide the Android tab bar while a field is being edited, and keep that field
 * in view above the IME. `adjustResize` shrinks the WebView; this removes the
 * fixed chrome that would otherwise sit on top of the field.
 */
export function installKeyboardChrome(doc: Document = document): () => void {
  const root = doc.documentElement;
  const view = doc.defaultView;
  let fieldFocused = false;

  const sync = () => {
    const viewport = view?.visualViewport;
    const shrunk = view && viewport ? view.innerHeight - viewport.height > KEYBOARD_SHRINK_PX : false;
    const phone = view?.matchMedia(PHONE_QUERY).matches ?? false;
    root.classList.toggle('bookglow-keyboard-open', phone && (fieldFocused || shrunk));
  };

  const onPointerDown = (event: Event) => {
    const field = fieldFrom(event.target);
    if (field instanceof HTMLInputElement) applyMobileInputMode(field);
  };

  const onFocusIn = (event: FocusEvent) => {
    const field = fieldFrom(event.target);
    if (!field) return;
    fieldFocused = true;
    if (field instanceof HTMLInputElement) applyMobileInputMode(field);
    sync();
    view?.setTimeout(() => {
      field.scrollIntoView({ block: 'center', inline: 'nearest' });
    }, 280);
  };

  const onFocusOut = () => {
    view?.setTimeout(() => {
      fieldFocused = Boolean(fieldFrom(doc.activeElement));
      sync();
    }, 50);
  };

  doc.addEventListener('pointerdown', onPointerDown, true);
  doc.addEventListener('focusin', onFocusIn);
  doc.addEventListener('focusout', onFocusOut);
  view?.visualViewport?.addEventListener('resize', sync);
  view?.addEventListener('resize', sync);

  return () => {
    doc.removeEventListener('pointerdown', onPointerDown, true);
    doc.removeEventListener('focusin', onFocusIn);
    doc.removeEventListener('focusout', onFocusOut);
    view?.visualViewport?.removeEventListener('resize', sync);
    view?.removeEventListener('resize', sync);
    root.classList.remove('bookglow-keyboard-open');
  };
}
