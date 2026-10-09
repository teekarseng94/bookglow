import { describe, expect, it, vi } from 'vitest';
import { dismissTopOverlay, registerOverlayDismiss } from './overlayDismiss';

describe('overlayDismiss', () => {
  it('closes the latest overlay and leaves older ones in place', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unregisterFirst = registerOverlayDismiss(first);
    const unregisterSecond = registerOverlayDismiss(second);

    expect(dismissTopOverlay()).toBe(true);
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();

    unregisterSecond();
    expect(dismissTopOverlay()).toBe(true);
    expect(first).toHaveBeenCalledOnce();

    unregisterFirst();
    expect(dismissTopOverlay()).toBe(false);
  });
});
