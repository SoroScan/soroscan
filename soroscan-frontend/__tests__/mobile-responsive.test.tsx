/**
 * Mobile-first responsive foundation regression suite.
 *
 * Locks down three concrete pieces of the responsive contract so future
 * refactors can't silently regress a/b acceptance criteria:
 *   1. Every interactive element produced by `<Button/>` has a minimum
 *      tap target of 44px on mobile (WCAG 2.5.5).
 *   2. The Navbar exposes a hamburger toggle that is mobile-only via
 *      `md:hidden` and itself is at least 44px tall.
 *   3. The layout `viewport` export declares a `themeColor` so the
 *      browser chrome matches the terminal-black background.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/terminal/Button";
import { HamburgerToggle } from "@/components/ui/hamburger-toggle";
import { Navbar } from "@/components/terminal/landing/Navbar";
import * as layoutExports from "@/app/layout";

// ── Mocks (keeps the test scope tight) ────────────────────────────────────
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock("@/lib/auth", () => ({
  isLoggedIn: jest.fn(() => false),
  clearTokens: jest.fn(),
  getAccessToken: jest.fn(() => null),
  getRefreshToken: jest.fn(() => null),
  setTokens: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

describe("Mobile-first responsive foundation", () => {
  describe("Button tap target", () => {
    it("enforces a 44px minimum tap target on the default size", () => {
      render(<Button>DEFAULT_BUTTON</Button>);
      const btn = screen.getByRole("button", { name: /DEFAULT_BUTTON/i });
      expect(btn.className).toMatch(/min-h-\[44px\]/);
    });

    it("enforces a 44px minimum tap target on the sm size", () => {
      render(<Button size="sm">SM_BUTTON</Button>);
      const btn = screen.getByRole("button", { name: /SM_BUTTON/i });
      expect(btn.className).toMatch(/min-h-\[44px\]/);
    });

    it("enforces a 44px square on the icon size", () => {
      render(<Button size="icon" aria-label="icon-button" />);
      const btn = screen.getByRole("button", { name: /icon-button/i });
      expect(btn.className).toMatch(/min-h-\[44px\]/);
      expect(btn.className).toMatch(/min-w-\[44px\]/);
    });
  });

  describe("Hamburger toggle (mobile navigation)", () => {
    it("is hidden on md+ via the md:hidden utility", () => {
      render(<HamburgerToggle isOpen={false} onClick={jest.fn()} />);
      const toggle = screen.getByRole("button", { name: /toggle menu/i });
      expect(toggle.className).toMatch(/md:hidden/);
    });

    it("meets the 44px tap target on mobile (no longer just `p-2`)", () => {
      render(<HamburgerToggle isOpen={false} onClick={jest.fn()} />);
      const toggle = screen.getByRole("button", { name: /toggle menu/i });
      // Either the new utility or an explicit min-height class is required.
      expect(toggle.className).toMatch(/touch-target|min-h-\[44px\]/);
    });
  });

  describe("Navbar", () => {
    it("renders the hamburger toggle so users on phones can open nav", () => {
      render(<Navbar />);
      const toggle = screen.getByRole("button", { name: /toggle menu|close menu/i });
      expect(toggle).toBeInTheDocument();
      expect(toggle.className).toMatch(/md:hidden/);
    });
  });

  describe("Layout viewport metadata", () => {
    it("declares a device-width viewport with no iOS auto-zoom", () => {
      expect(layoutExports.viewport).toBeDefined();
      expect(layoutExports.viewport.width).toBe("device-width");
      expect(layoutExports.viewport.maximumScale).toBe(1);
    });

    it("declares the terminal-black theme color for mobile browser chrome", () => {
      expect(layoutExports.viewport.themeColor).toBe("#0a0e27");
    });
  });
});
