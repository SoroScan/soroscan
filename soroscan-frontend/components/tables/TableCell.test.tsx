import * as React from "react"
import { render } from "@testing-library/react"
import TableCell from "./TableCell"

describe("TableCell", () => {
  test("renders with correct className", () => {
    const { getByRole } = render(<TableCell />)
    const cell = getByRole("cell")
    expect(cell).toHaveClass("p-4 align-middle [&:has([role=checkbox])]:pr-0 group-hover:text-terminal-green transition-colors")
  })
})