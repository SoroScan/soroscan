'use client';

import React from 'react';

export interface CardProps {
  /** Shadow/border variant */
  variant?: 'default' | 'flat' | 'elevated';
  /** Background color */
  background?: 'white' | 'gray' | 'blue' | 'green' | 'yellow' | 'red';
  /** Enable hover lift effect */
  hoverable?: boolean;
  /** Optional title rendered in the card header */
  title?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Card body content */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  default:  'border border-gray-200 shadow-sm',
  flat:     'border border-gray-200',
  elevated: 'border border-gray-200 shadow-lg',
};

const backgroundClasses: Record<NonNullable<CardProps['background']>, string> = {
  white:  'bg-white',
  gray:   'bg-gray-50',
  blue:   'bg-blue-50',
  green:  'bg-green-50',
  yellow: 'bg-yellow-50',
  red:    'bg-red-50',
};

const Card: React.FC<CardProps> = ({
  variant = 'default',
  background = 'white',
  hoverable = false,
  title,
  footer,
  children,
  className = '',
}) => {
  return (
    <div
      className={`
        rounded-lg overflow-hidden
        ${variantClasses[variant]}
        ${backgroundClasses[background]}
        ${hoverable ? 'transition-shadow duration-200 hover:shadow-md cursor-pointer' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 font-semibold text-gray-800">
          {title}
        </div>
      )}

      <div className="p-4">
        {children}
      </div>

      {footer && (
        <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
