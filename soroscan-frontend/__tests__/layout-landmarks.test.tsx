import React from "react"
import { render, screen } from "@testing-library/react"
import { AppShell } from "@/components/layout/AppShell"
import { SkipToContent } from "@/components/ui/SkipToContent"

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}))

jest.mock("@/components/notifications/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    clearAll: jest.fn(),
    refetch: jest.fn(),
  }),
}))

jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
  MockLink.displayName = "MockLink"
  return MockLink
})

describe("Layout landmarks and skip link deduplication (Issue #1674)", () => {
  it("does not render a duplicate skip link or duplicate main tag inside AppShell", () => {
    const { container } = render(
      <AppShell>
        <div data-testid="dashboard-content">Dashboard Content</div>
      </AppShell>,
    )

    // No duplicate skip link in AppShell
    const skipLinks = container.querySelectorAll('a[href="#main-content"]')
    expect(skipLinks.length).toBe(0)

    // No main landmark in AppShell itself (delegated to root layout)
    const mainLandmarks = container.querySelectorAll("main")
    expect(mainLandmarks.length).toBe(0)

    // No duplicate id="main-content" inside AppShell
    const mainContentElements = container.querySelectorAll("#main-content")
    expect(mainContentElements.length).toBe(0)

    // Content still renders inside the content container
    expect(screen.getByTestId("dashboard-content")).toBeInTheDocument()
  })

  it("renders exactly one skip link and one main landmark when AppShell is inside root layout", () => {
    const { container } = render(
      <div>
        <SkipToContent />
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
          <AppShell>
            <div data-testid="page-child">Inner View</div>
          </AppShell>
        </main>
      </div>,
    )

    // Exactly one skip link
    const skipLinks = container.querySelectorAll('a[href="#main-content"]')
    expect(skipLinks.length).toBe(1)
    expect(skipLinks[0]).toHaveTextContent("Skip to main content")

    // Exactly one main landmark
    const mainLandmarks = screen.getAllByRole("main")
    expect(mainLandmarks.length).toBe(1)
    expect(mainLandmarks[0]).toHaveAttribute("id", "main-content")
    expect(mainLandmarks[0]).toHaveAttribute("tabindex", "-1")

    // Exactly one element with id="main-content"
    const elementsWithId = container.querySelectorAll("#main-content")
    expect(elementsWithId.length).toBe(1)
    expect(elementsWithId[0]).toBe(mainLandmarks[0])
  })
})
