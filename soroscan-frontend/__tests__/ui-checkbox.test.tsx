import * as React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Checkbox } from "../components/ui/checkbox"
import "@testing-library/jest-dom"

describe("Checkbox Component", () => {
  it("should render unchecked by default", () => {
    render(<Checkbox data-testid="test-checkbox" aria-label="Test Checkbox" />)
    const checkbox = screen.getByTestId("test-checkbox") as HTMLInputElement
    expect(checkbox).toBeInTheDocument()
    expect(checkbox.checked).toBe(false)
  })

  it("should toggle checked state on click", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(<Checkbox data-testid="test-checkbox" aria-label="Test Checkbox" onChange={onChange} />)
    
    const checkbox = screen.getByTestId("test-checkbox") as HTMLInputElement
    
    // Initially false
    expect(checkbox.checked).toBe(false)
    
    // Click to check
    await user.click(checkbox)
    expect(checkbox.checked).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    
    // Click to uncheck
    await user.click(checkbox)
    expect(checkbox.checked).toBe(false)
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it("should toggle when its label is clicked", async () => {
    const user = userEvent.setup()
    render(<Checkbox label="Accept Terms" id="terms-checkbox" />)
    
    const label = screen.getByText("Accept Terms")
    const checkbox = screen.getByRole("checkbox", { name: "Accept Terms" }) as HTMLInputElement
    
    expect(checkbox.checked).toBe(false)
    
    // Click label
    await user.click(label)
    expect(checkbox.checked).toBe(true)
    
    // Click label again
    await user.click(label)
    expect(checkbox.checked).toBe(false)
  })

  it("should support the indeterminate state", () => {
    render(<Checkbox data-testid="test-checkbox" aria-label="Test Checkbox" indeterminate />)
    
    const checkbox = screen.getByTestId("test-checkbox") as HTMLInputElement
    
    expect(checkbox.indeterminate).toBe(true)
    expect(checkbox).toHaveAttribute("aria-checked", "mixed")
    
    // Check that the minus icon is rendered
    expect(screen.getByTestId("minus-icon")).toBeInTheDocument()
  })

  it("should not be clickable when disabled", async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    
    render(<Checkbox data-testid="test-checkbox" aria-label="Test Checkbox" disabled onChange={onChange} />)
    
    const checkbox = screen.getByTestId("test-checkbox") as HTMLInputElement
    
    expect(checkbox).toBeDisabled()
    
    await user.click(checkbox)
    
    expect(checkbox.checked).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
  })

  it("should apply proper ARIA attributes", () => {
    const { rerender } = render(<Checkbox data-testid="test-checkbox" aria-label="Custom Aria Label" />)
    
    const checkbox = screen.getByTestId("test-checkbox")
    expect(checkbox).toHaveAttribute("aria-label", "Custom Aria Label")
    // Native checkbox natively exposes state to screen readers. We override explicitly for checked when passed.
    
    rerender(<Checkbox data-testid="test-checkbox" aria-label="Custom Aria Label" checked readOnly />)
    // If it's controlled and checked, we should ensure it has it or we can just verify the DOM property.
    expect((checkbox as HTMLInputElement).checked).toBe(true)
    
    rerender(<Checkbox data-testid="test-checkbox" aria-label="Custom Aria Label" indeterminate />)
    expect(checkbox).toHaveAttribute("aria-checked", "mixed")
  })
})
