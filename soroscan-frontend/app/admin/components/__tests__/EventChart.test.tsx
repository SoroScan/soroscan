import React from "react"
import { render, screen } from "@testing-library/react"
import { EventChart } from "../EventChart"

describe("EventChart", () => {
  const sampleData = [
    { label: "1h ago", value: 50 },
    { label: "2h ago", value: 200 },
    { label: "3h ago", value: 100 },
  ]

  it("renders title formatted with brackets and chart subtitle", () => {
    render(
      <EventChart
        title="Ingestion Timeline"
        data={sampleData}
      />
    )

    expect(screen.getByText("[Ingestion Timeline]")).toBeInTheDocument()
    expect(screen.getByText("Events/Hour")).toBeInTheDocument()
  })

  it("renders bars with proportional heights and labels", () => {
    const { container } = render(
      <EventChart
        title="Event Volume"
        data={sampleData}
      />
    )

    // Verify all labels are rendered
    expect(screen.getByText("1h ago")).toBeInTheDocument()
    expect(screen.getByText("2h ago")).toBeInTheDocument()
    expect(screen.getByText("3h ago")).toBeInTheDocument()

    // Verify all values are rendered inside hover badges
    expect(screen.getByText("50")).toBeInTheDocument()
    expect(screen.getByText("200")).toBeInTheDocument()
    expect(screen.getByText("100")).toBeInTheDocument()

    // Peak value is 200, so:
    // 200 -> 100% height
    // 100 -> 50% height
    // 50  -> 25% height
    const bars = container.querySelectorAll(".border-t.border-terminal-green")
    expect(bars.length).toBe(3)
    expect((bars[0] as HTMLElement).style.height).toBe("25%")
    expect((bars[1] as HTMLElement).style.height).toBe("100%")
    expect((bars[2] as HTMLElement).style.height).toBe("50%")
  })

  it("handles empty data array without throwing or crashing", () => {
    const { container } = render(
      <EventChart
        title="Empty Pipeline"
        data={[]}
      />
    )

    expect(screen.getByText("[Empty Pipeline]")).toBeInTheDocument()
    expect(screen.getByText("Events/Hour")).toBeInTheDocument()

    // No bars should be rendered
    const bars = container.querySelectorAll(".border-t.border-terminal-green")
    expect(bars.length).toBe(0)
  })

  it("handles all-zero data points gracefully", () => {
    const zeroData = [
      { label: "10:00", value: 0 },
      { label: "11:00", value: 0 },
    ]

    const { container } = render(
      <EventChart
        title="Idle Periods"
        data={zeroData}
      />
    )

    expect(screen.getByText("10:00")).toBeInTheDocument()
    expect(screen.getByText("11:00")).toBeInTheDocument()

    const zeroValues = screen.getAllByText("0")
    expect(zeroValues.length).toBe(2)

    // With maxVal falling back to 1, height should be 0%
    const bars = container.querySelectorAll(".border-t.border-terminal-green")
    expect(bars.length).toBe(2)
    expect((bars[0] as HTMLElement).style.height).toBe("0%")
    expect((bars[1] as HTMLElement).style.height).toBe("0%")
  })

  it("renders LOADING_DATA... indicator when loading is true", () => {
    render(
      <EventChart
        title="Loading Feed"
        data={sampleData}
        loading={true}
      />
    )

    expect(screen.getByText("[Loading Feed]")).toBeInTheDocument()
    expect(screen.getByText("LOADING_DATA...")).toBeInTheDocument()

    // Data points should not be visible in loading state
    expect(screen.queryByText("1h ago")).not.toBeInTheDocument()
    expect(screen.queryByText("200")).not.toBeInTheDocument()
  })
})
