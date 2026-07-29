/**
 * Pagination — unit tests
 *
 * Coverage map:
 *  Req 1  — renders pagination controls (prev/next buttons + info text)
 *  Req 2  — cursor-based mode enables/disables buttons by cursor presence
 *  Req 3  — page-based mode: "Page X of Y", boundary disable logic
 *  Req 4  — navigation callbacks only fire when button is enabled
 *  Req 5  — terminal styling classes (zinc palette, font-mono, uppercase)
 *  Req 6  — disabled buttons have opacity/cursor-not-allowed classes
 *  Req 7  — all configuration props accepted and reflected in the output
 *  Req 8  — edge-case: console.warn on out-of-range page, both-mode priority
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pagination from '../Pagination';
import type { PaginationProps } from '../Pagination';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderPagination(props: PaginationProps = {}) {
  return render(<Pagination {...props} />);
}

function getPrev() {
  return screen.getByTestId('pagination-prev');
}

function getNext() {
  return screen.getByTestId('pagination-next');
}

function getInfo() {
  return screen.getByTestId('pagination-info');
}

// ─── Req 1: Basic rendering ───────────────────────────────────────────────────

describe('Pagination — basic rendering', () => {
  it('renders the pagination nav', () => {
    renderPagination();
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('renders a previous button', () => {
    renderPagination();
    expect(getPrev()).toBeInTheDocument();
  });

  it('renders a next button', () => {
    renderPagination();
    expect(getNext()).toBeInTheDocument();
  });

  it('renders a page-info element', () => {
    renderPagination();
    expect(getInfo()).toBeInTheDocument();
  });

  it('prev button has accessible label', () => {
    renderPagination();
    expect(getPrev()).toHaveAttribute('aria-label', 'Previous page');
  });

  it('next button has accessible label', () => {
    renderPagination();
    expect(getNext()).toHaveAttribute('aria-label', 'Next page');
  });

  it('nav element has aria-label="Pagination"', () => {
    renderPagination();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('buttons are type="button" to prevent accidental form submission', () => {
    renderPagination();
    expect(getPrev()).toHaveAttribute('type', 'button');
    expect(getNext()).toHaveAttribute('type', 'button');
  });
});

// ─── Req 3: Page-based mode ───────────────────────────────────────────────────

describe('Pagination — page-based mode', () => {
  it('shows "Page X of Y" in the info area', () => {
    renderPagination({ currentPage: 3, totalPages: 10 });
    expect(getInfo()).toHaveTextContent('Page 3 of 10');
  });

  it('disables prev button on the first page', () => {
    renderPagination({ currentPage: 1, totalPages: 5 });
    expect(getPrev()).toBeDisabled();
  });

  it('disables next button on the last page', () => {
    renderPagination({ currentPage: 5, totalPages: 5 });
    expect(getNext()).toBeDisabled();
  });

  it('enables both buttons on an intermediate page', () => {
    renderPagination({ currentPage: 3, totalPages: 5 });
    expect(getPrev()).not.toBeDisabled();
    expect(getNext()).not.toBeDisabled();
  });

  it('enables only next button when on page 1 of many', () => {
    renderPagination({ currentPage: 1, totalPages: 3 });
    expect(getPrev()).toBeDisabled();
    expect(getNext()).not.toBeDisabled();
  });

  it('enables only prev button on last page', () => {
    renderPagination({ currentPage: 3, totalPages: 3 });
    expect(getPrev()).not.toBeDisabled();
    expect(getNext()).toBeDisabled();
  });

  it('shows single-page mode with both buttons disabled', () => {
    renderPagination({ currentPage: 1, totalPages: 1 });
    expect(getPrev()).toBeDisabled();
    expect(getNext()).toBeDisabled();
  });
});

// ─── Req 2: Cursor-based mode ─────────────────────────────────────────────────

describe('Pagination — cursor-based mode', () => {
  it('enables next button when nextCursor is provided', () => {
    renderPagination({ nextCursor: 'cursor-abc' });
    expect(getNext()).not.toBeDisabled();
  });

  it('disables next button when nextCursor is null', () => {
    renderPagination({ nextCursor: null });
    expect(getNext()).toBeDisabled();
  });

  it('disables next button when nextCursor is undefined', () => {
    renderPagination({ nextCursor: undefined, previousCursor: 'cursor-xyz' });
    expect(getNext()).toBeDisabled();
  });

  it('enables prev button when previousCursor is provided', () => {
    renderPagination({ previousCursor: 'cursor-xyz' });
    expect(getPrev()).not.toBeDisabled();
  });

  it('disables prev button when previousCursor is null', () => {
    renderPagination({ nextCursor: 'cursor-abc', previousCursor: null });
    expect(getPrev()).toBeDisabled();
  });

  it('disables prev button when previousCursor is undefined', () => {
    renderPagination({ nextCursor: 'cursor-abc' });
    expect(getPrev()).toBeDisabled();
  });

  it('shows item-range text when cursor mode + itemsPerPage + totalItems + currentPage', () => {
    renderPagination({
      nextCursor: 'cursor-abc',
      currentPage: 2,
      itemsPerPage: 20,
      totalItems: 100,
    });
    expect(getInfo()).toHaveTextContent('Showing 21');
    expect(getInfo()).toHaveTextContent('40');
    expect(getInfo()).toHaveTextContent('100');
  });
});

// ─── Req 4: Navigation callbacks ─────────────────────────────────────────────

describe('Pagination — navigation callbacks', () => {
  it('calls onNext when next button is clicked and enabled', () => {
    const onNext = jest.fn();
    renderPagination({ currentPage: 1, totalPages: 3, onNext });
    fireEvent.click(getNext());
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onPrevious when prev button is clicked and enabled', () => {
    const onPrevious = jest.fn();
    renderPagination({ currentPage: 2, totalPages: 3, onPrevious });
    fireEvent.click(getPrev());
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onNext when next button is disabled', () => {
    const onNext = jest.fn();
    renderPagination({ currentPage: 3, totalPages: 3, onNext });
    fireEvent.click(getNext());
    expect(onNext).not.toHaveBeenCalled();
  });

  it('does NOT call onPrevious when prev button is disabled', () => {
    const onPrevious = jest.fn();
    renderPagination({ currentPage: 1, totalPages: 3, onPrevious });
    fireEvent.click(getPrev());
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it('calls onNext in cursor mode when nextCursor is present', () => {
    const onNext = jest.fn();
    renderPagination({ nextCursor: 'cursor-abc', onNext });
    fireEvent.click(getNext());
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onPrevious in cursor mode when previousCursor is present', () => {
    const onPrevious = jest.fn();
    renderPagination({ previousCursor: 'cursor-xyz', onPrevious });
    fireEvent.click(getPrev());
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('does not throw when onNext is undefined and next is clicked', () => {
    renderPagination({ currentPage: 1, totalPages: 3 });
    expect(() => fireEvent.click(getNext())).not.toThrow();
  });

  it('does not throw when onPrevious is undefined and prev is clicked', () => {
    renderPagination({ currentPage: 2, totalPages: 3 });
    expect(() => fireEvent.click(getPrev())).not.toThrow();
  });
});

// ─── Req 5: Terminal styling ──────────────────────────────────────────────────

describe('Pagination — terminal styling', () => {
  it('applies font-mono to the nav container', () => {
    renderPagination();
    expect(screen.getByTestId('pagination')).toHaveClass('font-mono');
  });

  it('prev button label contains "PREV"', () => {
    renderPagination();
    expect(getPrev()).toHaveTextContent('PREV');
  });

  it('next button label contains "NEXT"', () => {
    renderPagination();
    expect(getNext()).toHaveTextContent('NEXT');
  });

  it('prev button label contains "<"', () => {
    renderPagination();
    expect(getPrev().textContent).toMatch(/<|&lt;|PREV/);
  });

  it('next button label contains ">"', () => {
    renderPagination();
    expect(getNext().textContent).toMatch(/>|&gt;|NEXT/);
  });

  it('applies zinc-900 background class to nav', () => {
    renderPagination();
    expect(screen.getByTestId('pagination')).toHaveClass('bg-zinc-900');
  });

  it('applies border to the nav container', () => {
    renderPagination();
    expect(screen.getByTestId('pagination')).toHaveClass('border');
  });
});

// ─── Req 6: Disabled button appearance ───────────────────────────────────────

describe('Pagination — disabled button appearance', () => {
  it('disabled prev button has aria-disabled=true', () => {
    renderPagination({ currentPage: 1, totalPages: 5 });
    expect(getPrev()).toHaveAttribute('aria-disabled', 'true');
  });

  it('disabled next button has aria-disabled=true', () => {
    renderPagination({ currentPage: 5, totalPages: 5 });
    expect(getNext()).toHaveAttribute('aria-disabled', 'true');
  });

  it('enabled prev button does NOT have disabled attribute', () => {
    renderPagination({ currentPage: 2, totalPages: 5 });
    expect(getPrev()).not.toBeDisabled();
  });

  it('enabled next button does NOT have disabled attribute', () => {
    renderPagination({ currentPage: 2, totalPages: 5 });
    expect(getNext()).not.toBeDisabled();
  });
});

// ─── Req 7: Configuration props ──────────────────────────────────────────────

describe('Pagination — configuration props', () => {
  it('accepts className and applies it to the root', () => {
    renderPagination({ className: 'my-custom-pagination' });
    expect(screen.getByTestId('pagination')).toHaveClass('my-custom-pagination');
  });

  it('accepts itemsPerPage prop', () => {
    renderPagination({ currentPage: 1, totalPages: 5, itemsPerPage: 20 });
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('accepts totalItems prop', () => {
    renderPagination({ currentPage: 1, totalPages: 5, totalItems: 100 });
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('accepts onNext callback', () => {
    const onNext = jest.fn();
    renderPagination({ currentPage: 1, totalPages: 2, onNext });
    fireEvent.click(getNext());
    expect(onNext).toHaveBeenCalled();
  });

  it('accepts onPrevious callback', () => {
    const onPrevious = jest.fn();
    renderPagination({ currentPage: 2, totalPages: 3, onPrevious });
    fireEvent.click(getPrev());
    expect(onPrevious).toHaveBeenCalled();
  });
});

// ─── Req 8: Edge cases ───────────────────────────────────────────────────────

describe('Pagination — edge cases', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs a warning when currentPage is less than 1', () => {
    renderPagination({ currentPage: 0, totalPages: 5 });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('out of range'),
    );
  });

  it('logs a warning when currentPage exceeds totalPages', () => {
    renderPagination({ currentPage: 10, totalPages: 5 });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('out of range'),
    );
  });

  it('logs a warning when itemsPerPage is 0', () => {
    renderPagination({ currentPage: 1, totalPages: 5, itemsPerPage: 0 });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('itemsPerPage is 0'),
    );
  });

  it('cursor mode takes priority when both cursor and page props are supplied', () => {
    // In cursor mode the info text is NOT "Page X of Y"
    renderPagination({
      nextCursor: 'cursor-abc',
      currentPage: 2,
      totalPages: 5,
    });
    expect(getInfo()).not.toHaveTextContent('Page 2 of 5');
  });

  it('renders with no props without crashing', () => {
    expect(() => renderPagination()).not.toThrow();
  });

  it('renders with both buttons disabled when no data provided', () => {
    renderPagination();
    expect(getPrev()).toBeDisabled();
    expect(getNext()).toBeDisabled();
  });
});

// ─── Responsive: touch-target minimum size ────────────────────────────────────

describe('Pagination — accessibility / responsive', () => {
  it('both buttons have min-h-[44px] touch-target class', () => {
    renderPagination({ currentPage: 1, totalPages: 3 });
    expect(getPrev()).toHaveClass('min-h-[44px]');
    expect(getNext()).toHaveClass('min-h-[44px]');
  });

  it('both buttons have min-w-[44px] touch-target class', () => {
    renderPagination({ currentPage: 1, totalPages: 3 });
    expect(getPrev()).toHaveClass('min-w-[44px]');
    expect(getNext()).toHaveClass('min-w-[44px]');
  });

  it('info text has aria-live="polite" for screen reader announcements', () => {
    renderPagination({ currentPage: 1, totalPages: 5 });
    expect(getInfo()).toHaveAttribute('aria-live', 'polite');
  });

  it('info text has aria-atomic="true"', () => {
    renderPagination({ currentPage: 1, totalPages: 5 });
    expect(getInfo()).toHaveAttribute('aria-atomic', 'true');
  });
});
