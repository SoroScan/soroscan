import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ContractSourcePage from '@/app/contracts/[id]/source/page';

const mockUseParams = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
}));

describe('ContractSourcePage params resolving via useParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the contract by ID resolved from useParams without sync params warning', async () => {
    mockUseParams.mockReturnValue({ id: 'CA_TEST_123' });
    render(<ContractSourcePage />);

    expect(screen.getByTestId('source-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('source-loading')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('source-unverified-view')).toBeInTheDocument();
    expect(screen.getByTestId('request-verification-heading')).toHaveTextContent('Request Verification');
  });

  it('correctly decodes encoded contract IDs from route params', async () => {
    mockUseParams.mockReturnValue({ id: 'CA%3A%3A456' });
    render(<ContractSourcePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('source-loading')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('source-unverified-view')).toBeInTheDocument();
  });
});
