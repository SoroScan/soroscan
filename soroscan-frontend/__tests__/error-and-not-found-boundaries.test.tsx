import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import NotFound from "@/app/not-found"
import ErrorBoundary from "@/app/error"
import GlobalError from "@/app/global-error"

// Mock next/link to render an <a> tag
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

describe("Error and Not-Found Boundaries (Issue #1707)", () => {
  describe("NotFound (/not-found)", () => {
    it("renders custom 404 terminal UI with navigation actions", () => {
      render(<NotFound />)

      expect(screen.getByTestId("not-found-page")).toBeInTheDocument()
      expect(screen.getByText("Ledger Entry Not Found")).toBeInTheDocument()
      expect(screen.getByText(/STATUS_404: RESOURCE_NOT_FOUND/i)).toBeInTheDocument()
      expect(screen.getByText(/ERR_HTTP_404_NOT_FOUND/i)).toBeInTheDocument()

      // Navigation links
      const homeLink = screen.getByRole("link", { name: /RETURN_TO_HOME/i })
      expect(homeLink).toHaveAttribute("href", "/")

      const exploreLink = screen.getByRole("link", { name: /EXPLORE_EVENTS/i })
      expect(exploreLink).toHaveAttribute("href", "/dashboard")

      const docsLink = screen.getByRole("link", { name: /DOCUMENTATION/i })
      expect(docsLink).toHaveAttribute("href", "/docs")
    })
  })

  describe("ErrorBoundary (/error)", () => {
    const mockReset = jest.fn()
    let mockConsoleError: jest.SpyInstance

    beforeEach(() => {
      jest.clearAllMocks()
      mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
    })

    afterEach(() => {
      mockConsoleError.mockRestore()
    })

    it("renders route-level error boundary with error message and digest", () => {
      const mockError = Object.assign(new Error("RPC node response timeout: failed to fetch ledger 520000"), {
        digest: "sha256_mock_digest_77a2",
      })

      render(<ErrorBoundary error={mockError} reset={mockReset} />)

      const alert = screen.getByRole("alert")
      expect(alert).toBeInTheDocument()
      expect(screen.getByTestId("route-error-page")).toBeInTheDocument()
      expect(screen.getByText("System Operation Failed")).toBeInTheDocument()
      expect(screen.getByText(/RPC node response timeout/i)).toBeInTheDocument()
      expect(screen.getByText(/sha256_mock_digest_77a2/i)).toBeInTheDocument()

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("App Router Error caught by error.tsx boundary"),
        mockError
      )
    })

    it("triggers reset callback when clicking RETRY_OPERATION", () => {
      const mockError = new Error("Temporary network glitch")

      render(<ErrorBoundary error={mockError} reset={mockReset} />)

      const retryBtn = screen.getByTestId("error-reset-button")
      expect(retryBtn).toBeInTheDocument()
      fireEvent.click(retryBtn)

      expect(mockReset).toHaveBeenCalledTimes(1)
    })
  })

  describe("GlobalError (/global-error)", () => {
    const mockReset = jest.fn()
    let mockConsoleError: jest.SpyInstance

    beforeEach(() => {
      jest.clearAllMocks()
      mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
    })

    afterEach(() => {
      mockConsoleError.mockRestore()
    })

    it("renders global fatal error boundary with root error envelope", () => {
      const fatalError = Object.assign(new Error("Root bootstrap initialization failed"), {
        digest: "fatal_digest_root_001",
      })

      render(<GlobalError error={fatalError} reset={mockReset} />)

      expect(screen.getByTestId("global-error-page")).toBeInTheDocument()
      expect(screen.getByText("Root Pipeline Halted")).toBeInTheDocument()
      expect(screen.getByText(/Root bootstrap initialization failed/i)).toBeInTheDocument()
      expect(screen.getByText(/fatal_digest_root_001/i)).toBeInTheDocument()
    })

    it("triggers reset callback on REBOOT_APPLICATION click", () => {
      const fatalError = new Error("Fatal layout crash")

      render(<GlobalError error={fatalError} reset={mockReset} />)

      const rebootBtn = screen.getByTestId("global-error-reset-button")
      expect(rebootBtn).toBeInTheDocument()
      fireEvent.click(rebootBtn)

      expect(mockReset).toHaveBeenCalledTimes(1)
    })
  })
})
