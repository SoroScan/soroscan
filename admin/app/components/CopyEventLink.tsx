'use client';

import React, { useState, useCallback, useRef } from 'react';

export interface CopyEventLinkProps {
  /** The event ID to embed in the shareable link */
  eventId: string | number;
  /**
   * Base URL for the event page.
   * Defaults to `window.location.origin + '/events'` at runtime.
   * Override in tests or SSR contexts via this prop.
   */
  baseUrl?: string;
  /** Duration in ms to show the "Copied!" confirmation (default 2000) */
  feedbackDuration?: number;
  /** Additional CSS classes on the button */
  className?: string;
}

/** Builds the shareable URL for an event. */
export function buildEventUrl(eventId: string | number, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/${eventId}`;
}

const CopyEventLink: React.FC<CopyEventLinkProps> = ({
  eventId,
  baseUrl,
  feedbackDuration = 2000,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const handleCopy = useCallback(async () => {
    const resolvedBase =
      baseUrl ?? (typeof window !== 'undefined' ? `${window.location.origin}/events` : '/events');

    const url = buildEventUrl(eventId, resolvedBase);

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for environments without clipboard API (e.g. non-secure contexts)
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), feedbackDuration);
  }, [eventId, baseUrl, feedbackDuration]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Link copied' : `Copy link to event ${eventId}`}
      aria-live="polite"
      data-testid="copy-event-link"
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1.5 text-xs font-medium rounded-md
        border transition-colors
        ${
          copied
            ? 'border-green-300 bg-green-50 text-green-700'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800'
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {copied ? (
        <>
          {/* Checkmark icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Copied!
        </>
      ) : (
        <>
          {/* Link icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M5 6.5a2.5 2.5 0 003.536.036l1.5-1.5A2.5 2.5 0 006.5 1.5L5.75 2.25"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            <path
              d="M7 5.5a2.5 2.5 0 00-3.536-.036l-1.5 1.5A2.5 2.5 0 005.5 10.5l.75-.75"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
          Copy Link
        </>
      )}
    </button>
  );
};

export default CopyEventLink;
