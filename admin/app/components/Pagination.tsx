'use client';

import React, { useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaginationProps {
  // ── Page-based mode ──────────────────────────────────────────────────────
  /** Current page number (1-indexed). Used in page-based mode. */
  currentPage?: number;
  /** Total number of pages. Used in page-based mode. */
  totalPages?: number;

  // ── Cursor-based mode ────────────────────────────────────────────────────
  /**
   * Opaque cursor for the next page.
   * When provided the component operates in cursor mode.
   */
  nextCursor?: string | null;
  /** Opaque cursor for the previous page. */
  previousCursor?: string | null;

  // ── Display helpers ──────────────────────────────────────────────────────
  /** Number of items shown per page (used to render item-range text). */
  itemsPerPage?: number;
  /** Total items in the dataset (used to render item-range text). */
  totalItems?: number;

  // ── Callbacks ─────────────────────────────────────────────────────────────
  /** Called when the "next" button is clicked (enabled state only). */
  onNext?: () => void;
  /** Called when the "previous" button is clicked (enabled state only). */
  onPrevious?: () => void;

  /** Additional CSS classes on the root element. */
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns whether the component is operating in cursor-based mode.
 * Cursor mode takes priority when both nextCursor/previousCursor props are
 * supplied alongside page-based props (Req 8.2).
 */
function isCursorMode(props: PaginationProps): boolean {
  return props.nextCursor !== undefined || props.previousCursor !== undefined;
}

/** Formats an item-range string, e.g. "Showing 21–40 of 1 000". */
function buildItemRangeText(
  currentPage: number,
  itemsPerPage: number,
  totalItems: number,
): string {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  return `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${totalItems.toLocaleString()}`;
}

// ─── Sub-component: NavButton ─────────────────────────────────────────────────

interface NavButtonProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
  testId: string;
  ariaLabel: string;
}

const NavButton: React.FC<NavButtonProps> = ({
  label,
  onClick,
  disabled,
  testId,
  ariaLabel,
}) => (
  <button
    type="button"
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    data-testid={testId}
    aria-label={ariaLabel}
    aria-disabled={disabled}
    className={[
      // Base
      'px-3 py-2 sm:px-4',
      'text-xs sm:text-sm font-mono uppercase tracking-wider',
      'border rounded',
      'transition-colors duration-150',
      'min-h-[44px] min-w-[44px]', // touch-target (Req mobile-responsive Req 5)
      'select-none',
      // Enabled
      !disabled && 'text-zinc-100 border-zinc-700 hover:text-zinc-50 hover:border-zinc-500 hover:bg-zinc-800/60 cursor-pointer',
      // Disabled (Req 6)
      disabled && 'text-zinc-100/50 border-zinc-700/50 cursor-not-allowed',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {label}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Pagination: React.FC<PaginationProps> = (props) => {
  const {
    currentPage,
    totalPages,
    nextCursor,
    previousCursor,
    itemsPerPage,
    totalItems,
    onNext,
    onPrevious,
    className = '',
  } = props;

  // ── Edge-case warnings (Req 8) ──────────────────────────────────────────
  useEffect(() => {
    if (
      currentPage !== undefined &&
      totalPages !== undefined &&
      (currentPage < 1 || currentPage > totalPages)
    ) {
      console.warn(
        `[Pagination] currentPage (${currentPage}) is out of range [1, ${totalPages}].`,
      );
    }
    if (itemsPerPage === 0) {
      console.warn('[Pagination] itemsPerPage is 0 — pagination display may be incorrect.');
    }
  }, [currentPage, totalPages, itemsPerPage]);

  const cursorMode = isCursorMode(props);

  // ── No-props / empty state (Req 8.3) ────────────────────────────────────
  const hasData = cursorMode
    ? true
    : currentPage !== undefined && totalPages !== undefined;

  // ── Determine enabled states ─────────────────────────────────────────────
  let prevEnabled: boolean;
  let nextEnabled: boolean;

  if (cursorMode) {
    prevEnabled = Boolean(previousCursor);
    nextEnabled = Boolean(nextCursor);
  } else if (hasData) {
    const page = currentPage as number;
    const pages = totalPages as number;
    prevEnabled = page > 1;
    nextEnabled = page < pages;
  } else {
    prevEnabled = false;
    nextEnabled = false;
  }

  // ── Centre-label text ────────────────────────────────────────────────────
  let centreText: string;

  if (!hasData && !cursorMode) {
    centreText = '—';
  } else if (cursorMode) {
    if (
      itemsPerPage !== undefined &&
      totalItems !== undefined &&
      currentPage !== undefined
    ) {
      centreText = buildItemRangeText(currentPage, itemsPerPage, totalItems);
    } else if (itemsPerPage !== undefined && currentPage !== undefined) {
      const start = (currentPage - 1) * itemsPerPage + 1;
      const end = currentPage * itemsPerPage;
      centreText = `Showing ${start.toLocaleString()}–${end.toLocaleString()}`;
    } else {
      centreText = '';
    }
  } else {
    // Page-based
    centreText = `Page ${currentPage} of ${totalPages}`;
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePrev = () => {
    if (prevEnabled && onPrevious) onPrevious();
  };

  const handleNext = () => {
    if (nextEnabled && onNext) onNext();
  };

  return (
    <nav
      aria-label="Pagination"
      data-testid="pagination"
      className={[
        'flex items-center justify-between gap-3 flex-wrap',
        'px-3 py-2 sm:px-4',
        'bg-zinc-900 border border-zinc-800 rounded',
        'font-mono text-zinc-100',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Previous button */}
      <NavButton
        label="&lt; PREV"
        onClick={handlePrev}
        disabled={!prevEnabled}
        testId="pagination-prev"
        ariaLabel="Previous page"
      />

      {/* Page info / item range */}
      <span
        data-testid="pagination-info"
        className="text-xs sm:text-sm text-zinc-400 font-mono text-center flex-1 min-w-0 truncate"
        aria-live="polite"
        aria-atomic="true"
      >
        {centreText}
      </span>

      {/* Next button */}
      <NavButton
        label="NEXT &gt;"
        onClick={handleNext}
        disabled={!nextEnabled}
        testId="pagination-next"
        ariaLabel="Next page"
      />
    </nav>
  );
};

export default Pagination;
