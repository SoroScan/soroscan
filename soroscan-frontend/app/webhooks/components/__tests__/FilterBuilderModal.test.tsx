import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { FilterBuilderModal } from "../FilterBuilderModal"
import type { FilterExpression } from "@/components/ui/WebhookFilterExpressionBuilder"

describe("FilterBuilderModal", () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnSave.mockClear()
  })

  const sampleInitialExpression: FilterExpression = {
    root: {
      id: "root-1",
      kind: "group",
      logic: "AND",
      children: [
        {
          id: "c-1",
          kind: "condition",
          field: "event_type",
          operator: "eq",
          value: "SWAP_COMPLETE",
        },
      ],
    },
  }

  describe("Visibility and Dialog Controls", () => {
    it("renders nothing when isOpen is false", () => {
      render(
        <FilterBuilderModal
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(screen.queryByText(/FILTER_EXPRESSION_BUILDER/i)).not.toBeInTheDocument()
    })

    it("renders modal dialog and header when isOpen is true", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText(/FILTER_EXPRESSION_BUILDER/i)).toBeInTheDocument()
      expect(screen.getByTestId("tab-build")).toBeInTheDocument()
      expect(screen.getByTestId("tab-test")).toBeInTheDocument()
      expect(screen.getByTestId("save-filter-btn")).toBeInTheDocument()
      expect(screen.getByTestId("cancel-filter-btn")).toBeInTheDocument()
    })

    it("calls onClose when cancel button is clicked", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      fireEvent.click(screen.getByTestId("cancel-filter-btn"))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it("calls onClose when modal close button [X] is clicked", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      fireEvent.click(screen.getByText("[X]"))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it("populates with initialExpression when provided", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialExpression={sampleInitialExpression}
        />
      )

      const preview = screen.getByTestId("filter-expression-preview")
      expect(preview).toHaveTextContent('event_type = "SWAP_COMPLETE"')
    })
  })

  describe("Tab Navigation", () => {
    it("switches between BUILD and TEST tabs", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      const buildTab = screen.getByTestId("tab-build")
      const testTab = screen.getByTestId("tab-test")

      expect(buildTab).toHaveAttribute("aria-selected", "true")
      expect(testTab).toHaveAttribute("aria-selected", "false")
      expect(screen.getByTestId("filter-expression-preview")).toBeInTheDocument()

      // Switch to TEST tab
      fireEvent.click(testTab)
      expect(testTab).toHaveAttribute("aria-selected", "true")
      expect(buildTab).toHaveAttribute("aria-selected", "false")
      expect(screen.getByTestId("filter-expression-tester")).toBeInTheDocument()

      // Switch back to BUILD tab
      fireEvent.click(buildTab)
      expect(buildTab).toHaveAttribute("aria-selected", "true")
      expect(screen.getByTestId("filter-expression-preview")).toBeInTheDocument()
    })
  })

  describe("Add and Remove Rule Behaviour", () => {
    it("adds a condition rule when clicking CONDITION button", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Initially 1 condition, no remove button
      expect(screen.getAllByTestId("webhook-filter-condition")).toHaveLength(1)
      expect(screen.queryByTestId("remove-condition-btn")).not.toBeInTheDocument()
      expect(screen.getByText("1 rule defined")).toBeInTheDocument()

      // Add condition
      fireEvent.click(screen.getByTestId("add-condition-btn"))

      expect(screen.getAllByTestId("webhook-filter-condition")).toHaveLength(2)
      expect(screen.getByText("2 rules defined")).toBeInTheDocument()
      expect(screen.getAllByTestId("remove-condition-btn")).toHaveLength(2)
    })

    it("removes a condition rule when clicking remove button", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Add condition to make it 2
      fireEvent.click(screen.getByTestId("add-condition-btn"))
      expect(screen.getAllByTestId("webhook-filter-condition")).toHaveLength(2)

      // Remove the second condition
      const removeBtns = screen.getAllByTestId("remove-condition-btn")
      fireEvent.click(removeBtns[1])

      expect(screen.getAllByTestId("webhook-filter-condition")).toHaveLength(1)
      expect(screen.getByText("1 rule defined")).toBeInTheDocument()
      expect(screen.queryByTestId("remove-condition-btn")).not.toBeInTheDocument()
    })

    it("adds and removes sub-groups", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Add sub-group
      fireEvent.click(screen.getByTestId("add-group-btn"))
      expect(screen.getByTestId("webhook-filter-sub-group")).toBeInTheDocument()
      expect(screen.getByTestId("remove-group-btn")).toBeInTheDocument()

      // Remove the sub-group
      fireEvent.click(screen.getByTestId("remove-group-btn"))
      expect(screen.queryByTestId("webhook-filter-sub-group")).not.toBeInTheDocument()
    })

    it("resets rules when clicking RESET button", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Add multiple rules
      fireEvent.click(screen.getByTestId("add-condition-btn"))
      fireEvent.click(screen.getByTestId("add-group-btn"))
      expect(screen.getByText(/rules defined/i)).toBeInTheDocument()

      // Click RESET
      fireEvent.click(screen.getByTestId("reset-expression-btn"))
      expect(screen.getAllByTestId("webhook-filter-condition")).toHaveLength(1)
      expect(screen.getByText("1 rule defined")).toBeInTheDocument()
    })
  })

  describe("Generated Expression and Save Interaction", () => {
    it("updates generated expression when modifying field, operator and value", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Select enum value for the default condition (event_type)
      const valueSelect = screen.getByLabelText("Filter value")
      fireEvent.change(valueSelect, { target: { value: "VAULT_DEPOSIT" } })

      const preview = screen.getByTestId("filter-expression-preview")
      expect(preview).toHaveTextContent('event_type = "VAULT_DEPOSIT"')
    })

    it("asserts compound generated expression across multiple rules and logic operators", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      )

      // Rule 1: event_type = "SWAP_COMPLETE"
      const firstValSelect = screen.getByLabelText("Filter value")
      fireEvent.change(firstValSelect, { target: { value: "SWAP_COMPLETE" } })

      // Toggle group logic from AND to OR
      const orBtn = screen.getByTestId("logic-or-btn")
      fireEvent.click(orBtn)

      // Add Rule 2
      fireEvent.click(screen.getByTestId("add-condition-btn"))

      const fieldSelects = screen.getAllByLabelText("Filter field")
      const operatorSelects = screen.getAllByLabelText("Filter operator")

      // Change Rule 2 to amount > 1000
      fireEvent.change(fieldSelects[1], { target: { value: "amount" } })
      fireEvent.change(operatorSelects[1], { target: { value: "gt" } })

      const valueInputs = screen.getAllByLabelText("Filter value")
      fireEvent.change(valueInputs[1], { target: { value: "1000" } })

      const preview = screen.getByTestId("filter-expression-preview")
      expect(preview.textContent).toContain('event_type = "SWAP_COMPLETE"')
      expect(preview.textContent).toContain("OR")
      expect(preview.textContent).toContain("amount > 1000")
    })

    it("calls onSave with serialized expression and expression tree, then closes modal", () => {
      render(
        <FilterBuilderModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          initialExpression={sampleInitialExpression}
        />
      )

      const saveBtn = screen.getByTestId("save-filter-btn")
      fireEvent.click(saveBtn)

      expect(mockOnSave).toHaveBeenCalledTimes(1)
      const [savedString, savedExpr] = mockOnSave.mock.calls[0]
      expect(savedString).toBe('event_type = "SWAP_COMPLETE"')
      expect(savedExpr).toEqual(sampleInitialExpression)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })
})
