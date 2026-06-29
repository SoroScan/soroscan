import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { Divider } from "../divider"

describe("Divider", () => {
  it("renders with role=separator", () => {
    render(<Divider />)
    expect(screen.getByRole("separator")).toBeInTheDocument()
  })

  it("defaults to horizontal orientation", () => {
    render(<Divider />)
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal")
  })

  it("renders vertical variant", () => {
    render(<Divider orientation="vertical" />)
    const sep = screen.getByRole("separator")
    expect(sep).toHaveAttribute("aria-orientation", "vertical")
    expect(sep).toHaveClass("w-px", "h-full")
  })

  it("renders label text on horizontal divider", () => {
    render(<Divider label="OR" />)
    expect(screen.getByText("OR")).toBeInTheDocument()
  })

  it("renders two line elements flanking the label", () => {
    const { container } = render(<Divider label="OR" />)
    const lines = container.querySelectorAll(".flex-1")
    expect(lines).toHaveLength(2)
  })

  it("applies subtle variant by default", () => {
    render(<Divider />)
    expect(screen.getByRole("separator")).toHaveClass("opacity-40")
  })

  it("applies prominent variant", () => {
    render(<Divider variant="prominent" />)
    expect(screen.getByRole("separator")).toHaveClass("opacity-100")
  })

  it("applies custom color via inline style", () => {
    render(<Divider color="#ff0000" />)
    expect(screen.getByRole("separator")).toHaveStyle({ backgroundColor: "#ff0000" })
  })

  it("applies custom className", () => {
    render(<Divider className="my-divider" />)
    expect(screen.getByRole("separator")).toHaveClass("my-divider")
  })
})
