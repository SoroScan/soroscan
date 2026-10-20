import * as React from 'react';
import { render, screen } from '@testing-library/react';
import EventCorrelationPage from '@/app/contracts/[id]/events/correlation/page';

const mockUseParams = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
}));

describe('EventCorrelationPage params resolving via useParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves contract ID from useParams and displays it in header', () => {
    mockUseParams.mockReturnValue({ id: 'CA_CORRELATION_123' });
    render(<EventCorrelationPage />);

    expect(screen.getByTestId('correlation-page')).toBeInTheDocument();
    expect(screen.getByText('Event Correlation')).toBeInTheDocument();
    expect(screen.getByText('CA_CORRELATION_123')).toBeInTheDocument();
    expect(screen.getByTestId('correlation-empty-state')).toBeInTheDocument();
  });

  it('correctly decodes encoded contract IDs from route params', () => {
    mockUseParams.mockReturnValue({ id: 'CA%3A%3A789' });
    render(<EventCorrelationPage />);

    expect(screen.getByText('CA::789')).toBeInTheDocument();
  });
});
