import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeDisplay } from '../CodeDisplay';

// Mock react-syntax-highlighter to avoid heavy rendering in tests
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({
    children,
    showLineNumbers,
    language,
  }: {
    children: string;
    showLineNumbers?: boolean;
    language?: string;
  }) => (
    <div data-testid="syntax-highlighter" data-language={language}>
      {showLineNumbers && <span data-testid="line-numbers" />}
      <code>{children}</code>
    </div>
  ),
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({}));

const SAMPLE_CODE = 'const x = 42;\nconsole.log(x);';

describe('CodeDisplay', () => {
  describe('Rendering', () => {
    it('renders the code content', () => {
      render(<CodeDisplay code={SAMPLE_CODE} language="javascript" />);
      // Code may be split across elements; check the container has the text
      const highlighter = screen.getByTestId('syntax-highlighter');
      expect(highlighter).toHaveTextContent('const x = 42;');
      expect(highlighter).toHaveTextContent('console.log(x);');
    });

    it('passes the correct language to the highlighter', () => {
      render(<CodeDisplay code={SAMPLE_CODE} language="python" />);
      expect(screen.getByTestId('syntax-highlighter')).toHaveAttribute('data-language', 'python');
    });

    it('defaults language to javascript when not provided', () => {
      render(<CodeDisplay code={SAMPLE_CODE} />);
      expect(screen.getByTestId('syntax-highlighter')).toHaveAttribute('data-language', 'javascript');
    });

    it('renders the language label in the header', () => {
      render(<CodeDisplay code={SAMPLE_CODE} language="typescript" />);
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });

    it('renders an optional label when provided', () => {
      render(<CodeDisplay code={SAMPLE_CODE} label="example.ts" />);
      expect(screen.getByText('example.ts')).toBeInTheDocument();
    });

    it('does not render a label when not provided', () => {
      render(<CodeDisplay code={SAMPLE_CODE} />);
      expect(screen.queryByText('example.ts')).not.toBeInTheDocument();
    });
  });

  describe('Line numbers', () => {
    it('renders line numbers when showLineNumbers is true', () => {
      render(<CodeDisplay code={SAMPLE_CODE} showLineNumbers />);
      expect(screen.getByTestId('line-numbers')).toBeInTheDocument();
    });

    it('does not render line numbers when showLineNumbers is false', () => {
      render(<CodeDisplay code={SAMPLE_CODE} showLineNumbers={false} />);
      expect(screen.queryByTestId('line-numbers')).not.toBeInTheDocument();
    });

    it('does not render line numbers by default', () => {
      render(<CodeDisplay code={SAMPLE_CODE} />);
      expect(screen.queryByTestId('line-numbers')).not.toBeInTheDocument();
    });
  });

  describe('Copy to clipboard', () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('renders a copy button', () => {
      render(<CodeDisplay code={SAMPLE_CODE} />);
      expect(screen.getByRole('button', { name: /copy code to clipboard/i })).toBeInTheDocument();
    });

    it('calls clipboard.writeText with the full code on click', async () => {
      render(<CodeDisplay code={SAMPLE_CODE} />);
      const btn = screen.getByRole('button', { name: /copy code to clipboard/i });
      await act(async () => { fireEvent.click(btn); });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SAMPLE_CODE);
    });

    it('shows "Copied" feedback after clicking copy', async () => {
      render(<CodeDisplay code={SAMPLE_CODE} />);
      const btn = screen.getByRole('button', { name: /copy code to clipboard/i });
      await act(async () => { fireEvent.click(btn); });
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    it('updates aria-label to "Copied to clipboard" after click', async () => {
      render(<CodeDisplay code={SAMPLE_CODE} />);
      const btn = screen.getByRole('button', { name: /copy code to clipboard/i });
      await act(async () => { fireEvent.click(btn); });
      expect(screen.getByRole('button', { name: /copied to clipboard/i })).toBeInTheDocument();
    });

    it('reverts copy button back to "Copy" after 2 seconds', async () => {
      jest.useFakeTimers();
      render(<CodeDisplay code={SAMPLE_CODE} />);
      const btn = screen.getByRole('button', { name: /copy code to clipboard/i });
      await act(async () => { fireEvent.click(btn); });
      expect(screen.getByText('Copied')).toBeInTheDocument();
      act(() => { jest.advanceTimersByTime(2000); });
      await waitFor(() => expect(screen.getByText('Copy')).toBeInTheDocument());
      jest.useRealTimers();
    });

    it('copy button is keyboard focusable', () => {
      render(<CodeDisplay code={SAMPLE_CODE} />);
      const btn = screen.getByRole('button', { name: /copy code to clipboard/i });
      expect(btn).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Horizontal scrolling', () => {
    it('renders a scroll container for long code', () => {
      const longCode = 'const veryLongVariableName = "this is a very long line that should trigger horizontal scrolling in the code display component";';
      render(<CodeDisplay code={longCode} />);
      expect(screen.getByTestId('code-scroll-container')).toBeInTheDocument();
    });
  });

  describe('Multiple languages', () => {
    it.each(['javascript', 'typescript', 'python', 'json', 'bash'])(
      'renders without error for language "%s"',
      (lang) => {
        expect(() =>
          render(<CodeDisplay code={SAMPLE_CODE} language={lang} />)
        ).not.toThrow();
      }
    );
  });
});
