import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EventPage from '@/app/events/[eventId]/page';
import { notFound } from 'next/navigation';

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/events/evt-1',
}));

jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

const eventResponse = {
  id: 42,
  contract_id: 'CABC123',
  contract_name: 'Swap Contract',
  event_type: 'SWAP_COMPLETE',
  payload: { amount: '1000', symbol: 'XLM' },
  payload_hash: 'hash-abc',
  ledger: 12345,
  event_index: 7,
  timestamp: '2026-02-10T09:12:00Z',
  tx_hash: 'tx-abc',
  schema_version: '1.0',
  validation_status: 'valid',
};

function paramsFor(eventId: string): Promise<{ eventId: string }> {
  return Promise.resolve({ eventId });
}

describe('EventPage', () => {
  const mockFetch = jest.fn();
  const clipboardWriteText = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof global.fetch;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWriteText },
    });
    clipboardWriteText.mockClear();
  });

  it('waits for the event request before producing the page (loading state)', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const pendingFetch = new Promise<unknown>((resolve) => {
      resolveFetch = resolve;
    });
    mockFetch.mockReturnValue(pendingFetch);

    let pageResolved = false;
    const pagePromise = EventPage({ params: paramsFor('evt-1') }).then((element) => {
      pageResolved = true;
      return element;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pageResolved).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/ingest/events/evt-1/',
      expect.objectContaining({ cache: 'no-store', headers: { Accept: 'application/json' } }),
    );

    resolveFetch?.({ ok: true, status: 200, json: async () => eventResponse });
    const element = await pagePromise;
    render(element);
    expect(screen.getByText('SWAP_COMPLETE')).toBeInTheDocument();
  });

  it('renders metadata, details and the payload for a successful event', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => eventResponse });

    render(await EventPage({ params: paramsFor('evt-1') }));

    const metadata = screen.getByLabelText('Event metadata');
    expect(metadata).toBeInTheDocument();
    expect(metadata).toHaveTextContent('12345');
    expect(metadata).toHaveTextContent('7');
    expect(metadata).toHaveTextContent('valid');
    expect(screen.getByText('Event ID: 42')).toBeInTheDocument();
    expect(screen.getByText('CABC123')).toBeInTheDocument();
    expect(screen.getByText('Swap Contract')).toBeInTheDocument();
    expect(screen.getByText('tx-abc')).toBeInTheDocument();
    expect(screen.getByText('hash-abc')).toBeInTheDocument();
    expect(screen.getByText('1.0')).toBeInTheDocument();

    const payload = screen.getByText('Payload').parentElement as HTMLElement;
    expect(payload.textContent).toContain('amount');
    expect(payload.textContent).toContain('XLM');
    expect(screen.getByRole('link', { name: /back to explorer/i })).toHaveAttribute(
      'href',
      '/contracts/CABC123/events/explorer',
    );
  });

  it('copies the shareable event link', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => eventResponse });
    render(await EventPage({ params: paramsFor('evt-1') }));

    fireEvent.click(screen.getByTestId('copy-event-link'));

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith('http://localhost/events/42');
      expect(screen.getByTestId('copy-event-link')).toHaveTextContent('Copied!');
    });
  });

  it('rejects with the service error message when the API fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });

    await expect(EventPage({ params: paramsFor('evt-1') })).rejects.toThrow(
      'Unable to load event evt-1. The event service returned status 503.',
    );
  });

  it('calls notFound for a 404 response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    await expect(EventPage({ params: paramsFor('missing') })).rejects.toThrow(
      'NEXT_HTTP_ERROR_FALLBACK;404',
    );
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/ingest/events/missing/',
      expect.anything(),
    );
  });

  it('surfaces network failures instead of rendering a blank page', async () => {
    mockFetch.mockRejectedValue(new Error('Network down'));

    await expect(EventPage({ params: paramsFor('evt-1') })).rejects.toThrow('Network down');
  });

  it('renders the empty detail state when optional metadata is absent', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...eventResponse,
        contract_name: null,
        payload_hash: null,
        schema_version: null,
        validation_status: null,
        payload: {},
      }),
    });

    render(await EventPage({ params: paramsFor('evt-1') }));

    const metadata = screen.getByLabelText('Event metadata');
    expect(metadata).toHaveTextContent('Not provided');
    expect(screen.queryByText('Contract Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Payload Hash')).not.toBeInTheDocument();
    expect(screen.queryByText('Schema Version')).not.toBeInTheDocument();
    expect(screen.getByText('Payload').parentElement).toHaveTextContent('{}');
  });

  it('encodes the event id in the request URL', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => eventResponse });

    render(await EventPage({ params: paramsFor('evt%2F1') }));

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/ingest/events/evt%2F1/',
      expect.anything(),
    );
  });
});
