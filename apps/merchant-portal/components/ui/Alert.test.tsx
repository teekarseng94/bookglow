import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Alert } from './Alert';

describe('Alert', () => {
  it('announces danger messages assertively', () => {
    render(<Alert tone="danger" title="Unable to save">Try again.</Alert>);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveTextContent('Unable to save');
  });

  it('provides a named dismiss action', () => {
    const onDismiss = vi.fn();
    render(<Alert onDismiss={onDismiss}>Saved.</Alert>);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
