import React from "react"
import { render, screen } from "@testing-library/react"
import { Activity, DollarSign } from "lucide-react"
import { StatCard } from "./stat-card"

describe("StatCard Component", () => {
  it("renders title and value with default styling", () => {
    render(
      <StatCard
        title="Total Ingested Events"
        value={128450}
      />
    )

    expect(screen.getByText("Total Ingested Events")).toBeInTheDocument()
    expect(screen.getByText("128450")).toBeInTheDocument()
    expect(screen.queryByText("vs last month")).not.toBeInTheDocument()
  })

  it("renders positive trend with TrendingUp icon and green styling", () => {
    const { container } = render(
      <StatCard
        title="Active Contracts"
        value="520"
        trendValue={14.8}
      />
    )

    expect(screen.getByText("Active Contracts")).toBeInTheDocument()
    expect(screen.getByText("520")).toBeInTheDocument()
    expect(screen.getByText("14.8%")).toBeInTheDocument()
    expect(screen.getByText("vs last month")).toBeInTheDocument()

    // Green text and TrendingUp icon
    const trendText = screen.getByText("14.8%")
    expect(trendText.className).toContain("text-green-600")

    const trendUpIcon = container.querySelector("svg.text-green-500")
    expect(trendUpIcon).toBeInTheDocument()
    expect(container.querySelector("svg.text-red-500")).toBeNull()
    expect(container.querySelector("svg.text-slate-500")).toBeNull()
  })

  it("renders negative trend with TrendingDown icon, absolute percentage, and red styling", () => {
    const { container } = render(
      <StatCard
        title="Failed Ingestions"
        value="12"
        trendValue={-5.2}
      />
    )

    expect(screen.getByText("Failed Ingestions")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
    // Displays absolute value: |-5.2| -> 5.2%
    expect(screen.getByText("5.2%")).toBeInTheDocument()
    expect(screen.getByText("vs last month")).toBeInTheDocument()

    const trendText = screen.getByText("5.2%")
    expect(trendText.className).toContain("text-red-600")

    const trendDownIcon = container.querySelector("svg.text-red-500")
    expect(trendDownIcon).toBeInTheDocument()
    expect(container.querySelector("svg.text-green-500")).toBeNull()
  })

  it("renders neutral/flat trend with Minus icon when trendValue is 0", () => {
    const { container } = render(
      <StatCard
        title="Indexed Ledgers"
        value="4,821"
        trendValue={0}
      />
    )

    expect(screen.getByText("0%")).toBeInTheDocument()
    expect(screen.getByText("vs last month")).toBeInTheDocument()

    const trendText = screen.getByText("0%")
    expect(trendText.className).toContain("text-slate-600")

    const minusIcon = container.querySelector("svg.text-slate-500")
    expect(minusIcon).toBeInTheDocument()
    expect(container.querySelector("svg.text-green-500")).toBeNull()
    expect(container.querySelector("svg.text-red-500")).toBeNull()
  })

  it("renders icon in styled container when icon prop is provided", () => {
    render(
      <StatCard
        title="Revenue"
        value="$35,000"
        icon={<DollarSign data-testid="dollar-icon" />}
      />
    )

    const icon = screen.getByTestId("dollar-icon")
    expect(icon).toBeInTheDocument()
    expect(icon.parentElement?.className).toContain("rounded-full")
    expect(icon.parentElement?.className).toContain("bg-slate-100")
  })

  it("omits icon container when icon prop is not provided", () => {
    const { container } = render(
      <StatCard
        title="No Icon Metric"
        value={100}
      />
    )

    expect(container.querySelector(".rounded-full.bg-slate-100")).toBeNull()
  })

  it("renders loading skeleton and suppresses content when isLoading is true", () => {
    const { container } = render(
      <StatCard
        title="Pending Stats"
        value="9,999"
        trendValue={20}
        icon={<Activity data-testid="activity-icon" />}
        isLoading={true}
      />
    )

    // Skeleton pulse container should be present
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument()

    // Title, value, trend and icon must not be rendered in loading state
    expect(screen.queryByText("Pending Stats")).not.toBeInTheDocument()
    expect(screen.queryByText("9,999")).not.toBeInTheDocument()
    expect(screen.queryByText("vs last month")).not.toBeInTheDocument()
    expect(screen.queryByTestId("activity-icon")).not.toBeInTheDocument()
  })

  it("handles zero value without hiding or falling back", () => {
    render(
      <StatCard
        title="Error Count"
        value={0}
      />
    )

    expect(screen.getByText("Error Count")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("applies custom className to the Card container", () => {
    const { container } = render(
      <StatCard
        title="Styled Card"
        value="Custom"
        className="custom-stat-card-class"
      />
    )

    expect(container.firstChild).toHaveClass("custom-stat-card-class")
  })
})
