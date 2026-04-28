import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pagination from '../Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalItems: 100,
    pageSize: 10,
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correct page information', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();
    expect(screen.getByText('(100 items)')).toBeInTheDocument();
  });

  it('renders page number buttons', () => {
    render(<Pagination {...defaultProps} />);
    // Should show pages 1 to 5 by default (maxVisiblePages is 5)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByText('6')).not.toBeInTheDocument();
  });

  it('calls onPageChange when a page button is clicked', () => {
    render(<Pagination {...defaultProps} />);
    fireEvent.click(screen.getByText('2'));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous and first buttons on the first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    expect(screen.getByLabelText('First page')).toBeDisabled();
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
    expect(screen.getByLabelText('Last page')).not.toBeDisabled();
  });

  it('disables next and last buttons on the last page', () => {
    render(<Pagination {...defaultProps} currentPage={10} />);
    expect(screen.getByLabelText('First page')).not.toBeDisabled();
    expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
    expect(screen.getByLabelText('Next page')).toBeDisabled();
    expect(screen.getByLabelText('Last page')).toBeDisabled();
  });

  it('calls onPageChange with 1 when first button is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    fireEvent.click(screen.getByLabelText('First page'));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with last page when last button is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    fireEvent.click(screen.getByLabelText('Last page'));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(10);
  });

  it('calls onPageChange with previous page when previous button is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(4);
  });

  it('calls onPageChange with next page when next button is clicked', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(6);
  });

  it('calls onPageSizeChange when page size selector is changed', () => {
    render(<Pagination {...defaultProps} />);
    const select = screen.getByLabelText('Rows per page:');
    fireEvent.change(select, { target: { value: '20' } });
    expect(defaultProps.onPageSizeChange).toHaveBeenCalledWith(20);
  });

  it('highlights the current page button', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    const activeBtn = screen.getByText('3');
    expect(activeBtn).toHaveClass('bg-blue-600');
    expect(activeBtn).toHaveAttribute('aria-current', 'page');
    expect(activeBtn).toHaveAttribute('aria-label', 'Go to page 3');
  });

  it('handles custom page size options', () => {
    const pageSizeOptions = [5, 10, 15];
    render(<Pagination {...defaultProps} pageSizeOptions={pageSizeOptions} />);
    const select = screen.getByLabelText('Rows per page:');
    expect(select.querySelectorAll('option')).toHaveLength(3);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
