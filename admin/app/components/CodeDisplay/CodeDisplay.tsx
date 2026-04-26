'use client';

import React, { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import type { SyntaxHighlighterProps } from 'react-syntax-highlighter';

export interface CodeDisplayProps {
  /** The code string to display */
  code: string;
  /** Language for syntax highlighting (e.g. 'javascript', 'python', 'json') */
  language?: string;
  /** Show line numbers alongside code */
  showLineNumbers?: boolean;
  /** Optional label shown in the header bar */
  label?: string;
}

/** Soroscan terminal-style theme matching the design system */
const soroscanTheme: SyntaxHighlighterProps['style'] = {
  'code[class*="language-"]': {
    color: '#e0ffe0',
    background: 'none',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: '0.875rem',
    lineHeight: '1.6',
  },
  'pre[class*="language-"]': {
    color: '#e0ffe0',
    background: '#0d1a0d',
    margin: 0,
    padding: 0,
    overflow: 'auto',
  },
  comment: { color: '#4a7a4a', fontStyle: 'italic' },
  prolog: { color: '#4a7a4a' },
  doctype: { color: '#4a7a4a' },
  cdata: { color: '#4a7a4a' },
  punctuation: { color: '#a0c0a0' },
  property: { color: '#00ff88' },
  tag: { color: '#00ff88' },
  boolean: { color: '#00cc66' },
  number: { color: '#00cc66' },
  constant: { color: '#00cc66' },
  symbol: { color: '#00cc66' },
  deleted: { color: '#ff4444' },
  selector: { color: '#00ff88' },
  'attr-name': { color: '#00ff88' },
  string: { color: '#88ffcc' },
  char: { color: '#88ffcc' },
  builtin: { color: '#88ffcc' },
  inserted: { color: '#88ffcc' },
  operator: { color: '#a0c0a0' },
  entity: { color: '#a0c0a0', cursor: 'help' },
  url: { color: '#a0c0a0' },
  variable: { color: '#e0ffe0' },
  atrule: { color: '#00ff88' },
  'attr-value': { color: '#88ffcc' },
  function: { color: '#00ff88', fontWeight: 'bold' },
  'class-name': { color: '#00ff88', fontWeight: 'bold' },
  keyword: { color: '#00cc66', fontWeight: 'bold' },
  regex: { color: '#88ffcc' },
  important: { color: '#00cc66', fontWeight: 'bold' },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
};

export function CodeDisplay({
  code,
  language = 'javascript',
  showLineNumbers = false,
  label,
}: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail — clipboard may be blocked
    }
  }, [code]);

  return (
    <div
      className="rounded-sm overflow-hidden font-mono text-sm"
      style={{ background: '#0d1a0d', border: '1px solid #1a3a1a' }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: '#112211', borderBottom: '1px solid #1a3a1a' }}
      >
        <div className="flex items-center gap-2">
          {/* Terminal dots */}
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff4444' }} aria-hidden="true" />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffaa00' }} aria-hidden="true" />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#00ff88' }} aria-hidden="true" />
          {label && (
            <span className="ml-2 text-xs tracking-widest uppercase" style={{ color: '#4a7a4a' }}>
              {label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs tracking-widest uppercase" style={{ color: '#4a7a4a' }}>
            {language}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
            className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs tracking-wider uppercase transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-[#00ff88]"
            style={{
              background: copied ? '#00ff88' : 'transparent',
              color: copied ? '#0a0f0a' : '#00ff88',
              border: '1px solid #00ff88',
            }}
          >
            {copied ? (
              <>
                <CheckIcon />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto" data-testid="code-scroll-container">
        <SyntaxHighlighter
          language={language}
          style={soroscanTheme}
          showLineNumbers={showLineNumbers}
          lineNumberStyle={{ color: '#1a3a1a', minWidth: '2.5em', paddingRight: '1em', userSelect: 'none' }}
          customStyle={{ margin: 0, padding: '1rem', background: '#0d1a0d', minWidth: 'max-content' }}
          wrapLongLines={false}
          PreTag="div"
          CodeTag="code"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
