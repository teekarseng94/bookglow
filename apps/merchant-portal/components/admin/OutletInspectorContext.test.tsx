import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./OutletInspector', () => ({
  default: (props: any) => props.open ? <div data-testid="inspector"><span>{props.outletId}</span><span>{props.selectedTab}</span><button onClick={props.onClose}>Close inspector</button></div> : null,
}));

import { OutletInspectorProvider, useOutletInspector } from './OutletInspectorContext';

const Harness = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { openOutletInspector } = useOutletInspector();
  const entries = [
    ['Overview', 'summary'], ['Outlets', 'summary'], ['Onboarding', 'onboarding'],
    ['Support', 'support'], ['Integrations', 'integrations'], ['Search', 'accounts'],
  ] as const;
  return <><output data-testid="location">{location.search}</output>{entries.map(([label, tab]) => <button key={label} onClick={() => openOutletInspector(`outlet-${label.toLowerCase()}`, tab)}>{label}</button>)}<button onClick={() => navigate(-1)}>Back</button></>;
};

describe('OutletInspectorProvider URL integration', () => {
  it('uses one inspector contract from every supported entry point with the requested tab', () => {
    render(<MemoryRouter><OutletInspectorProvider><Harness /></OutletInspectorProvider></MemoryRouter>);
    for (const [label, tab] of [['Overview', 'summary'], ['Outlets', 'summary'], ['Onboarding', 'onboarding'], ['Support', 'support'], ['Integrations', 'integrations'], ['Search', 'accounts']] as const) {
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(screen.getByTestId('inspector')).toHaveTextContent(`outlet-${label.toLowerCase()}`);
      expect(screen.getByTestId('inspector')).toHaveTextContent(tab);
    }
  });

  it('clears selected URL state on close and restores closed state on browser back', () => {
    const first = render(<MemoryRouter initialEntries={['/admin']}><OutletInspectorProvider><Harness /></OutletInspectorProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Support' }));
    expect(screen.getByTestId('location').textContent).toContain('inspectOutlet=outlet-support');
    fireEvent.click(screen.getByRole('button', { name: 'Close inspector' }));
    expect(screen.getByTestId('location')).toHaveTextContent('');

    first.unmount();
    render(<MemoryRouter initialEntries={['/admin', '/admin?inspectOutlet=outlet-1&inspectTab=audit']} initialIndex={1}><OutletInspectorProvider><Harness /></OutletInspectorProvider></MemoryRouter>);
    expect(screen.getByTestId('inspector')).toHaveTextContent('audit');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByTestId('inspector')).not.toBeInTheDocument();
  });
});
