import React from "react"
import { render, screen } from "@testing-library/react"
import { Activity, HardDrive, ShieldAlert } from "lucide-react"
import { MetricsCard } from "../MetricsCard"

describe("MetricsCard", () => {
  it("renders title, value, and icon with default green variant", () => {
    render(
      <MetricsCard
        title="Total Events"
        value={15420}
        icon={Activity}
      />
    )

    const card = screen.getByTestId("metrics-card")
    expect(card).toBeInTheDocument()
    expect(screen.getByText("[Total Events]")).toBeInTheDocument()
    expect(screen.getByText("15420")).toBeInTheDocument()
    expect(card.className).toContain("text-terminal-green")
    expect(card.className).toContain("bg-terminal-green/5")
  })

  it("renders subValue when provided", () => {
    render(
      <MetricsCard
        title="Webhook Health"
        value="99.4%"
        subValue="Last 24h Success Rate"
        icon={Activity}
      />
    )

    expect(screen.getByText("[Webhook Health]")).toBeInTheDocument()
    expect(screen.getByText("99.4%")).toBeInTheDocument()
    expect(screen.getByText("Last 24h Success Rate")).toBeInTheDocument()
  })

  it("does not render subValue container when subValue is omitted", () => {
    const { container } = render(
      <MetricsCard
        title="Active Contracts"
        value={42}
        icon={HardDrive}
      />
    )

    expect(screen.getByText("[Active Contracts]")).toBeInTheDocument()
    expect(container.querySelector(".text-terminal-gray.mt-1")).toBeNull()
  })

  it("renders placeholder '---' and pulses icon when loading is true", () => {
    const { container } = render(
      <MetricsCard
        title="Ingestion Rate"
        value={800}
        icon={Activity}
        loading={true}
      />
    )

    expect(screen.getByText("[Ingestion Rate]")).toBeInTheDocument()
    expect(screen.getByText("---")).toBeInTheDocument()
    expect(screen.queryByText("800")).not.toBeInTheDocument()

    // Lucide icon should have animate-pulse
    const iconSvg = container.querySelector("svg")
    expect(iconSvg).not.toBeNull()
    expect(iconSvg?.getAttribute("class")).toContain("animate-pulse")
  })

  it("handles empty / zero values accurately without hiding", () => {
    render(
      <MetricsCard
        title="Pending Errors"
        value={0}
        subValue="Zero pending alerts"
        icon={ShieldAlert}
      />
    )

    expect(screen.getByText("[Pending Errors]")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.getByText("Zero pending alerts")).toBeInTheDocument()
  })

  it.each([
    ["green", "text-terminal-green", "bg-terminal-green/5"],
    ["cyan", "text-terminal-cyan", "bg-terminal-cyan/5"],
    ["danger", "text-terminal-danger", "bg-terminal-danger/5"],
    ["warning", "text-terminal-warning", "bg-terminal-warning/5"],
    ["gray", "text-terminal-gray", "bg-terminal-gray/5"],
  ] as const)("applies expected styles for color variant '%s'", (color, textClass, bgClass) => {
    render(
      <MetricsCard
        title={`${color} card`}
        value={100}
        icon={Activity}
        color={color}
      />
    )

    const card = screen.getByTestId("metrics-card")
    expect(card.className).toContain(textClass)
    expect(card.className).toContain(bgClass)
  })
})
