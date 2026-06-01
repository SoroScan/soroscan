/**
 * Tests for RetryIntervalInput component
 *
 * Covers:
 * - Renders with current retryInterval value
 * - Suggestion chips update the value
 * - Range validation (below min, above max, valid)
 * - Save button calls saveRetryInterval
 * - Disabled state when no webhook selected
 * - Success feedback after save
 * - Error message display
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetryIntervalInput } from '../RetryIntervalInput';
import * as contextModule from '../../context';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContextValue(overrides: Partial<ReturnType<typeof contextModule.useWebhookTester>> = {}) {
  return {
    webhooks: [],
    isLoadingWebhooks: false,
    fetchWebhooks: vi.fn(),
    selectedWebhook: {
      id: 1,
      contract_id: 'CABC',
      event_type: 'swap',
      target_url: 'https://example.com/hook',
      is_active: true,
      status: 'active' as const,
      created_at: '2024-01-01T00:00:00Z',
      last_triggered: null,
      failure_count: 0,
      timeout_seconds: 10,
      retry_interval_seconds: 60,
    },
    setSelectedWebhook: vi.fn(),
    payload: '{}',
    setPayload: vi.fn(),
    payloadError: null,
    isSending: false,
    sendTest: vi.fn(),
    response: null,
    sendError: null,
    history: [],
    clearHistory: vi.fn(),
    selectHistoryEntry: vi.fn(),
    retryInterval: 60,
    setRetryInterval: vi.fn(),
    retryIntervalError: null,
    isSavingRetryInterval: false,
    saveRetryInterval: vi.fn(),
    retrySaveSuccess: false,
    ...overrides,
  };
}

function renderWithContext(overrides: Partial<ReturnType<typeof contextModule.useWebhookTester>> = {}) {
  vi.spyOn(contextModule, 'useWebhookTester').mockReturnValue(makeContextValue(overrides));
  return render(<RetryIntervalInput />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RetryIntervalInput', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- Rendering ---

  it('renders the label', () => {
    renderWithContext();
    expect(screen.getByText(/retry interval/i)).toBeInTheDocument();
  });

  it('renders the numeric input with the current retryInterval value', () => {
    renderWithContext({ retryInterval: 300 });
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(300);
  });

  it('renders all suggestion chips', () => {
    renderWithContext();
    const expectedLabels = ['10s', '30s', '1m', '5m', '15m', '1h'];
    for (const label of expectedLabels) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('renders the Save button', () => {
    renderWithContext();
    expect(screen.getByRole('button', { name: /save retry interval/i })).toBeInTheDocument();
  });

  // --- Suggestion chips ---

  it('calls setRetryInterval with the chip value when a chip is clicked', async () => {
    const setRetryInterval = vi.fn();
    renderWithContext({ setRetryInterval });
    await userEvent.click(screen.getByRole('button', { name: '5m' }));
    expect(setRetryInterval).toHaveBeenCalledWith(300);
  });

  it('marks the active chip with aria-pressed=true', () => {
    renderWithContext({ retryInterval: 60 });
    const activeChip = screen.getByRole('button', { name: '1m' });
    expect(activeChip).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks non-active chips with aria-pressed=false', () => {
    renderWithContext({ retryInterval: 60 });
    const inactiveChip = screen.getByRole('button', { name: '5m' });
    expect(inactiveChip).toHaveAttribute('aria-pressed', 'false');
  });

  // --- Numeric input ---

  it('calls setRetryInterval when the number input changes', async () => {
    const setRetryInterval = vi.fn();
    renderWithContext({ setRetryInterval });
    const input = screen.getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.type(input, '120');
    expect(setRetryInterval).toHaveBeenLastCalledWith(120);
  });

  it('has min=10 and max=3600 attributes on the number input', () => {
    renderWithContext();
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('min', '10');
    expect(input).toHaveAttribute('max', '3600');
  });

  // --- Range validation ---

  it('shows error message when retryIntervalError is set', () => {
    renderWithContext({ retryIntervalError: 'Must be between 10 and 3600 seconds' });
    expect(screen.getByRole('alert')).toHaveTextContent('Must be between 10 and 3600 seconds');
  });

  it('marks the input as aria-invalid when there is an error', () => {
    renderWithContext({ retryIntervalError: 'Must be between 10 and 3600 seconds' });
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not show error when retryIntervalError is null', () => {
    renderWithContext({ retryIntervalError: null });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables Save button when there is a validation error', () => {
    renderWithContext({ retryIntervalError: 'Must be between 10 and 3600 seconds' });
    const saveBtn = screen.getByRole('button', { name: /save retry interval/i });
    expect(saveBtn).toBeDisabled();
  });

  // --- Save behaviour ---

  it('calls saveRetryInterval when Save is clicked', async () => {
    const saveRetryInterval = vi.fn();
    renderWithContext({ saveRetryInterval });
    await userEvent.click(screen.getByRole('button', { name: /save retry interval/i }));
    expect(saveRetryInterval).toHaveBeenCalledOnce();
  });

  it('calls saveRetryInterval when Enter is pressed in the input', async () => {
    const saveRetryInterval = vi.fn();
    renderWithContext({ saveRetryInterval });
    const input = screen.getByRole('spinbutton');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(saveRetryInterval).toHaveBeenCalledOnce();
  });

  it('shows saving spinner while isSavingRetryInterval is true', () => {
    renderWithContext({ isSavingRetryInterval: true });
    expect(screen.getByText(/saving/i)).toBeInTheDocument();
  });

  it('disables inputs while saving', () => {
    renderWithContext({ isSavingRetryInterval: true });
    const input = screen.getByRole('spinbutton');
    expect(input).toBeDisabled();
  });

  // --- Success feedback ---

  it('shows success message when retrySaveSuccess is true', () => {
    renderWithContext({ retrySaveSuccess: true });
    expect(screen.getByRole('status')).toHaveTextContent('✓ saved');
  });

  it('does not show success message when retrySaveSuccess is false', () => {
    renderWithContext({ retrySaveSuccess: false });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  // --- Disabled state (no webhook selected) ---

  it('disables all inputs when no webhook is selected', () => {
    renderWithContext({ selectedWebhook: null });
    const input = screen.getByRole('spinbutton');
    expect(input).toBeDisabled();
    const saveBtn = screen.getByRole('button', { name: /save retry interval/i });
    expect(saveBtn).toBeDisabled();
  });

  it('disables suggestion chips when no webhook is selected', () => {
    renderWithContext({ selectedWebhook: null });
    const chips = screen.getAllByRole('button', { name: /^(10s|30s|1m|5m|15m|1h)$/ });
    for (const chip of chips) {
      expect(chip).toBeDisabled();
    }
  });

  // --- Range slider ---

  it('renders a range slider', () => {
    renderWithContext();
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('slider value is clamped to valid range', () => {
    // Value below min should clamp to 10
    renderWithContext({ retryInterval: 5 });
    const slider = screen.getByRole('slider');
    expect(Number(slider.getAttribute('value'))).toBe(10);
  });
});
