import * as React from "react"
import { render } from "@testing-library/react"
import TableHeader from "./TableHeader"

describe("TableHeader", () => {
  test("renders with correct className", () => {
    const { getByRole } = render(<TableHeader />)
    const header = getByRole("rowheader")
    expect(header).toHaveClass("bg-terminal-green/10 border-b-terminal border-terminal-green")
  })
})