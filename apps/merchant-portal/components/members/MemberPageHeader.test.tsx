import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemberPageHeader } from './MemberPageHeader';

describe('MemberPageHeader', () => {
  it('uses compact MobilePageActions for Add on phone', () => {
    const onAddMember = vi.fn();
    const { container } = render(
      <MemberPageHeader clientCount={12} onAddMember={onAddMember} addLabel="Add Client" />,
    );

    expect(container.querySelector('.m-page-actions')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Client' })[0]);
    expect(onAddMember).toHaveBeenCalledOnce();
  });
});
