import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Pagination } from "../components/ui/pagination"
import "@testing-library/jest-dom"

describe("Pagination Component", () => {
  it("should render correct number of pages when totalPages <= 7", () => {
    const onPageChange = jest.fn()
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />)
    
    expect(screen.getByRole("button", { name: "Page 1" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Go to page 5" })).toBeInTheDocument()
    // 5 page buttons + 4 navigation buttons = 9 buttons
    expect(screen.getAllByRole("button")).toHaveLength(9)
  })

  it("should disable First and Previous buttons on the first page", () => {
    const onPageChange = jest.fn()
    render(<Pagination currentPage={1} totalPages={10} onPageChange={onPageChange} />)
    
    expect(screen.getByRole("button", { name: "Go to first page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Go to previous page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Go to next page" })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: "Go to last page" })).not.toBeDisabled()
  })

  it("should disable Next and Last buttons on the last page", () => {
    const onPageChange = jest.fn()
    render(<Pagination currentPage={10} totalPages={10} onPageChange={onPageChange} />)
    
    expect(screen.getByRole("button", { name: "Go to first page" })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: "Go to previous page" })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: "Go to next page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Go to last page" })).toBeDisabled()
  })

  it("should call onPageChange with correct page number when a page button is clicked", async () => {
    const user = userEvent.setup()
    const onPageChange = jest.fn()
    render(<Pagination currentPage={1} totalPages={10} onPageChange={onPageChange} />)
    
    await user.click(screen.getByRole("button", { name: "Go to page 3" }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it("should call onPageChange with correct page number when navigation buttons are clicked", async () => {
    const user = userEvent.setup()
    const onPageChange = jest.fn()
    render(<Pagination currentPage={5} totalPages={10} onPageChange={onPageChange} />)
    
    await user.click(screen.getByRole("button", { name: "Go to first page" }))
    expect(onPageChange).toHaveBeenCalledWith(1)
    
    await user.click(screen.getByRole("button", { name: "Go to previous page" }))
    expect(onPageChange).toHaveBeenCalledWith(4)
    
    await user.click(screen.getByRole("button", { name: "Go to next page" }))
    expect(onPageChange).toHaveBeenCalledWith(6)
    
    await user.click(screen.getByRole("button", { name: "Go to last page" }))
    expect(onPageChange).toHaveBeenCalledWith(10)
  })

  it("should render page size selector if pageSize and onPageSizeChange are provided", () => {
    const onPageChange = jest.fn()
    const onPageSizeChange = jest.fn()
    render(
      <Pagination 
        currentPage={1} 
        totalPages={10} 
        onPageChange={onPageChange} 
        pageSize={20}
        onPageSizeChange={onPageSizeChange}
      />
    )
    
    expect(screen.getByRole("combobox", { name: "Select page size" })).toBeInTheDocument()
    expect(screen.getByText("20 / page")).toBeInTheDocument()
  })

  it("should call onPageSizeChange when a new page size is selected", async () => {
    const user = userEvent.setup()
    const onPageChange = jest.fn()
    const onPageSizeChange = jest.fn()
    render(
      <Pagination 
        currentPage={1} 
        totalPages={10} 
        onPageChange={onPageChange} 
        pageSize={10}
        onPageSizeChange={onPageSizeChange}
      />
    )
    
    // Open dropdown
    const combobox = screen.getByRole("combobox", { name: "Select page size" })
    await user.click(combobox)
    
    // Select 50 / page
    const option = screen.getByRole("option", { name: "50 / page" })
    await user.click(option)
    
    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })

  it("should apply proper ARIA attributes to the current page", () => {
    const onPageChange = jest.fn()
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)
    
    const activePage = screen.getByRole("button", { name: "Page 3" })
    expect(activePage).toHaveAttribute("aria-current", "page")
    
    const inactivePage = screen.getByRole("button", { name: "Go to page 4" })
    expect(inactivePage).not.toHaveAttribute("aria-current")
  })
})
