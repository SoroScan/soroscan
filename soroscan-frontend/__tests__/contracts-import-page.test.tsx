import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContractsImportPage from '@/app/admin/contracts-import/page';

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/contracts-import',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/auth', () => ({
  getAccessToken: jest.fn(() => 'mock-token'),
}));

const mockFetch = jest.fn();

function selectFile(file: File) {
  fireEvent.change(screen.getByTestId('import-file'), {
    target: { files: [file] },
  });
}

describe('ContractsImportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof global.fetch;
  });

  it('renders the import form and the empty import history state', () => {
    render(<ContractsImportPage />);

    expect(screen.getByText('Bulk Import Metadata')).toBeInTheDocument();
    expect(screen.getByTestId('contracts-import-empty')).toBeInTheDocument();
    expect(screen.getByText('No contract imports')).toBeInTheDocument();
    expect(screen.getByText('No contract imports match the current filters.')).toBeInTheDocument();
    expect(screen.getByTestId('import-file')).toHaveAttribute(
      'accept',
      '.csv,.json,text/csv,application/json',
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('does not send a request when no file has been chosen', () => {
    render(<ContractsImportPage />);

    fireEvent.click(screen.getByTestId('import-submit'));

    expect(screen.getByText('Choose a CSV or JSON file first.')).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('uploads the selected file as multipart form data and shows the summary', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ total: 3, created: 2, updated: 1, errors: 0 }),
    });
    render(<ContractsImportPage />);

    selectFile(new File(['contract_id,label'], 'contracts.csv', { type: 'text/csv' }));
    fireEvent.change(screen.getByLabelText('Format'), { target: { value: 'csv' } });
    fireEvent.click(screen.getByTestId('import-submit'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/ingest/contracts/metadata/bulk-import/');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer mock-token' });

    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect((body.get('file') as File).name).toBe('contracts.csv');
    expect(body.get('dry_run')).toBe('true');
    expect(body.get('on_error')).toBe('rollback');
    expect(body.get('format')).toBe('csv');

    const report = await screen.findByText(/"created": 2/);
    expect(report).toHaveTextContent('"total": 3');
    expect(report).toHaveTextContent('"updated": 1');
    expect(report).toHaveTextContent('"errors": 0');
    expect(screen.queryByText(/Choose a CSV or JSON file first/)).not.toBeInTheDocument();
  });

  it('shows a disabled importing state while the upload is in flight', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const pendingFetch = new Promise<unknown>((resolve) => {
      resolveFetch = resolve;
    });
    mockFetch.mockReturnValue(pendingFetch);
    render(<ContractsImportPage />);

    selectFile(new File(['[]'], 'contracts.json', { type: 'application/json' }));
    fireEvent.click(screen.getByTestId('import-submit'));

    const button = await screen.findByRole('button', { name: /importing/i });
    expect(button).toBeDisabled();

    await act(async () => {
      resolveFetch?.({ ok: true, json: async () => ({ created: 4, updated: 0, errors: 1 }) });
      await pendingFetch;
    });

    expect(await screen.findByText(/"created": 4/)).toBeInTheDocument();
    expect(screen.getByTestId('import-submit')).toBeEnabled();
    expect(screen.getByTestId('import-submit')).toHaveTextContent('Run import');
  });

  it('shows the API detail when the import fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Invalid CSV header: contractId' }),
    });
    render(<ContractsImportPage />);

    selectFile(new File(['bad'], 'bad.csv', { type: 'text/csv' }));
    fireEvent.click(screen.getByTestId('import-submit'));

    expect(await screen.findByText('Invalid CSV header: contractId')).toBeInTheDocument();
    expect(screen.queryByText(/"created"/)).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('filters the empty history and clears the filter', () => {
    render(<ContractsImportPage />);

    fireEvent.change(screen.getByTestId('import-filter-input'), {
      target: { value: 'missing-batch' },
    });
    expect(screen.getByTestId('import-reset-filters')).toBeInTheDocument();
    expect(screen.getByText('No contract imports')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('import-reset-filters'));
    expect(screen.getByTestId('import-filter-input')).toHaveValue('');
    expect(screen.queryByTestId('import-reset-filters')).not.toBeInTheDocument();
  });
});
