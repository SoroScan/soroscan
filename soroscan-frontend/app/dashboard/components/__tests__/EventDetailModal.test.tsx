import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder as typeof global.TextDecoder;
}

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EventDetailModal } from '../EventDetailModal';
import { formatDateTime } from '@/components/ingest/formatters';
import type { EventRecord } from '@/components/ingest/types';

describe('EventDetailModal', () => {
  const sampleEvent: EventRecord = {
    id: 'evt-001-xyz',
    contractId: 'CAAA111222333',
    contractName: 'Soroban Token Contract',
    eventType: 'transfer',
    ledger: 123456,
    eventIndex: 2,
    timestamp: '2025-01-15T12:30:00Z',
    txHash: '0xabcde1234567890',
    payload: {
      from: 'GA111',
      to: 'GB222',
      amount: 1000,
    },
    payloadHash: 'hash-999-aaa',
    schemaVersion: '2.1.0',
    validationStatus: 'SUCCESS',
  };

  const minimalEvent: EventRecord = {
    id: 'evt-002-minimal',
    contractId: 'CBBB444555666',
    contractName: '',
    eventType: 'mint',
    ledger: 654321,
    eventIndex: 0,
    timestamp: '2025-02-01T08:00:00Z',
    txHash: '0xfedcba0987654321',
    payload: { minted: 50 },
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();

    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders dialog elements and title', () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'event-details-title');

      expect(
        screen.getByRole('heading', { level: 2, name: 'Event Details' })
      ).toBeInTheDocument();
    });

    it('renders all metadata fields correctly', () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      expect(screen.getByText('Metadata')).toBeInTheDocument();
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText(formatDateTime(sampleEvent.timestamp))).toBeInTheDocument();

      expect(screen.getByText('Ledger')).toBeInTheDocument();
      expect(screen.getByText(sampleEvent.ledger.toString())).toBeInTheDocument();

      expect(screen.getByText('Event Index')).toBeInTheDocument();
      expect(screen.getByText(sampleEvent.eventIndex.toString())).toBeInTheDocument();

      expect(screen.getByText('Event Type')).toBeInTheDocument();
      expect(screen.getByText(sampleEvent.eventType)).toBeInTheDocument();
    });

    it('renders all key detail fields and optional attributes when present', () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      expect(screen.getByText('Event ID')).toBeInTheDocument();
      expect(screen.getByText(sampleEvent.id)).toBeInTheDocument();

      expect(screen.getByText('Contract ID')).toBeInTheDocument();
      expect(screen.getByText(sampleEvent.contractId)).toBeInTheDocument();

      expect(screen.getByText('Contract Name')).toBeInTheDocument();
      expect(screen.getByText(sampleEvent.contractName)).toBeInTheDocument();

      expect(screen.getByText('Transaction Hash')).toBeInTheDocument();
      expect(screen.getByText(sampleEvent.txHash)).toBeInTheDocument();

      expect(screen.getByText('Payload Hash')).toBeInTheDocument();
      expect(screen.getByText(sampleEvent.payloadHash!)).toBeInTheDocument();

      expect(screen.getByText('Schema Version')).toBeInTheDocument();
      expect(screen.getByText(sampleEvent.schemaVersion!)).toBeInTheDocument();

      expect(screen.getByText('Validation Status')).toBeInTheDocument();
      expect(screen.getByText(sampleEvent.validationStatus!)).toBeInTheDocument();
    });

    it('omits optional fields gracefully when minimal event is passed', () => {
      render(<EventDetailModal event={minimalEvent} onClose={mockOnClose} />);

      expect(screen.getByText('Event ID')).toBeInTheDocument();
      expect(screen.getByText(minimalEvent.id)).toBeInTheDocument();
      expect(screen.getByText(minimalEvent.contractId)).toBeInTheDocument();
      expect(screen.getByText(minimalEvent.txHash)).toBeInTheDocument();

      expect(screen.queryByText('Contract Name')).not.toBeInTheDocument();
      expect(screen.queryByText('Payload Hash')).not.toBeInTheDocument();
      expect(screen.queryByText('Schema Version')).not.toBeInTheDocument();
      expect(screen.queryByText('Validation Status')).not.toBeInTheDocument();
    });

    it('renders CopyEventLink and Close action buttons in modal footer', () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      expect(
        screen.getByRole('button', { name: `Copy link to event ${sampleEvent.id}` })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('Close Behaviour', () => {
    it('calls onClose when close icon button in header is clicked', () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const closeIconBtn = screen.getByRole('button', { name: 'Close event details' });
      fireEvent.click(closeIconBtn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when bottom Close button is clicked', () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking overlay backdrop directly', () => {
      const { container } = render(
        <EventDetailModal event={sampleEvent} onClose={mockOnClose} />
      );

      // The topmost overlay container is container.firstChild
      const overlay = container.firstChild as HTMLDivElement;
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside the modal dialog dialog surface', () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Copy Interactions', () => {
    it('copies Event ID to clipboard', async () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const copyIdBtn = screen.getByRole('button', { name: 'Copy Event ID' });
      fireEvent.click(copyIdBtn);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleEvent.id);
      });
    });

    it('copies Contract ID to clipboard', async () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const copyContractBtn = screen.getByRole('button', { name: 'Copy Contract ID' });
      fireEvent.click(copyContractBtn);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleEvent.contractId);
      });
    });

    it('copies Transaction Hash to clipboard', async () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const copyTxBtn = screen.getByRole('button', { name: 'Copy Transaction Hash' });
      fireEvent.click(copyTxBtn);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleEvent.txHash);
      });
    });

    it('copies Payload Hash to clipboard when available', async () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const copyHashBtn = screen.getByRole('button', { name: 'Copy Payload Hash' });
      fireEvent.click(copyHashBtn);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleEvent.payloadHash);
      });
    });

    it('copies JSON payload to clipboard and shows temporary feedback', async () => {
      jest.useFakeTimers();
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const copyPayloadBtn = screen.getByRole('button', {
        name: 'Copy event payload to clipboard',
      });
      expect(copyPayloadBtn).toHaveTextContent('Copy Payload');

      fireEvent.click(copyPayloadBtn);

      const expectedJson = JSON.stringify(sampleEvent.payload, null, 2);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedJson);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Copy event payload to clipboard' }))
          .toHaveTextContent('Copied!');
      });

      // Fast-forward past 2000ms
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByRole('button', { name: 'Copy event payload to clipboard' }))
        .toHaveTextContent('Copy Payload');
    });

    it('handles clipboard writeText rejection gracefully without crashing', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn(() => Promise.reject(new Error('Permission denied'))),
        },
      });

      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const copyIdBtn = screen.getByRole('button', { name: 'Copy Event ID' });
      fireEvent.click(copyIdBtn);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Failed to copy:', expect.any(Error));
      });

      consoleError.mockRestore();
    });
  });

  describe('Payload Views (JSON and HEX)', () => {
    it('defaults to JSON view and switches between JSON and HEX', async () => {
      render(<EventDetailModal event={sampleEvent} onClose={mockOnClose} />);

      const jsonTab = screen.getByRole('button', { name: 'View payload as JSON' });
      const hexTab = screen.getByRole('button', { name: 'View payload as HEX' });

      // Default state
      expect(jsonTab).toHaveAttribute('aria-pressed', 'true');
      expect(hexTab).toHaveAttribute('aria-pressed', 'false');

      // Check that JSON representation is rendered
      expect(screen.getByText(/"from"/)).toBeInTheDocument();
      expect(screen.getByText(/"GA111"/)).toBeInTheDocument();

      // Switch to HEX view
      fireEvent.click(hexTab);

      expect(jsonTab).toHaveAttribute('aria-pressed', 'false');
      expect(hexTab).toHaveAttribute('aria-pressed', 'true');

      // In HEX view, copy payload button copies hex string
      const copyPayloadBtn = screen.getByRole('button', {
        name: 'Copy event payload to clipboard',
      });
      fireEvent.click(copyPayloadBtn);

      const expectedJson = JSON.stringify(sampleEvent.payload, null, 2);
      const expectedHex = Array.from(new TextEncoder().encode(expectedJson))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedHex);
      });

      // Switch back to JSON view
      fireEvent.click(jsonTab);
      expect(jsonTab).toHaveAttribute('aria-pressed', 'true');
      expect(hexTab).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText(/"from"/)).toBeInTheDocument();
    });
  });
});
