import * as React from "react"
import { render } from "@testing-library/react"
import Table from "./Table"

describe("Table", () => {
  test("renders with correct className", () => {
    const { getByRole } = render(<Table />)
    const table = getByRole("table")
    expect(table).toHaveClass("w-full caption-bottom text-sm font-terminal-mono")
  })
})