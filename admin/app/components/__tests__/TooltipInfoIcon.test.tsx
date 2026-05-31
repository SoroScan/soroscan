import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TooltipInfoIcon from '../TooltipInfoIcon';

// The underlying Tooltip uses a delay before showing; we use fake timers to
// control that without slowing down the test suite.
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('TooltipInfoIcon', () => {
  // --- Rendering ---
  it('renders the info icon button', () => {
    render(<TooltipInfoIcon content="Help text" />);
    expect(screen.getByTestId('tooltip-info-icon')).toBeInTheDocument();
  });

  it('renders an SVG icon', () => {
    const { container } = render(<TooltipInfoIcon content="Help text" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  // --- Accessibility ---
  it('has default aria-label "More information"', () => {
    render(<TooltipInfoIcon content="Help text" />);
    expect(screen.getByRole('button', { name: 'More information' })).toBeInTheDocument();
  });

  it('accepts a custom aria-label', () => {
    render(<TooltipInfoIcon content="Help text" label="Explain contract ID" />);
    expect(screen.getByRole('button', { name: 'Explain contract ID' })).toBeInTheDocument();
  });

  it('is a button element (keyboard focusable)', () => {
    render(<TooltipInfoIcon content="Help text" />);
    expect(screen.getByTestId('tooltip-info-icon').tagName).toBe('BUTTON');
  });

  it('has type="button" to prevent accidental form submission', () => {
    render(<TooltipInfoIcon content="Help text" />);
    expect(screen.getByTestId('tooltip-info-icon')).toHaveAttribute('type', 'button');
  });

  it('SVG has aria-hidden to avoid duplicate announcements', () => {
    const { container } = render(<TooltipInfoIcon content="Help text" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  // --- Tooltip content shown on hover ---
  it('shows tooltip content after mouse enter and delay', () => {
    render(<TooltipInfoIcon content="Contract ID explanation" />);
    fireEvent.mouseEnter(screen.getByTestId('tooltip-info-icon'));
    act(() => { jest.runAllTimers(); });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Contract ID explanation');
  });

  it('hides tooltip after mouse leave', () => {
    render(<TooltipInfoIcon content="Contract ID explanation" />);
    fireEvent.mouseEnter(screen.getByTestId('tooltip-info-icon'));
    act(() => { jest.runAllTimers(); });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId('tooltip-info-icon'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  // --- Tooltip content shown on keyboard focus ---
  it('shows tooltip on focus (keyboard navigation)', () => {
    render(<TooltipInfoIcon content="Keyboard accessible tip" />);
    fireEvent.focus(screen.getByTestId('tooltip-info-icon'));
    act(() => { jest.runAllTimers(); });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip on blur', () => {
    render(<TooltipInfoIcon content="Keyboard accessible tip" />);
    fireEvent.focus(screen.getByTestId('tooltip-info-icon'));
    act(() => { jest.runAllTimers(); });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.blur(screen.getByTestId('tooltip-info-icon'));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  // --- Tooltip does not show before delay elapses ---
  it('does not show tooltip immediately before delay', () => {
    render(<TooltipInfoIcon content="Delayed tip" />);
    fireEvent.mouseEnter(screen.getByTestId('tooltip-info-icon'));
    // Do NOT advance timers — tooltip should still be hidden
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  // --- ReactNode content ---
  it('renders ReactNode tooltip content', () => {
    render(
      <TooltipInfoIcon
        content={<span data-testid="rich-content">Rich <strong>content</strong></span>}
      />
    );
    fireEvent.mouseEnter(screen.getByTestId('tooltip-info-icon'));
    act(() => { jest.runAllTimers(); });
    expect(screen.getByTestId('rich-content')).toBeInTheDocument();
  });

  // --- Size prop ---
  it('applies custom size to SVG', () => {
    const { container } = render(<TooltipInfoIcon content="tip" size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('defaults to 16px size', () => {
    const { container } = render(<TooltipInfoIcon content="tip" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  // --- Position prop ---
  it('accepts a position prop without error', () => {
    const positions = ['top', 'bottom', 'left', 'right', 'auto'] as const;
    positions.forEach((pos) => {
      const { unmount } = render(<TooltipInfoIcon content="tip" position={pos} />);
      expect(screen.getByTestId('tooltip-info-icon')).toBeInTheDocument();
      unmount();
    });
  });

  // --- Custom className ---
  it('applies custom className to the button', () => {
    render(<TooltipInfoIcon content="tip" className="ml-1" />);
    expect(screen.getByTestId('tooltip-info-icon')).toHaveClass('ml-1');
  });
});
