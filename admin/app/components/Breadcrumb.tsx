'use client';

import React from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Navigation href — omit for the current (last) page */
  href?: string;
}

export interface BreadcrumbProps {
  /** Ordered list of breadcrumb items */
  items: BreadcrumbItem[];
  /** Character(s) used as separator between items */
  separator?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = '/',
  className = '',
}) => {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-gray-400 select-none">
                  {separator}
                </span>
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'text-gray-900 font-medium' : 'text-gray-500'}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-gray-900 hover:underline transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
