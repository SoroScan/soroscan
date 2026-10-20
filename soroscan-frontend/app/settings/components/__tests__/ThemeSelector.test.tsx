import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import ThemeSelector from "../ThemeSelector"

describe("ThemeSelector", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("dark")
  })

  it("renders dark and light theme options", () => {
    render(<ThemeSelector />)

    expect(screen.getByText("[ THEME ]")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /DARK/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /LIGHT/i })).toBeInTheDocument()
  })

  it("switches theme and persists to localStorage and document classList", () => {
    render(<ThemeSelector />)

    const lightBtn = screen.getByRole("button", { name: /LIGHT/i })
    fireEvent.click(lightBtn)

    expect(localStorage.getItem("theme")).toBe("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)

    const darkBtn = screen.getByRole("button", { name: /DARK/i })
    fireEvent.click(darkBtn)

    expect(localStorage.getItem("theme")).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })
})
