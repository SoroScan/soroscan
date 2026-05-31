'use client';

import React from 'react';
import Tooltip from './Tooltip';

export interface TooltipInfoIconProps {
  /** Explanation text shown in the tooltip */
  content: React.ReactNode;
  /** Preferred tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Accessible label for the icon button (defaults to "More information") */
  label?: string;
  /** Icon size in pixels */
  size?: number;
  /** Additional CSS classes on the icon button */
  className?: string;
}

const TooltipInfoIcon: React.FC<TooltipInfoIconProps> = ({
  content,
  position = 'top',
  label = 'More information',
  size = 16,
  className = '',
}) => {
  return (
    <Tooltip content={content} position={position} delay={200}>
      {/* button makes the icon keyboard-focusable; type=button prevents form submission */}
      <button
        type="button"
        aria-label={label}
        className={`
          inline-flex items-center justify-center
          text-gray-400 hover:text-gray-600
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
          rounded-full transition-colors
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        data-testid="tooltip-info-icon"
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          {/* Circle outline */}
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
          {/* Dot above the i */}
          <circle cx="8" cy="5.5" r="0.75" />
          {/* Stem of the i */}
          <rect x="7.25" y="7.25" width="1.5" height="4" rx="0.5" />
        </svg>
      </button>
    </Tooltip>
  );
};

export default TooltipInfoIcon;
