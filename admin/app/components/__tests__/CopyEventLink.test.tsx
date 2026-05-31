import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CopyEventLink, { buildEventUrl } from '../CopyEventLink';

// ---------------------------------------------------------------------------
// Clipboard mock
// ---------------------------------------------------------------------------
const mockWriteText = jest.fn();

beforeEach(() => {
  mockWriteText.mockReset();
  mockWriteText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    configurable: true,
    writable: true,
  });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// buildEventUrl unit tests
// ---------------------------------------------------------------------------
describe('buildEventUrl', () => {
  it('builds URL with string event ID', () => {
    expect(buildEventUrl('abc-123', 'https://example.com/events')).toBe(
      'https://example.com/events/abc-123'
    );
  });

  it('builds URL with numeric event ID', () => {
    expect(buildEventUrl(42, 'https://example.com/events')).toBe(
      'https://example.com/events/42'
    );
  });

  it('strips trailing slash from baseUrl', () => {
    expect(buildEventUrl(7, 'https://example.com/events/')).toBe(
      'https://example.com/events/7'
    );
  });

  it('works with a relative base path', () => {
    expect(buildEventUrl(5, '/events')).toBe('/events/5');
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe('CopyEventLink', () => {
  const BASE = 'https://soroscan.io/events';

  // --- Rendering ---
  it('renders the copy link button', () => {
    render(<CopyEventLink eventId={1} baseUrl={BASE} />);
    expect(screen.getByTestId('copy-event-link')).toBeInTheDocument();
  });

  it('shows "Copy Link" label by default', () => {
    render(<CopyEventLink eventId={1} baseUrl={BASE} />);
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
  });

  it('has correct default aria-label including event ID', () => {
    render(<CopyEventLink eventId={99} baseUrl={BASE} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Copy link to event 99'
    );
  });

  it('is a button with type="button"', () => {
    render(<CopyEventLink eventId={1} baseUrl={BASE} />);
    expect(screen.getByTestId('copy-event-link')).toHaveAttribute('type', 'button');
  });

  it('has aria-live="polite" for screen reader announcements', () => {
    render(<CopyEventLink eventId={1} baseUrl={BASE} />);
    expect(screen.getByTestId('copy-event-link')).toHaveAttribute('aria-live', 'polite');
  });

  // --- Copy behaviour ---
  it('calls clipboard.writeText with the correct URL on click', async () => {
    render(<CopyEventLink eventId={42} baseUrl={BASE} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-event-link'));
    });
    expect(mockWriteText).toHaveBeenCalledWith('https://soroscan.io/events/42');
  });

  it('includes the event ID in the copied URL', async () => {
    render(<CopyEventLink eventId="evt_abc" baseUrl={BASE} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-event-link'));
    });
    expect(mockWriteText).toHaveBeenCalledWith('https://soroscan.io/events/evt_abc');
  });

  it('copies a different event ID correctly', async () => {
    render(<CopyEventLink eventId={7} baseUrl="https://app.soroscan.io/events" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-event-link'));
    });
    expect(mockWriteText).toHaveBeenCalledWith('https://app.soroscan.io/events/7');
  });

  // --- Feedback state ---
  it('shows "Copied!" after clicking', async () => {
    render(<CopyEventLink eventId={1} baseUrl={BASE} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-event-link'));
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('updates aria-label to "Link copied" after clicking', async () => {
    render(<CopyEventLink eventId={1} baseUrl={BASE} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-event-link'));
    });
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Link copied');
  });

  it('applies green styles after copying', async () => {
    render(<CopyEventLink eventId={1} baseUrl={BASE} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-event-link'));
    });
    expect(screen.getByTestId('copy-event-link')).toHaveClass('text-green-700');
  });

  it('reverts to "Copy Link" after feedbackDuration elapses', async () => {
    render(<CopyEventLink eventId={1} baseUrl={BASE} feedbackDuration={1500} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-event-link'));
    });
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1500); });
    await waitFor(() => expect(screen.getByText('Copy Link')).toBeInTheDocument());
  });

  it('does not revert before feedbackDuration elapses', async () => {
    render(<CopyEventLink eventId={1} baseUrl={BASE} feedbackDuration={2000} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-event-link'));
    });
    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  // --- Numeric vs string event IDs ---
  it('handles numeric event ID', async () => {
    render(<CopyEventLink eventId={123} baseUrl={BASE} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-event-link'));
    });
    expect(mockWriteText).toHaveBeenCalledWith(`${BASE}/123`);
  });

  it('handles string event ID', async () => {
    render(<CopyEventLink eventId="event-xyz" baseUrl={BASE} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-event-link'));
    });
    expect(mockWriteText).toHaveBeenCalledWith(`${BASE}/event-xyz`);
  });

  // --- Custom className ---
  it('applies custom className', () => {
    render(<CopyEventLink eventId={1} baseUrl={BASE} className="ml-2" />);
    expect(screen.getByTestId('copy-event-link')).toHaveClass('ml-2');
  });
});
