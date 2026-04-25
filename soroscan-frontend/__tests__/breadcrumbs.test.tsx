import React from "react"
import { render, screen } from "@testing-library/react"
import { Breadcrumbs } from "@/components/ui/breadcrumbs"

// Mock next/navigation
const mockUsePathname = jest.fn()
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}))

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      home: "Home",
      dashboard: "Dashboard",
      contracts: "Contracts",
      events: "Events",
    }
    return messages[key] || key
  },
}))

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  )
  MockLink.displayName = "MockLink"
  return MockLink
})

describe("Breadcrumbs", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders Home breadcrumb for root path", () => {
    mockUsePathname.mockReturnValue("/en")
    render(<Breadcrumbs />)
    
    expect(screen.getByText("Home")).toBeInTheDocument()
    // Current page is not a link
    const homeText = screen.getByText("Home")
    expect(homeText.tagName).not.toBe("A")
  })

  it("renders breadcrumbs for nested paths", () => {
    mockUsePathname.mockReturnValue("/en/dashboard/contracts")
    render(<Breadcrumbs />)
    
    // Check Home link
    const homeLink = screen.getByRole("link", { name: "Home" })
    expect(homeLink).toHaveAttribute("href", "/en")
    
    // Check Dashboard link
    const dashboardLink = screen.getByRole("link", { name: "Dashboard" })
    expect(dashboardLink).toHaveAttribute("href", "/en/dashboard")
    
    // Check Contracts text (current page)
    const contractsText = screen.getByText("Contracts")
    expect(contractsText).toBeInTheDocument()
    expect(contractsText.tagName).not.toBe("A")
  })

  it("handles dynamic segments by capitalizing them", () => {
    mockUsePathname.mockReturnValue("/en/dashboard/contracts/some-contract")
    render(<Breadcrumbs />)
    
    expect(screen.getByText("Some-contract")).toBeInTheDocument()
  })

  it("shortens long segments", () => {
    const longId = "CAS3J7H2Z7W7V7X7Y7Z7W7V7X7Y7Z7W7V7X7Y7Z7W7V7X7Y"
    mockUsePathname.mockReturnValue(`/en/dashboard/contracts/${longId}`)
    render(<Breadcrumbs />)
    
    // Matches the shortened version: CAS3J7...7Y
    expect(screen.getByText("CAS3J7...7Y")).toBeInTheDocument()
  })

  it("renders separators between items", () => {
    mockUsePathname.mockReturnValue("/en/dashboard")
    render(<Breadcrumbs />)
    
    const listItems = screen.getAllByRole("listitem")
    expect(listItems).toHaveLength(2) // Home, Dashboard
    
    // The second list item should contain a separator (ChevronRight)
    // We can't easily check for the SVG but we can check the presence of the separator logic
    // In our implementation, index > 0 shows the ChevronRight
  })

  it("handles paths without locale", () => {
    mockUsePathname.mockReturnValue("/dashboard/events")
    render(<Breadcrumbs />)
    
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard")
    expect(screen.getByText("Events")).toBeInTheDocument()
  })
})
