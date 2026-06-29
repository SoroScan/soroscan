import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { Breadcrumb } from "../breadcrumb"

jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
  MockLink.displayName = "Link"
  return MockLink
})

const items = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Detail" },
]

describe("Breadcrumb", () => {
  it("renders all items", () => {
    render(<Breadcrumb items={items} />)
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Events")).toBeInTheDocument()
    expect(screen.getByText("Detail")).toBeInTheDocument()
  })

  it("renders nav with aria-label", () => {
    render(<Breadcrumb items={items} />)
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument()
  })

  it("renders links for all but the last item", () => {
    render(<Breadcrumb items={items} />)
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute("href", "/")
    expect(links[1]).toHaveAttribute("href", "/events")
  })

  it("last item is not a link", () => {
    render(<Breadcrumb items={items} />)
    const linkTexts = screen.getAllByRole("link").map((l) => l.textContent)
    expect(linkTexts).not.toContain("Detail")
  })

  it("marks last item with aria-current=page", () => {
    render(<Breadcrumb items={items} />)
    expect(screen.getByText("Detail")).toHaveAttribute("aria-current", "page")
  })

  it("renders default separators", () => {
    render(<Breadcrumb items={items} />)
    expect(screen.getAllByText("/")).toHaveLength(2)
  })

  it("supports custom separator", () => {
    render(<Breadcrumb items={items} separator="›" />)
    expect(screen.getAllByText("›")).toHaveLength(2)
  })

  it("item without href renders as plain text", () => {
    render(<Breadcrumb items={[{ label: "Only" }]} />)
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.getByText("Only")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <Breadcrumb items={items} className="custom-nav" />
    )
    expect(container.querySelector("nav")).toHaveClass("custom-nav")
  })
})
