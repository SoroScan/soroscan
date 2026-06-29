import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrgSwitcher } from '../OrgSwitcher';

describe('OrgSwitcher', () => {
  const mockOrgs = [
    { id: 'org-1', name: 'Acme Corp' },
    { id: 'org-2', name: 'Beta Inc' },
    { id: 'org-3', name: 'Gamma LLC' },
  ];

  const defaultProps = {
    organizations: mockOrgs,
    currentOrgId: 'org-1',
    onSwitch: vi.fn(),
  };

  it('displays current organization name', () => {
    render(<OrgSwitcher {...defaultProps} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(<OrgSwitcher {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Beta Inc')).toBeInTheDocument();
    expect(screen.getByText('Gamma LLC')).toBeInTheDocument();
  });

  it('highlights current org in dropdown', () => {
    render(<OrgSwitcher {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const acmeOption = screen.getByText('Acme Corp');
    expect(acmeOption).toHaveClass('text-blue-400');
  });

  it('calls onSwitch when org is selected', () => {
    const onSwitch = vi.fn();
    render(<OrgSwitcher {...defaultProps} onSwitch={onSwitch} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const betaOption = screen.getByText('Beta Inc');
    fireEvent.click(betaOption);
    
    expect(onSwitch).toHaveBeenCalledWith('org-2');
  });

  it('closes dropdown after selection', () => {
    const onSwitch = vi.fn();
    render(<OrgSwitcher {...defaultProps} onSwitch={onSwitch} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const betaOption = screen.getByText('Beta Inc');
    fireEvent.click(betaOption);
    
    expect(screen.queryByText('Gamma LLC')).not.toBeInTheDocument();
  });

  it('does not call onSwitch when clicking current org', () => {
    const onSwitch = vi.fn();
    render(<OrgSwitcher {...defaultProps} onSwitch={onSwitch} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const acmeOption = screen.getByText('Acme Corp');
    fireEvent.click(acmeOption);
    
    expect(onSwitch).not.toHaveBeenCalled();
  });

  it('respects disabled prop', () => {
    const onSwitch = vi.fn();
    render(<OrgSwitcher {...defaultProps} onSwitch={onSwitch} disabled />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(screen.queryByText('Beta Inc')).not.toBeInTheDocument();
  });

  it('shows checkmark icon for current org', () => {
    render(<OrgSwitcher {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const checkmark = screen.getByRole('img', { hidden: true });
    expect(checkmark).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', () => {
    render(<OrgSwitcher {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Beta Inc')).toBeInTheDocument();
    
    fireEvent.mouseDown(document.body);
    
    expect(screen.queryByText('Beta Inc')).not.toBeInTheDocument();
  });

  it('shows "Select Org" when current org not found', () => {
    render(<OrgSwitcher {...defaultProps} currentOrgId="unknown" />);
    expect(screen.getByText('Select Org')).toBeInTheDocument();
  });
});