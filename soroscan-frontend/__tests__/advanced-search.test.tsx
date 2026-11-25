import { fireEvent, render, screen } from "@testing-library/react"
import { AdvancedSearch } from "@/app/dashboard/components/AdvancedSearch"

beforeEach(() => {
  localStorage.clear()
})

describe("AdvancedSearch", () => {
  it("initializes from initialQuery and submits the edited query on Enter", () => {
    const onSearch = jest.fn()
    render(<AdvancedSearch initialQuery="type:transfer" onSearch={onSearch} />)

    const input = screen.getByRole("textbox", { name: "Search events with syntax" })
    expect(input).toHaveValue("type:transfer")

    fireEvent.change(input, {
      target: { value: "type:swap contract:CA123 amount:>1000" },
    })
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" })

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith("type:swap contract:CA123 amount:>1000")
  })

  it("submits a quick filter and updates the query input", () => {
    const onSearch = jest.fn()
    render(<AdvancedSearch onSearch={onSearch} />)

    fireEvent.click(screen.getByRole("button", { name: "Failed" }))

    expect(onSearch).toHaveBeenCalledWith("status:failed")
    expect(screen.getByRole("textbox", { name: "Search events with syntax" })).toHaveValue(
      "status:failed",
    )
  })

  it("submits an empty query when cleared and does not add it to recent history", () => {
    const onSearch = jest.fn()
    render(<AdvancedSearch initialQuery="type:transfer" onSearch={onSearch} />)

    const input = screen.getByRole("textbox", { name: "Search events with syntax" })
    fireEvent.change(input, { target: { value: "" } })
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" })

    expect(onSearch).toHaveBeenCalledWith("")
    expect(screen.queryByText("Recent History")).not.toBeInTheDocument()
  })
})
