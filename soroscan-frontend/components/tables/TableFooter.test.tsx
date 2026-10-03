import * as React from "react"
import { render } from "@testing-library/react"
import TableFooter from "./TableFooter"

describe("TableFooter", () => {
  test("renders with correct className", () => {
    const { getByRole } = render(<TableFooter />)
    const footer = getByRole("rowgroup")
    expect(footer).toHaveClass("border-t border-terminal-green bg-terminal-green/5 font-medium")
  })
})