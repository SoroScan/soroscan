'use client';

import React from 'react';

export interface DividerProps {
  /** Orientation of the divider */
  orientation?: 'horizontal' | 'vertical';
  /** Optional label centered on a horizontal divider */
  label?: string;
  /** Visual weight */
  variant?: 'subtle' | 'prominent';
  /** Custom color (overrides variant) */
  color?: string;
  /** Additional CSS classes */
  className?: string;
}

const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  label,
  variant = 'subtle',
  color,
  className = '',
}) => {
  const lineStyle = color ? { backgroundColor: color } : undefined;

  const lineClass = [
    orientation === 'vertical' ? 'w-px h-full' : 'h-px w-full',
    variant === 'subtle' ? 'bg-gray-200' : 'bg-gray-400',
  ].join(' ');

  if (orientation === 'horizontal' && label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={`flex items-center gap-3 w-full ${className}`}
      >
        <div className={`flex-1 ${lineClass}`} style={lineStyle} />
        <span className="text-sm text-gray-500 whitespace-nowrap">{label}</span>
        <div className={`flex-1 ${lineClass}`} style={lineStyle} />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`${lineClass} ${className}`}
      style={lineStyle}
    />
  );
};

export default Divider;
