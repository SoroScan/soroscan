import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Divider from '../Divider';

describe('Divider', () => {
  it('renders with role="separator"', () => {
    render(<Divider />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('defaults to horizontal orientation', () => {
    render(<Divider />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renders vertical variant', () => {
    render(<Divider orientation="vertical" />);
    const sep = screen.getByRole('separator');
    expect(sep).toHaveAttribute('aria-orientation', 'vertical');
    expect(sep).toHaveClass('w-px', 'h-full');
  });

  it('renders label centered on horizontal divider', () => {
    render(<Divider label="OR" />);
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('renders two line elements when label is present', () => {
    const { container } = render(<Divider label="OR" />);
    // The wrapper div contains two line divs + one span
    const lines = container.querySelectorAll('.flex-1');
    expect(lines).toHaveLength(2);
  });

  it('applies subtle variant classes by default', () => {
    render(<Divider />);
    expect(screen.getByRole('separator')).toHaveClass('bg-gray-200');
  });

  it('applies prominent variant classes', () => {
    render(<Divider variant="prominent" />);
    expect(screen.getByRole('separator')).toHaveClass('bg-gray-400');
  });

  it('applies custom color via inline style', () => {
    render(<Divider color="#ff0000" />);
    const sep = screen.getByRole('separator');
    expect(sep).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('applies custom className', () => {
    render(<Divider className="my-divider" />);
    expect(screen.getByRole('separator')).toHaveClass('my-divider');
  });
});
