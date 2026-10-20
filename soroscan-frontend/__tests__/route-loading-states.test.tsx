import React from "react"
import { render, screen } from "@testing-library/react"
import AdminLoading from "@/app/admin/loading"
import LiveStreamLoading from "@/app/live/loading"
import ReportsLoading from "@/app/reports/loading"
import AlertsLoading from "@/app/alerts/loading"

describe("Route-level Loading States (Issue #1708)", () => {
  describe("AdminLoading (/admin)", () => {
    it("renders admin loading skeleton with accessible status and IA layout", () => {
      const { container } = render(<AdminLoading />)

      const status = screen.getByRole("status")
      expect(status).toHaveAttribute("aria-busy", "true")
      expect(status).toHaveAttribute("aria-label", "Loading Admin Dashboard")
      expect(screen.getByText("Loading Admin Dashboard")).toHaveClass("sr-only")

      // Admin layout components
      expect(screen.getByTestId("admin-dashboard-layout")).toBeInTheDocument()
      expect(screen.getByTestId("admin-metrics")).toBeInTheDocument()
      expect(screen.getByTestId("admin-charts-row")).toBeInTheDocument()
      expect(screen.getByTestId("admin-logs-row")).toBeInTheDocument()

      // Skeleton elements exist
      const skeletons = container.querySelectorAll("[data-slot*='skeleton']")
      expect(skeletons.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe("LiveStreamLoading (/live)", () => {
    it("renders live stream loading skeleton matching console layout", () => {
      const { container } = render(<LiveStreamLoading />)

      const status = screen.getByRole("status")
      expect(status).toHaveAttribute("aria-busy", "true")
      expect(status).toHaveAttribute("aria-label", "Loading Live Stream")
      expect(screen.getByText("Loading Live Stream")).toHaveClass("sr-only")

      const skeletons = container.querySelectorAll("[data-slot*='skeleton']")
      expect(skeletons.length).toBeGreaterThanOrEqual(8)
    })
  })

  describe("ReportsLoading (/reports)", () => {
    it("renders reports loading skeleton matching query-builder layout", () => {
      const { container } = render(<ReportsLoading />)

      const status = screen.getByRole("status")
      expect(status).toHaveAttribute("aria-busy", "true")
      expect(status).toHaveAttribute("aria-label", "Loading Reports")
      expect(screen.getByText("Loading Reports")).toHaveClass("sr-only")

      // Table skeleton exists
      const tableSkeleton = container.querySelector("[data-slot='skeleton-table']")
      expect(tableSkeleton).toBeInTheDocument()

      const skeletons = container.querySelectorAll("[data-slot*='skeleton']")
      expect(skeletons.length).toBeGreaterThanOrEqual(8)
    })
  })

  describe("AlertsLoading (/alerts)", () => {
    it("renders alerts loading skeleton matching rule designer layout", () => {
      const { container } = render(<AlertsLoading />)

      const status = screen.getByRole("status")
      expect(status).toHaveAttribute("aria-busy", "true")
      expect(status).toHaveAttribute("aria-label", "Loading Alerts")
      expect(screen.getByText("Loading Alerts")).toHaveClass("sr-only")

      // Table skeleton exists
      const tableSkeleton = container.querySelector("[data-slot='skeleton-table']")
      expect(tableSkeleton).toBeInTheDocument()

      const skeletons = container.querySelectorAll("[data-slot*='skeleton']")
      expect(skeletons.length).toBeGreaterThanOrEqual(8)
    })
  })
})
