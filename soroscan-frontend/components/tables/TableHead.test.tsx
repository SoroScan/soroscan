import * as React from "react"
import { render } from "@testing-library/react"
import TableHead from "./TableHead"

describe("TableHead", () => {
  test("renders with correct className", () => {
    const { getByRole } = render(<TableHead />)
    const cell = getByRole("cell")
    expect(cell).toHaveClass("h-10 px-4 text-left align-middle font-bold text-terminal-cyan uppercase tracking-wider [&:has([role=checkbox])]:pr-0")
  })
})