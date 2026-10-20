import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EventDetailModal } from '../app/dashboard/components/EventDetailModal';
import type { EventRecord } from '../components/ingest/types';

const MOCK_EVENT: EventRecord = {
  id: 'evt-100',
  contractId: 'CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF',
  contractName: 'TestContract',
  eventType: 'transfer',
  ledger: 12345,
  eventIndex: 1,
  timestamp: '2024-01-01T00:00:00Z',
  txHash: 'a'.repeat(64),
  payload: { amount: 500, to: 'GBBB111' },
};

describe('EventDetailModal accessibility and keyboard handling', () => {
  it('renders an accessible dialog with correct ARIA attributes', () => {
    render(<EventDetailModal event={MOCK_EVENT} onClose={jest.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'event-details-title');
    expect(screen.getByText('Event Details')).toBeInTheDocument();
  });

  it('moves initial focus into the dialog on open', () => {
    render(<EventDetailModal event={MOCK_EVENT} onClose={jest.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('closes the modal when Escape is pressed', () => {
    const onClose = jest.fn();
    render(<EventDetailModal event={MOCK_EVENT} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when close button is clicked', () => {
    const onClose = jest.fn();
    render(<EventDetailModal event={MOCK_EVENT} onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: /close event details/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when clicking the overlay backdrop', () => {
    const onClose = jest.fn();
    const { container } = render(<EventDetailModal event={MOCK_EVENT} onClose={onClose} />);

    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus within the modal on Tab and Shift+Tab', () => {
    render(<EventDetailModal event={MOCK_EVENT} onClose={jest.fn()} />);

    const dialog = screen.getByRole('dialog');
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    expect(focusableElements.length).toBeGreaterThan(1);

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus last element and press Tab -> should wrap to first element
    lastElement.focus();
    expect(document.activeElement).toBe(lastElement);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(firstElement);

    // Focus first element and press Shift+Tab -> should wrap to last element
    firstElement.focus();
    expect(document.activeElement).toBe(firstElement);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastElement);
  });

  it('restores focus to the trigger element when closed', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'View Event';
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(
      <EventDetailModal event={MOCK_EVENT} onClose={jest.fn()} />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);

    unmount();
    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });
});
