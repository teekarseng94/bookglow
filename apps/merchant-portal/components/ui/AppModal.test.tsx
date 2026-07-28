import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppModal } from './AppModal';

const ModalHarness = ({ busy = false }: { busy?: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open editor</button>
      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        busy={busy}
        title={<span>Member editor</span>}
        description="Update member details."
        footer={<button type="button">Save member</button>}
      >
        <label>
          Member name
          <input aria-label="Member name" />
        </label>
      </AppModal>
    </>
  );
};

describe('AppModal accessibility', () => {
  it('has an accessible name and moves focus inside when opened', async () => {
    render(<ModalHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open editor' }));

    const dialog = screen.getByRole('dialog', { name: 'Member editor' });
    expect(dialog).toHaveAccessibleDescription('Update member details.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus());
    expect(document.body).toHaveStyle({ overflow: 'hidden' });
  });

  it('traps Tab navigation inside the dialog', async () => {
    render(<ModalHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open editor' }));
    const close = screen.getByRole('button', { name: 'Close' });
    const save = screen.getByRole('button', { name: 'Save member' });
    await waitFor(() => expect(close).toHaveFocus());

    save.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(save).toHaveFocus();
  });

  it('closes with Escape and restores focus to the trigger', async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Open editor' });
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('does not close with Escape while busy', async () => {
    render(<ModalHarness busy />);
    fireEvent.click(screen.getByRole('button', { name: 'Open editor' }));
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps page scrolling locked until the final nested overlay closes', () => {
    const { rerender } = render(
      <>
        <AppModal open onClose={() => undefined} title="First">First body</AppModal>
        <AppModal open onClose={() => undefined} title="Second">Second body</AppModal>
      </>,
    );
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    rerender(
      <>
        <AppModal open={false} onClose={() => undefined} title="First">First body</AppModal>
        <AppModal open onClose={() => undefined} title="Second">Second body</AppModal>
      </>,
    );
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    rerender(
      <>
        <AppModal open={false} onClose={() => undefined} title="First">First body</AppModal>
        <AppModal open={false} onClose={() => undefined} title="Second">Second body</AppModal>
      </>,
    );
    expect(document.body.style.overflow).toBe('');
  });
});
