import React from "react"
import { render, screen } from "@testing-library/react"

import {
  ProgressBar,
  clampProgress,
  getProgressPercentage,
} from "@/components/ui/progress-bar"

describe("ProgressBar", () => {
  it("clamps progress values to the 0-100 range", () => {
    expect(clampProgress(-25)).toBe(0)
    expect(clampProgress(42.4)).toBe(42)
    expect(clampProgress(120)).toBe(100)
  })

  it("formats percentages for display", () => {
    expect(getProgressPercentage(7)).toBe("7%")
    expect(getProgressPercentage(100)).toBe("100%")
  })

  it("renders the percentage and fill width for a determinate value", () => {
    render(<ProgressBar value={67} label="Upload" />)

    const progressbar = screen.getByRole("progressbar", { name: "Upload" })
    const fill = progressbar.querySelector('[data-slot="progress-fill"]')

    expect(fill).not.toBeNull()
    expect(screen.getByText("Upload")).toBeInTheDocument()
    expect(screen.getByText("67%")).toBeInTheDocument()
    expect(fill).toHaveStyle({ width: "67%" })
  })

  it.each([
    ["success", "bg-terminal-green"],
    ["warning", "bg-terminal-warning"],
    ["danger", "bg-terminal-danger"],
  ])("applies the %s variant color", (variant, expectedClass) => {
    render(<ProgressBar value={50} variant={variant as "success" | "warning" | "danger"} />)

    const fill = screen.getByRole("progressbar").querySelector('[data-slot="progress-fill"]')

    expect(fill).not.toBeNull()
    expect(fill).toHaveClass(expectedClass)
  })

  it("renders the label inside the bar when requested", () => {
    render(<ProgressBar value={80} label="Syncing" labelPosition="inside" />)

    expect(screen.getByText("Syncing")).toBeInTheDocument()
    expect(screen.getByText("80%")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-label-position",
      "inside",
    )
  })

  it("supports an indeterminate state", () => {
    render(<ProgressBar indeterminate label="Loading" />)

    const progressbar = screen.getByRole("progressbar", { name: "Loading" })
    const fill = progressbar.querySelector('[data-slot="progress-fill"]')

    expect(fill).not.toBeNull()
    expect(progressbar).toHaveAttribute("aria-busy", "true")
    expect(progressbar).not.toHaveAttribute("aria-valuenow")
    expect(progressbar).toHaveAttribute("aria-valuetext", "Loading")
    expect(fill).not.toHaveAttribute("style")
    expect(fill).toHaveClass("animate-[progress-indeterminate_1.4s_ease-in-out_infinite]")
  })
})
