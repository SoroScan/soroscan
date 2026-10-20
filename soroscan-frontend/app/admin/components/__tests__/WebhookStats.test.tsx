import React from "react"
import { render, screen } from "@testing-library/react"
import { WebhookStats } from "../WebhookStats"

describe("WebhookStats", () => {
  it("renders webhook health overview, success rate, and latency", () => {
    const { container } = render(
      <WebhookStats
        successRate={98.4}
        avgTime={142}
      />
    )

    expect(screen.getByText("[WEBHOOK_HEALTH]")).toBeInTheDocument()
    expect(screen.getByText("98%")).toBeInTheDocument()
    expect(screen.getByText("Success")).toBeInTheDocument()
    expect(screen.getByText("DELIVERY_RATE")).toBeInTheDocument()

    expect(screen.getByText("AVG_LATENCY")).toBeInTheDocument()
    expect(screen.getByText("142 ms")).toBeInTheDocument()

    expect(screen.getByText(/System Status:/i)).toBeInTheDocument()
    expect(screen.getByText("[OPERATIONAL]")).toBeInTheDocument()
    expect(screen.getByText(/Retries Last 24h:/i)).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()

    // Gauge circle should have text-terminal-green (> 90)
    const gaugeSvg = container.querySelector("svg.-rotate-90")
    const circles = gaugeSvg?.querySelectorAll("circle") ?? []
    expect(circles.length).toBe(2)
    const gaugeCircle = circles[1]
    expect(gaugeCircle.getAttribute("class")).toContain("text-terminal-green")
  })

  it("applies warning color when success rate is between 71% and 90%", () => {
    const { container } = render(
      <WebhookStats
        successRate={85}
        avgTime={320}
      />
    )

    expect(screen.getByText("85%")).toBeInTheDocument()
    const gaugeSvg = container.querySelector("svg.-rotate-90")
    const circles = gaugeSvg?.querySelectorAll("circle") ?? []
    const gaugeCircle = circles[1]
    expect(gaugeCircle.getAttribute("class")).toContain("text-terminal-warning")
  })

  it("applies danger color when success rate is 70% or below", () => {
    const { container } = render(
      <WebhookStats
        successRate={65}
        avgTime={850}
      />
    )

    expect(screen.getByText("65%")).toBeInTheDocument()
    const gaugeSvg = container.querySelector("svg.-rotate-90")
    const circles = gaugeSvg?.querySelectorAll("circle") ?? []
    const gaugeCircle = circles[1]
    expect(gaugeCircle.getAttribute("class")).toContain("text-terminal-danger")
  })

  it("handles zero values and edge boundaries properly", () => {
    const { container } = render(
      <WebhookStats
        successRate={0}
        avgTime={0}
      />
    )

    expect(screen.getByText("0%")).toBeInTheDocument()
    expect(screen.getByText("0 ms")).toBeInTheDocument()

    const gaugeSvg = container.querySelector("svg.-rotate-90")
    const circles = gaugeSvg?.querySelectorAll("circle") ?? []
    const gaugeCircle = circles[1]
    expect(gaugeCircle.getAttribute("class")).toContain("text-terminal-danger")
  })

  it("renders loading placeholders when loading is true", () => {
    render(
      <WebhookStats
        successRate={99}
        avgTime={120}
        loading={true}
      />
    )

    expect(screen.getByText("[WEBHOOK_HEALTH]")).toBeInTheDocument()
    expect(screen.getByText("--%")).toBeInTheDocument()
    expect(screen.getByText("--- ms")).toBeInTheDocument()
    expect(screen.queryByText("99%")).not.toBeInTheDocument()
    expect(screen.queryByText("120 ms")).not.toBeInTheDocument()
  })
})
