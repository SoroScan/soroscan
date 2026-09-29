import * as React from "react"
import { render } from "@testing-library/react"
import TableRow from "./TableRow"

describe("TableRow", () => {
  test("renders with correct className", () => {
    const { getByRole } = render(<TableRow />)
    const row = getByRole("row")
    expect(row).toHaveClass("border-b border-terminal-green/30 transition-colors hover:bg-terminal-green/10 hover:shadow-glow-green/20 group cursor-default")
  })
})