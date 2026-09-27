import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BooleanSettingRow } from './BooleanSettingRow';

describe('BooleanSettingRow', () => {
  it('associates the checkbox with its label on one compact row', () => {
    const onChange = vi.fn();
    render(
      <BooleanSettingRow
        id="commission-eligible"
        label="Commission eligible"
        checked={false}
        onChange={onChange}
      />,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Commission eligible' });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
