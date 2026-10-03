import * as React from "react"
import { render } from "@testing-library/react"
import TableBody from "./TableBody"

describe("TableBody", () => {
  test("renders with correct className", () => {
    const { getByRole } = render(<TableBody />)
    const body = getByRole("rowgroup")
    expect(body).toHaveClass("[&_tr:last-child]:border-0")
  })
})