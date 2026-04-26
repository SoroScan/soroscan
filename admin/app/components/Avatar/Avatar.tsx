'use client';

import React, { useState } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** Image URL to display */
  src?: string;
  /** Full name used for initials fallback and tooltip */
  name: string;
  /** Size variant */
  size?: AvatarSize;
  /** Optional background color override */
  color?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

/** Generates a deterministic HSL background color from a string */
function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 40%)`;
}

/** Derives up to 2 uppercase initials from a name string */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, name, size = 'md', color }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(src) && !imgError;
  const bg = color ?? colorFromName(name);
  const sizeClass = SIZE_CLASSES[size];
  const initials = getInitials(name);

  return (
    <div className="relative inline-flex group">
      <div
        className={`${sizeClass} rounded-sm overflow-hidden flex items-center justify-center font-bold select-none focus:outline-none focus:ring-1 focus:ring-[#00ff88]`}
        style={showImage ? undefined : { backgroundColor: bg, border: '1px solid #00ff88', color: '#00ff88' }}
        role="img"
        aria-label={name}
        tabIndex={0}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span aria-hidden="true" className="font-mono tracking-wider">{initials}</span>
        )}
      </div>

      {/* Tooltip */}
      <span
        role="tooltip"
        className="
          pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          whitespace-nowrap rounded px-2 py-1 text-xs font-mono shadow-lg
          opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          transition-opacity duration-150 z-50
        "
        style={{ background: '#0d1a0d', border: '1px solid #00ff88', color: '#00ff88' }}
      >
        {name}
      </span>
    </div>
  );
}
