import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PerformanceDashboardPage from '@/app/performance/page';

const mockAuthenticatedFetch = jest.fn();

jest.mock('@/lib/auth', () => ({
  authenticatedFetch: (...args: unknown[]) => mockAuthenticatedFetch(...args),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/performance',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

type EndpointData = {
  workers?: unknown;
  db?: unknown;
  cache?: unknown;
  status?: unknown;
};

const healthyData: Required<EndpointData> = {
  workers: { workers: { w1: {}, w2: {}, w3: {} }, status: 'degraded' },
  db: { total: 12, active: 4, idle: 8 },
  cache: { backend: 'MemcachedBackend', status: 'degraded' },
  status: { total_events_indexed: 987, active_contracts: 5, last_event_timestamp: '2026-11-25T10:00:00Z' },
};

const okResponse = (data: unknown) => ({ ok: true, status: 200, json: async () => data });
const failedResponse = () => ({ ok: false, status: 500, json: async () => ({}) });

function mockEndpoints(overrides: EndpointData = {}) {
  const data = { ...healthyData, ...overrides };
  mockAuthenticatedFetch.mockImplementation(async (url: string) => {
    if (url.includes('/api/health/workers/')) {
      return 'workers' in overrides && overrides.workers === undefined
        ? failedResponse()
        : okResponse(data.workers);
    }
    if (url.includes('/api/meta/db-pool/')) {
      return 'db' in overrides && overrides.db === undefined
        ? failedResponse()
        : okResponse(data.db);
    }
    if (url.includes('/api/cache/stats/')) {
      return 'cache' in overrides && overrides.cache === undefined
        ? failedResponse()
        : okResponse(data.cache);
    }
    if (url.includes('/api/contracts/status/')) {
      return 'status' in overrides && overrides.status === undefined
        ? failedResponse()
        : okResponse(data.status);
    }
    throw new Error(`Unexpected URL: ${url}`);
  });
}

async function settleDashboard(expectedCalls = 4) {
  await waitFor(() => {
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(expectedCalls);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
}

describe('PerformanceDashboardPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockAuthenticatedFetch.mockReset();
    mockEndpoints();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the loading state before telemetry resolves', async () => {
    let releaseFetch: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });
    mockAuthenticatedFetch.mockImplementation(async (url: string) => {
      await gate;
      return okResponse(
        url.includes('/api/health/workers/')
          ? healthyData.workers
          : url.includes('/api/meta/db-pool/')
            ? healthyData.db
            : url.includes('/api/cache/stats/')
              ? healthyData.cache
              : healthyData.status,
      );
    });

    render(<PerformanceDashboardPage />);

    expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
    expect(screen.getByText('4 Celery Workers Active')).toBeInTheDocument();

    act(() => {
      releaseFetch?.();
    });
    await settleDashboard();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeEnabled();
  });

  it('polls all four endpoints and renders their values', async () => {
    render(<PerformanceDashboardPage />);
    await settleDashboard();

    expect(mockAuthenticatedFetch.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining('/api/health/workers/'),
      expect.stringContaining('/api/meta/db-pool/'),
      expect.stringContaining('/api/cache/stats/'),
      expect.stringContaining('/api/contracts/status/'),
    ]);
    expect(screen.getByText('3 Celery Workers Active')).toBeInTheDocument();
    expect(screen.getAllByText('degraded').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('REDIS CACHE RATE (MemcachedBackend)')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('4 active / 12 total (8 idle)')).toBeInTheDocument();
    expect(screen.getByText('987 events')).toBeInTheDocument();
    expect(screen.getByText('ERROR RATE')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it.each([
    ['workers', { workers: undefined }, '4 Celery Workers Active'],
    ['db pool', { db: undefined }, '1 active / 5 total (4 idle)'],
    ['cache stats', { cache: undefined }, 'REDIS CACHE RATE (RedisCacheClient)'],
    ['contract status', { status: undefined }, '56 events'],
  ])('keeps the dashboard usable when %s fails', async (_name, overrides, fallbackText) => {
    mockEndpoints(overrides as EndpointData);
    render(<PerformanceDashboardPage />);
    await settleDashboard();

    expect(screen.getByText(fallbackText)).toBeInTheDocument();
    if (!('workers' in (overrides as EndpointData))) {
      expect(screen.getByText('3 Celery Workers Active')).toBeInTheDocument();
    }
    if (!('db' in (overrides as EndpointData))) {
      expect(screen.getByText('4 active / 12 total (8 idle)')).toBeInTheDocument();
    }
    if (!('cache' in (overrides as EndpointData))) {
      expect(screen.getByText('REDIS CACHE RATE (MemcachedBackend)')).toBeInTheDocument();
    }
    if (!('status' in (overrides as EndpointData))) {
      expect(screen.getByText('987 events')).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /refresh/i })).toBeEnabled();
  });

  it('does not poll on a timer and re-fetches on manual refresh', async () => {
    render(<PerformanceDashboardPage />);
    await settleDashboard();

    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(4);

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
    await settleDashboard(8);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeEnabled();
  });

  it('renders zero telemetry values without falling back to defaults', async () => {
    mockEndpoints({
      db: { total: 0, active: 0, idle: 0 },
      status: { total_events_indexed: 0, active_contracts: 0, last_event_timestamp: '' },
    });
    render(<PerformanceDashboardPage />);
    await settleDashboard();

    expect(screen.getByText('0 events')).toBeInTheDocument();
    expect(screen.getByText('0 active / 0 total (0 idle)')).toBeInTheDocument();
  });

  it('changes the latency metrics when the time range changes', async () => {
    render(<PerformanceDashboardPage />);
    await settleDashboard();

    expect(screen.getByText('18 ms')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '7D' }));
    expect(screen.getByText('21 ms')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '30D' }));
    expect(screen.getByText('24 ms')).toBeInTheDocument();
  });
});
