'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface Organization {
  id: string;
  name: string;
}

interface OrgSwitcherProps {
  organizations: Organization[];
  currentOrgId: string;
  onSwitch: (orgId: string) => void;
  disabled?: boolean;
}

export function OrgSwitcher({
  organizations,
  currentOrgId,
  onSwitch,
  disabled = false,
}: OrgSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOrg = organizations.find((org) => org.id === currentOrgId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (orgId: string) => {
    if (disabled || orgId === currentOrgId) return;
    onSwitch(orgId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
          bg-zinc-800 text-zinc-200 hover:bg-zinc-700
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors
          ${isOpen ? 'bg-zinc-700' : ''}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span className="max-w-32 truncate">{currentOrg?.name || 'Select Org'}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 py-1 rounded-md shadow-lg bg-zinc-800 border border-zinc-700 z-50">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSelect(org.id)}
              disabled={disabled}
              className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between
                hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed
                ${org.id === currentOrgId ? 'text-blue-400' : 'text-zinc-200'}`}
            >
              <span className="truncate">{org.name}</span>
              {org.id === currentOrgId && (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
          {organizations.length === 0 && (
            <div className="px-3 py-2 text-sm text-zinc-500">No organizations</div>
          )}
        </div>
      )}
    </div>
  );
}