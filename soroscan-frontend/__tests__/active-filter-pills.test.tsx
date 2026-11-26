import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ActiveFilterPills, { type ActiveFilter } from '../src/components/ActiveFilterPills';

const filters: ActiveFilter[] = [
  { key: 'network', label: 'Network', value: 'Testnet' },
  { key: 'event', label: 'Event type', value: 'Transfer' },
  { key: 'contract', label: 'Contract', value: 'CA123' },
];

describe('ActiveFilterPills', () => {
  it('renders one labeled pill and removal button per active filter', () => {
    const onRemove = jest.fn();
    render(<ActiveFilterPills filters={filters} onRemove={onRemove} />);

    const list = screen.getByRole('list', { name: 'Active filters' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Network: Testnet');
    expect(items[1]).toHaveTextContent('Event type: Transfer');
    expect(items[2]).toHaveTextContent('Contract: CA123');
    expect(within(list).getAllByRole('button')).toHaveLength(3);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it.each([
    ['Remove Network filter', 'network'],
    ['Remove Event type filter', 'event'],
    ['Remove Contract filter', 'contract'],
  ])('passes the correct filter key when %s is clicked', (buttonName, key) => {
    const onRemove = jest.fn();
    render(<ActiveFilterPills filters={filters} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('button', { name: buttonName }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(key);
  });

  it('renders nothing for an empty filter list', () => {
    const { container } = render(<ActiveFilterPills filters={[]} onRemove={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('list', { name: 'Active filters' })).not.toBeInTheDocument();
  });

  it('updates when a parent removes a filter from the supplied list', () => {
    const onRemove = jest.fn();
    const { rerender } = render(<ActiveFilterPills filters={filters} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Network filter' }));
    expect(onRemove).toHaveBeenCalledWith('network');
    // This is a controlled component: the parent supplies the updated filters.
    rerender(<ActiveFilterPills filters={filters.slice(1)} onRemove={onRemove} />);

    expect(screen.queryByText('Network: Testnet')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Event type: Transfer')).toBeInTheDocument();
  });

  it('renders a single filter without creating any unrelated controls', () => {
    render(<ActiveFilterPills filters={[filters[0]]} onRemove={jest.fn()} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
  });
});
