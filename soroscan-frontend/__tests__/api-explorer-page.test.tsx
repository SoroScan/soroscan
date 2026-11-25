import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ApiExplorerPage from '@/app/developer/api-explorer/page';

jest.mock('@/components/terminal/landing/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}));
jest.mock('@/components/terminal/landing/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/developer/api-explorer',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/auth', () => ({
  getAccessToken: jest.fn(() => 'test-token'),
}));

const mockFetch = jest.fn();

function sentPayload(): Record<string, unknown> {
  const [, init] = mockFetch.mock.calls[0];
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

async function sendRequest() {
  fireEvent.click(screen.getByRole('button', { name: 'SEND_REQUEST' }));
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
}

describe('ApiExplorerPage', () => {
  let uuidCounter = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof global.fetch;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: jest.fn(() => `request-${++uuidCounter}`) },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { 'x-request-id': 'abc123' },
        body: '{"indexed":true}',
      }),
    });
  });

  it('renders the empty response and history state with the default GET request', () => {
    render(<ApiExplorerPage />);

    expect(screen.getByText('Interactive API Explorer')).toBeInTheDocument();
    expect(screen.getByLabelText('HTTP method')).toHaveValue('GET');
    expect(screen.getByLabelText('Request path')).toHaveValue('/api/ingest/contracts/');
    expect(screen.getByLabelText('Request JSON body')).toHaveValue('');
    expect(screen.getByText('No response yet.')).toBeInTheDocument();
    expect(screen.getByText('No requests yet.')).toBeInTheDocument();
  });

  it('selects an endpoint and then honours manual method and path edits', async () => {
    render(<ApiExplorerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'POST /api/ingest/contracts/' }));
    expect(screen.getByLabelText('HTTP method')).toHaveValue('POST');
    expect(screen.getByLabelText('Request path')).toHaveValue('/api/ingest/contracts/');
    expect(screen.getByLabelText('Request JSON body')).toHaveValue(
      '{"contract_id":"C...","label":"my-contract"}',
    );
    expect(screen.getByText('Register a contract for indexing.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('HTTP method'), { target: { value: 'PUT' } });
    fireEvent.change(screen.getByLabelText('Request path'), {
      target: { value: '/api/ingest/contracts/CABC123/' },
    });
    fireEvent.change(screen.getByLabelText('Request JSON body'), {
      target: { value: '{ "label": "renamed" }' },
    });
    await sendRequest();

    const payload = sentPayload();
    expect(payload.method).toBe('PUT');
    expect(payload.url).toBe('http://localhost:8000/api/ingest/contracts/CABC123/');
    expect(payload.body).toBe('{"label":"renamed"}');
    expect(payload.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer test-token' });
  });

  it('adds query parameters to the proxied URL and omits cleared rows', async () => {
    render(<ApiExplorerPage />);

    fireEvent.click(screen.getByRole('button', { name: '+ Add query param' }));
    const keys = screen.getAllByLabelText('Query key');
    const values = screen.getAllByLabelText('Query value');
    expect(keys).toHaveLength(2);

    fireEvent.change(keys[0], { target: { value: 'limit' } });
    fireEvent.change(values[0], { target: { value: '2' } });
    fireEvent.change(keys[1], { target: { value: 'event_type' } });
    fireEvent.change(values[1], { target: { value: 'SWAP COMPLETE' } });
    await sendRequest();

    expect(sentPayload().url).toBe(
      'http://localhost:8000/api/ingest/contracts/?limit=2&event_type=SWAP+COMPLETE',
    );

    fireEvent.change(keys[1], { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'SEND_REQUEST' }));
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    const [, secondInit] = mockFetch.mock.calls[1];
    expect(JSON.parse(secondInit.body as string).url).toBe(
      'http://localhost:8000/api/ingest/contracts/?limit=2',
    );
  });

  it('sends GET requests with no body and shows the "No body" schema state', async () => {
    render(<ApiExplorerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'GET /api/ingest/webhooks/' }));
    expect(screen.getByText('No body')).toBeInTheDocument();
    expect(screen.getByLabelText('Request JSON body')).toHaveValue('');
    await sendRequest();

    expect(sentPayload().method).toBe('GET');
    expect(sentPayload()).not.toHaveProperty('body');
    expect(sentPayload().url).toBe('http://localhost:8000/api/ingest/webhooks/');
  });

  it('sends edited JSON bodies for POST requests', async () => {
    render(<ApiExplorerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'POST /api/ingest/webhooks/' }));
    fireEvent.change(screen.getByLabelText('Request JSON body'), {
      target: { value: '{ "url": "https://example.com/hook", "event_type": "TRANSFER" }' },
    });
    await sendRequest();

    expect(sentPayload().body).toBe('{"url":"https://example.com/hook","event_type":"TRANSFER"}');
  });

  it('shows the response status, headers, body and request history', async () => {
    render(<ApiExplorerPage />);
    await sendRequest();

    expect(screen.getByText('STATUS: 200 OK')).toBeInTheDocument();
    expect(screen.getByText(/"x-request-id": "abc123"/)).toBeInTheDocument();
    expect(screen.getByText('{"indexed":true}')).toBeInTheDocument();
    expect(screen.queryByText('No response yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('No requests yet.')).not.toBeInTheDocument();
    expect(screen.getByText('http://localhost:8000/api/ingest/contracts/')).toBeInTheDocument();
  });

  it('shows an empty body placeholder for responses without content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, status: 204, statusText: 'No Content', headers: {}, body: '' }),
    });
    render(<ApiExplorerPage />);
    await sendRequest();

    expect(screen.getByText('STATUS: 204 No Content')).toBeInTheDocument();
    expect(screen.getByText('(empty body)')).toBeInTheDocument();
  });

  it('blocks invalid JSON bodies before sending a request', () => {
    render(<ApiExplorerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'POST /api/ingest/webhooks/' }));
    fireEvent.change(screen.getByLabelText('Request JSON body'), { target: { value: '{oops' } });
    fireEvent.click(screen.getByRole('button', { name: 'SEND_REQUEST' }));

    expect(screen.getByText('Request body must be valid JSON.')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows the loading state while the proxy request is in flight', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const pendingFetch = new Promise<unknown>((resolve) => {
      resolveFetch = resolve;
    });
    mockFetch.mockReturnValue(pendingFetch);
    render(<ApiExplorerPage />);

    fireEvent.click(screen.getByRole('button', { name: 'SEND_REQUEST' }));

    const button = await screen.findByRole('button', { name: 'SENDING...' });
    expect(button).toBeDisabled();

    await act(async () => {
      resolveFetch?.({ ok: true, json: async () => ({ ok: true, status: 200, statusText: 'OK', headers: {}, body: 'ok' }) });
      await pendingFetch;
    });
    expect(await screen.findByText('ok')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SEND_REQUEST' })).toBeEnabled();
  });

  it('shows the fallback error when the proxy request rejects', async () => {
    mockFetch.mockRejectedValue('network failure');
    render(<ApiExplorerPage />);
    await sendRequest();

    expect(await screen.findByText('Failed to execute request.')).toBeInTheDocument();
    expect(screen.getByText('No response yet.')).toBeInTheDocument();
    expect(screen.getByText('No requests yet.')).toBeInTheDocument();
  });
});
