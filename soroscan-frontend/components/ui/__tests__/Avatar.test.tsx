import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { Avatar } from "../avatar"

describe("Avatar", () => {
  // --- Image rendering ---
  it("renders image when src provided", () => {
    render(<Avatar src="https://example.com/pic.jpg" name="Alice Smith" />)
    const img = screen.getByRole("img", { name: "Alice Smith" })
    expect(img).toHaveAttribute("src", "https://example.com/pic.jpg")
  })

  it("shows initials fallback when no src", () => {
    render(<Avatar name="Alice Smith" />)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByLabelText("AS")).toBeInTheDocument()
  })

  it("shows initials fallback when image fails to load", () => {
    render(<Avatar src="https://example.com/broken.jpg" name="Bob Jones" />)
    fireEvent.error(screen.getByRole("img"))
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.getByLabelText("BJ")).toBeInTheDocument()
  })

  // --- Initials logic ---
  it("uses first two chars for single-word name", () => {
    render(<Avatar name="Alice" />)
    expect(screen.getByLabelText("AL")).toBeInTheDocument()
  })

  it("uses first + last initial for multi-word name", () => {
    render(<Avatar name="John Michael Doe" />)
    expect(screen.getByLabelText("JD")).toBeInTheDocument()
  })

  // --- Size variants ---
  it("applies md size by default", () => {
    const { container } = render(<Avatar name="Test" />)
    expect(container.firstChild).toHaveClass("w-10", "h-10")
  })

  it("applies sm size", () => {
    const { container } = render(<Avatar name="Test" size="sm" />)
    expect(container.firstChild).toHaveClass("w-8", "h-8")
  })

  it("applies lg size", () => {
    const { container } = render(<Avatar name="Test" size="lg" />)
    expect(container.firstChild).toHaveClass("w-14", "h-14")
  })

  // --- Tooltip ---
  it("renders title attribute for native tooltip", () => {
    const { container } = render(<Avatar name="Alice Smith" />)
    expect(container.firstChild).toHaveAttribute("title", "Alice Smith")
  })

  it("renders tooltip span with name", () => {
    render(<Avatar name="Alice Smith" />)
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("Alice Smith")
  })

  // --- Custom color ---
  it("applies custom background color to initials span", () => {
    render(<Avatar name="Alice" color="#abc123" />)
    expect(screen.getByLabelText("AL")).toHaveStyle({ backgroundColor: "#abc123" })
  })

  // --- Custom className ---
  it("applies custom className", () => {
    const { container } = render(<Avatar name="Alice" className="ring-2" />)
    expect(container.firstChild).toHaveClass("ring-2")
  })
})
