'use client';

import React, { useState } from 'react';

export interface AvatarProps {
  /** Image URL — falls back to initials if omitted or fails to load */
  src?: string;
  /** Full name used for initials and tooltip */
  name: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Override the background color for the initials fallback */
  color?: string;
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
};

/** Deterministic hue from a string so each user gets a consistent colour. */
function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  color,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const showImage = !!src && !imgError;
  const initials = getInitials(name);
  const bgColor = color ?? colorFromName(name);

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 group ${SIZE_CLASSES[size]} ${className}`}
      title={name}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="flex items-center justify-center w-full h-full font-semibold text-white select-none"
          style={{ backgroundColor: bgColor }}
          aria-label={initials}
        >
          {initials}
        </span>
      )}

      {/* Hover tooltip */}
      <span
        className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
          bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap
          opacity-0 group-hover:opacity-100 pointer-events-none
          transition-opacity duration-150 z-10
        "
        role="tooltip"
        aria-hidden="true"
      >
        {name}
      </span>
    </div>
  );
};

export default Avatar;
