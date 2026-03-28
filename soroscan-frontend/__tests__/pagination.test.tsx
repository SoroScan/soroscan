import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Pagination from "@/components/ui/Pagination"

describe("Pagination", () => {
  it("renders summary and calls callbacks", async () => {
    const user = userEvent.setup()
    const onPrev = jest.fn()
    const onNext = jest.fn()

    render(<Pagination onPrev={onPrev} onNext={onNext} page={2} />)

    expect(screen.getByText(/Page 2/)).toBeInTheDocument()

    const prev = screen.getByRole("button", { name: /Previous page/i })
    const next = screen.getByRole("button", { name: /Next page/i })

    await user.click(prev)
    await user.click(next)

    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})
