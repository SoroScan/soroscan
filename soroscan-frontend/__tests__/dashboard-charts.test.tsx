import { render, screen } from "@testing-library/react"
import {
  BarChart,
  HeatmapChart,
  LineChart,
  PieChart,
} from "@/app/dashboard/components/Charts"

describe("dashboard charts", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders a line point for a single data point", () => {
    const { container } = render(
      <LineChart data={[{ label: "Only", value: 8 }]} title="Single point" />,
    )

    expect(screen.getByText("Single point")).toBeInTheDocument()
    expect(container.querySelectorAll("circle")).toHaveLength(1)
    expect(container.querySelector("circle")).toHaveAttribute("cx", "40")
    expect(container.querySelector("circle")).toHaveAttribute("cy", "10")
  })

  it("scales line points and applies a custom height", () => {
    const { container } = render(
      <LineChart
        data={[
          { label: "Low", value: 2 },
          { label: "Mid", value: 4 },
          { label: "High", value: 6 },
        ]}
        title="Event volume"
        height={240}
      />,
    )

    const svg = container.querySelector("svg")
    expect(svg).toHaveAttribute("height", "240")
    expect(svg).toHaveAttribute("viewBox", "0 0 600 240")
    expect(Array.from(container.querySelectorAll("circle")).map((point) => point.getAttribute("cy"))).toEqual([
      "130",
      "70",
      "10",
    ])
    expect(container.querySelector("path")).toHaveAttribute(
      "d",
      "M 40 130 L 300 70 L 560 10",
    )
  })

  it("renders bar labels and scales very large values to a custom height", () => {
    const { container } = render(
      <BarChart
        data={[
          { label: "One", value: 1_000_000_000_000 },
          { label: "Two", value: 2_000_000_000_000 },
        ]}
        title="Large event counts"
        height={180}
      />,
    )

    expect(screen.getByText("Large event counts")).toBeInTheDocument()
    expect(screen.getByText("One")).toBeInTheDocument()
    expect(screen.getByText("Two")).toBeInTheDocument()
    expect(container.querySelectorAll("rect")).toHaveLength(2)
    expect(Array.from(container.querySelectorAll("rect")).map((bar) => bar.getAttribute("height"))).toEqual([
      "60",
      "120",
    ])
    expect(container.querySelector("svg")).toHaveAttribute("height", "180")
  })

  it("renders pie slices whose displayed proportions add up to 100 percent", () => {
    const { container } = render(
      <PieChart
        data={[
          { label: "Transfers", value: 1 },
          { label: "Swaps", value: 3 },
        ]}
        title="Event types"
      />,
    )

    expect(screen.getByText("Event types")).toBeInTheDocument()
    expect(container.querySelectorAll("path")).toHaveLength(2)
    expect(screen.getByText("Transfers:")).toBeInTheDocument()
    expect(screen.getByText("Swaps:")).toBeInTheDocument()

    const percentages = Array.from(container.querySelectorAll(".font-bold")).map((element) =>
      Number.parseFloat(element.textContent ?? ""),
    )
    expect(percentages).toEqual([25, 75])
    expect(percentages.reduce((sum, percentage) => sum + percentage, 0)).toBe(100)
  })

  it("renders heatmap cells with increasing colour intensity", () => {
    const { container } = render(
      <HeatmapChart data={[[1, 4, 9], [9, 4, 1]]} title="Activity heatmap" />,
    )

    expect(screen.getByText("Activity heatmap")).toBeInTheDocument()
    expect(container.querySelectorAll("rect")).toHaveLength(6)
    expect(Array.from(container.querySelectorAll("rect")).map((cell) => cell.getAttribute("fill"))).toEqual([
      "#001a00",
      "#00aa00",
      "#00ff00",
      "#00ff00",
      "#00aa00",
      "#001a00",
    ])
  })

  it("returns no chart markup when each chart has empty data", () => {
    const line = render(<LineChart data={[]} title="Empty line" />)
    expect(line.container).toBeEmptyDOMElement()
    line.unmount()

    const bar = render(<BarChart data={[]} title="Empty bar" />)
    expect(bar.container).toBeEmptyDOMElement()
    bar.unmount()

    const pie = render(<PieChart data={[]} title="Empty pie" />)
    expect(pie.container).toBeEmptyDOMElement()
    pie.unmount()

    const heatmap = render(<HeatmapChart data={[]} title="Empty heatmap" />)
    expect(heatmap.container).toBeEmptyDOMElement()
  })

  it("documents non-finite geometry for all-zero chart values", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})

    const line = render(<LineChart data={[{ label: "Zero", value: 0 }]} title="Zero line" />)
    expect(line.container.querySelector("circle")).toHaveAttribute("cy", "NaN")
    line.unmount()

    const bar = render(<BarChart data={[{ label: "Zero", value: 0 }]} title="Zero bar" />)
    expect(bar.container.querySelector("rect")).toHaveAttribute("y", "NaN")
    expect(bar.container.querySelector("rect")).toHaveAttribute("height", "NaN")
    bar.unmount()

    const pie = render(<PieChart data={[{ label: "Zero", value: 0 }]} title="Zero pie" />)
    expect(pie.container.querySelector("path")?.getAttribute("d")).toContain("NaN")
    expect(screen.getByText("NaN%")).toBeInTheDocument()
    pie.unmount()

    const heatmap = render(<HeatmapChart data={[[0]]} title="Zero heatmap" />)
    expect(heatmap.container.querySelector("rect")).toHaveAttribute("fill", "#00ff00")

    expect(consoleError).toHaveBeenCalledTimes(3)
    expect(consoleError.mock.calls.map((call) => call[1])).toEqual(["cy", "y", "height"])
  })
})
