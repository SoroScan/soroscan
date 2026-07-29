/**
 * ContractTransactionCard — FE-147
 * Unit tests with React Testing Library + Jest
 *
 * Coverage areas:
 *  1.  Renders core fields (txHash, contractId, ledger, timestamp, status)
 *  2.  contractName display vs contractId fallback
 *  3.  Status variants: success / failed / pending
 *  4.  Pending status has animated dot (animate-pulse class)
 *  5.  Truncated hash display
 *  6.  Copy-to-clipboard button — fires onCopyHash callback
 *  7.  Copy button aria-label changes after copy
 *  8.  Interactive card: role="button", tabIndex, aria-label
 *  9.  onViewDetail fires on click
 * 10.  onViewDetail fires on Enter key
 * 11.  onViewDetail fires on Space key
 * 12.  Non-interactive card: no role="button"
 * 13.  Optional fee field rendered / hidden
 * 14.  Optional operationType field rendered / hidden
 * 15.  "View details" footer shown only when interactive
 * 16.  compact variant applied
 * 17.  Custom className forwarded
 * 18.  data-status attribute reflects status prop
 * 19.  data-testid="contract-transaction-card" present
 * 20.  Accessibility: status badge has role="status"
 * 21.  Timestamp rendered as <time> with dateTime attribute
 * 22.  Ledger value is formatted with toLocaleString
 * 23.  Fee in stroops (< 0.001 XLM)
 * 24.  Fee in XLM (≥ 0.001 XLM)
 * 25.  Does not throw when optional props are omitted
 */

import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ContractTransactionCard } from "@/components/ui/ContractTransactionCard";
import type { ContractTransactionCardProps } from "@/components/ui/ContractTransactionCard";

// ─── Clipboard mock ──────────────────────────────────────────────────────────

const mockWriteText = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  configurable: true,
});

// ─── Timers ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  mockWriteText.mockClear();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TX_HASH =
  "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab";

const BASE_PROPS: ContractTransactionCardProps = {
  txHash: TX_HASH,
  contractId: "CCAAA1234567890AAABBBCCC",
  ledger: 1_234_567,
  timestamp: "2026-03-15T12:30:00Z",
  status: "success",
};

function renderCard(props: Partial<ContractTransactionCardProps> = {}) {
  return render(<ContractTransactionCard {...BASE_PROPS} {...props} />);
}

function getCard() {
  return screen.getByTestId("contract-transaction-card");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ContractTransactionCard — FE-147", () => {
  // ── 1. Core rendering ────────────────────────────────────────────────────

  it("renders the card root element", () => {
    renderCard();
    expect(getCard()).toBeInTheDocument();
  });

  it("renders the tx hash (truncated)", () => {
    renderCard();
    const display = screen.getByTestId("tx-hash-display");
    // Full 64-char hash should be truncated; check head is present
    expect(display).toHaveTextContent("abcdef12");
  });

  it("renders the ledger number", () => {
    renderCard();
    expect(screen.getByTestId("ledger-number")).toBeInTheDocument();
  });

  it("renders the timestamp element", () => {
    renderCard();
    expect(screen.getByTestId("tx-timestamp")).toBeInTheDocument();
  });

  it("renders the status badge", () => {
    renderCard();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // ── 2. contractName vs contractId fallback ────────────────────────────

  it("shows contractName as primary label when provided", () => {
    renderCard({ contractName: "My Swap Contract" });
    expect(screen.getByText("My Swap Contract")).toBeInTheDocument();
  });

  it("shows contractId as primary label when contractName is omitted", () => {
    renderCard({ contractId: "CCAAA1234567890AAABBBCCC" });
    expect(screen.getByText("CCAAA1234567890AAABBBCCC")).toBeInTheDocument();
  });

  it("shows truncated contractId below name when contractName is given", () => {
    renderCard({
      contractName: "My Contract",
      contractId: "CCAAA1234567890AAABBBCCC",
    });
    // Name shown
    expect(screen.getByText("My Contract")).toBeInTheDocument();
    // Truncated ID secondary row also visible (multiple elements may have the title)
    const titledEls = screen.getAllByTitle("CCAAA1234567890AAABBBCCC");
    expect(titledEls.length).toBeGreaterThanOrEqual(1);
  });

  // ── 3. Status variants ────────────────────────────────────────────────

  it('renders "Success" label for success status', () => {
    renderCard({ status: "success" });
    expect(screen.getByRole("status")).toHaveTextContent("Success");
  });

  it('renders "Failed" label for failed status', () => {
    renderCard({ status: "failed" });
    expect(screen.getByRole("status")).toHaveTextContent("Failed");
  });

  it('renders "Pending" label for pending status', () => {
    renderCard({ status: "pending" });
    expect(screen.getByRole("status")).toHaveTextContent("Pending");
  });

  // ── 4. Pending dot animation ──────────────────────────────────────────

  it("applies animate-pulse to dot for pending status", () => {
    const { container } = renderCard({ status: "pending" });
    // The dot span inside the status badge should have animate-pulse
    const badge = screen.getByRole("status");
    const dot = badge.querySelector("[aria-hidden='true']");
    expect(dot).toHaveClass("animate-pulse");
  });

  it("does not apply animate-pulse for success status", () => {
    renderCard({ status: "success" });
    const badge = screen.getByRole("status");
    const dot = badge.querySelector("[aria-hidden='true']");
    expect(dot).not.toHaveClass("animate-pulse");
  });

  it("does not apply animate-pulse for failed status", () => {
    renderCard({ status: "failed" });
    const badge = screen.getByRole("status");
    const dot = badge.querySelector("[aria-hidden='true']");
    expect(dot).not.toHaveClass("animate-pulse");
  });

  // ── 5. Truncated hash display ─────────────────────────────────────────

  it("does not render the full 64-char hash in the display span", () => {
    renderCard();
    const display = screen.getByTestId("tx-hash-display");
    // Full hash is 66 chars with the '…' truncation
    expect(display.textContent!.length).toBeLessThan(TX_HASH.length);
  });

  it("tx-hash-display title attribute contains the full hash", () => {
    renderCard();
    expect(screen.getByTestId("tx-hash-display")).toHaveAttribute(
      "title",
      TX_HASH
    );
  });

  // ── 6. Copy button — onCopyHash callback ─────────────────────────────

  it("renders the copy hash button", () => {
    renderCard({ onCopyHash: jest.fn() });
    expect(screen.getByTestId("copy-hash-button")).toBeInTheDocument();
  });

  it("calls onCopyHash with the full tx hash when copy button is clicked", async () => {
    const onCopyHash = jest.fn();
    renderCard({ onCopyHash });
    fireEvent.click(screen.getByTestId("copy-hash-button"));
    await waitFor(() => expect(onCopyHash).toHaveBeenCalledWith(TX_HASH));
  });

  it("copy button is always rendered (even without onCopyHash)", () => {
    renderCard();
    expect(screen.getByTestId("copy-hash-button")).toBeInTheDocument();
  });

  // ── 7. Copy button aria-label updates after copy ─────────────────────

  it('copy button shows "Copied!" aria-label after clicking', async () => {
    renderCard();
    const btn = screen.getByTestId("copy-hash-button");
    fireEvent.click(btn);
    await waitFor(() =>
      expect(btn).toHaveAttribute("aria-label", "Copied!")
    );
  });

  it("copy button aria-label reverts after 1500ms", async () => {
    renderCard();
    const btn = screen.getByTestId("copy-hash-button");
    fireEvent.click(btn);
    await waitFor(() =>
      expect(btn).toHaveAttribute("aria-label", "Copied!")
    );
    act(() => { jest.advanceTimersByTime(1500); });
    expect(btn).not.toHaveAttribute("aria-label", "Copied!");
  });

  // ── 8. Interactive card a11y ──────────────────────────────────────────

  it('has role="button" when onViewDetail is provided', () => {
    renderCard({ onViewDetail: jest.fn() });
    expect(getCard()).toHaveAttribute("role", "button");
  });

  it("has tabIndex=0 when interactive", () => {
    renderCard({ onViewDetail: jest.fn() });
    expect(getCard()).toHaveAttribute("tabindex", "0");
  });

  it("has aria-label when interactive", () => {
    renderCard({ onViewDetail: jest.fn() });
    const label = getCard().getAttribute("aria-label");
    expect(label).toBeTruthy();
    // Should mention the status and include "View details" or "Press Enter"
    expect(label).toMatch(/Press Enter/i);
  });

  // ── 9. Click fires onViewDetail ────────────────────────────────────────

  it("calls onViewDetail when card is clicked", () => {
    const onViewDetail = jest.fn();
    renderCard({ onViewDetail });
    fireEvent.click(getCard());
    expect(onViewDetail).toHaveBeenCalledTimes(1);
  });

  // ── 10. Enter key fires onViewDetail ──────────────────────────────────

  it("calls onViewDetail when Enter is pressed on the card", () => {
    const onViewDetail = jest.fn();
    renderCard({ onViewDetail });
    fireEvent.keyDown(getCard(), { key: "Enter" });
    expect(onViewDetail).toHaveBeenCalledTimes(1);
  });

  // ── 11. Space key fires onViewDetail ──────────────────────────────────

  it("calls onViewDetail when Space is pressed on the card", () => {
    const onViewDetail = jest.fn();
    renderCard({ onViewDetail });
    fireEvent.keyDown(getCard(), { key: " " });
    expect(onViewDetail).toHaveBeenCalledTimes(1);
  });

  // ── 12. Non-interactive card ───────────────────────────────────────────

  it("has no role when onViewDetail is not provided", () => {
    renderCard();
    expect(getCard()).not.toHaveAttribute("role");
  });

  it("has no tabIndex when not interactive", () => {
    renderCard();
    expect(getCard()).not.toHaveAttribute("tabindex");
  });

  it("does not throw when clicked without onViewDetail", () => {
    renderCard();
    expect(() => fireEvent.click(getCard())).not.toThrow();
  });

  // ── 13. Optional fee field ────────────────────────────────────────────

  it("renders fee when provided", () => {
    renderCard({ fee: 100 });
    expect(screen.getByTestId("tx-fee")).toBeInTheDocument();
  });

  it("does not render fee section when fee is omitted", () => {
    renderCard();
    expect(screen.queryByTestId("tx-fee")).not.toBeInTheDocument();
  });

  // ── 14. Optional operationType field ─────────────────────────────────

  it("renders operationType when provided", () => {
    renderCard({ operationType: "invoke_contract" });
    expect(screen.getByTestId("operation-type")).toHaveTextContent(
      "invoke_contract"
    );
  });

  it("does not render operationType section when omitted", () => {
    renderCard();
    expect(screen.queryByTestId("operation-type")).not.toBeInTheDocument();
  });

  // ── 15. "View details" footer ─────────────────────────────────────────

  it("shows the view-details footer when onViewDetail is provided", () => {
    renderCard({ onViewDetail: jest.fn() });
    expect(screen.getByText(/View details/i)).toBeInTheDocument();
  });

  it("hides the view-details footer when not interactive", () => {
    renderCard();
    expect(screen.queryByText(/View details/i)).not.toBeInTheDocument();
  });

  // ── 16. Compact variant ────────────────────────────────────────────────

  it("applies compact variant class", () => {
    renderCard({ variant: "compact" });
    // compact adds p-3 on mobile
    expect(getCard()).toHaveClass("p-3");
  });

  it("default variant applies p-4", () => {
    renderCard({ variant: "default" });
    expect(getCard()).toHaveClass("p-4");
  });

  // ── 17. Custom className ──────────────────────────────────────────────

  it("forwards custom className to the root element", () => {
    renderCard({ className: "my-custom-class extra" });
    expect(getCard()).toHaveClass("my-custom-class", "extra");
  });

  // ── 18. data-status attribute ─────────────────────────────────────────

  it('sets data-status="success" for success status', () => {
    renderCard({ status: "success" });
    expect(getCard()).toHaveAttribute("data-status", "success");
  });

  it('sets data-status="failed" for failed status', () => {
    renderCard({ status: "failed" });
    expect(getCard()).toHaveAttribute("data-status", "failed");
  });

  it('sets data-status="pending" for pending status', () => {
    renderCard({ status: "pending" });
    expect(getCard()).toHaveAttribute("data-status", "pending");
  });

  // ── 19. data-testid ───────────────────────────────────────────────────

  it('has data-testid="contract-transaction-card"', () => {
    renderCard();
    expect(
      screen.getByTestId("contract-transaction-card")
    ).toBeInTheDocument();
  });

  // ── 20. Status badge accessibility ────────────────────────────────────

  it('status badge has role="status"', () => {
    renderCard();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("status badge has descriptive aria-label", () => {
    renderCard({ status: "success" });
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Transaction status: Success"
    );
  });

  // ── 21. Timestamp <time> element ──────────────────────────────────────

  it("renders timestamp as a <time> element", () => {
    const { container } = renderCard();
    expect(container.querySelector("time")).toBeInTheDocument();
  });

  it("time element has correct dateTime attribute", () => {
    const { container } = renderCard({ timestamp: "2026-03-15T12:30:00Z" });
    expect(container.querySelector("time")).toHaveAttribute(
      "dateTime",
      "2026-03-15T12:30:00Z"
    );
  });

  // ── 22. Ledger formatting ─────────────────────────────────────────────

  it("formats large ledger numbers with locale separators", () => {
    renderCard({ ledger: 1_234_567 });
    // toLocaleString on 1234567 → "1,234,567" in en-US
    expect(screen.getByTestId("ledger-number").textContent).toMatch(/1.234.567/);
  });

  // ── 23. Fee in stroops (small amount) ────────────────────────────────

  it("displays fee in stroops when value is less than 0.001 XLM (< 10000 stroops)", () => {
    renderCard({ fee: 100 });
    expect(screen.getByTestId("tx-fee")).toHaveTextContent("100 stroops");
  });

  // ── 24. Fee in XLM (large amount) ────────────────────────────────────

  it("displays fee in XLM when value is >= 10000 stroops", () => {
    renderCard({ fee: 100_000 });
    // 100000 / 10000000 = 0.01 XLM
    expect(screen.getByTestId("tx-fee")).toHaveTextContent("XLM");
  });

  // ── 25. No crash without optional props ──────────────────────────────

  it("renders without optional props without throwing", () => {
    expect(() =>
      render(
        <ContractTransactionCard
          txHash={TX_HASH}
          contractId="CCAAA1"
          ledger={1}
          timestamp="2026-01-01T00:00:00Z"
          status="success"
        />
      )
    ).not.toThrow();
  });
});
