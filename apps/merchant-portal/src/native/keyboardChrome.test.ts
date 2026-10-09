import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyMobileInputMode, installKeyboardChrome } from './keyboardChrome';

describe('keyboard chrome', () => {
  afterEach(() => {
    document.documentElement.classList.remove('bookglow-keyboard-open');
    document.body.innerHTML = '';
  });

  it('hides shell chrome while a phone field is focused', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('767'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const uninstall = installKeyboardChrome();
    const input = document.createElement('input');
    input.type = 'text';
    input.scrollIntoView = () => undefined;
    document.body.append(input);

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(document.documentElement.classList.contains('bookglow-keyboard-open')).toBe(true);

    uninstall();
    expect(document.documentElement.classList.contains('bookglow-keyboard-open')).toBe(false);
    vi.unstubAllGlobals();
  });

  it('sets a decimal keyboard for money fields and a phone keyboard for tel fields', () => {
    const money = document.createElement('input');
    money.type = 'number';
    money.step = '0.01';
    applyMobileInputMode(money);
    expect(money.inputMode).toBe('decimal');

    const phone = document.createElement('input');
    phone.type = 'tel';
    applyMobileInputMode(phone);
    expect(phone.inputMode).toBe('tel');

    const quantity = document.createElement('input');
    quantity.type = 'number';
    applyMobileInputMode(quantity);
    expect(quantity.inputMode).toBe('numeric');
  });
});
