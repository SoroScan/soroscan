import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { DeleteConfirmModal } from "../DeleteConfirmModal"

describe("DeleteConfirmModal", () => {
  const mockOnConfirm = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    mockOnConfirm.mockClear()
    mockOnCancel.mockClear()
  })

  describe("Open and Close Behaviour", () => {
    it("renders nothing when isOpen is false", () => {
      render(
        <DeleteConfirmModal
          isOpen={false}
          contractName="Token Vault"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(screen.queryByText(/CONFIRM_DELETE/i)).not.toBeInTheDocument()
    })

    it("renders dialog with contract name and warning message when isOpen is true", () => {
      render(
        <DeleteConfirmModal
          isOpen={true}
          contractName="Token Vault"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText(/CONFIRM_DELETE/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Are you sure you want to delete contract "Token Vault"\?/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/All associated data will be permanently removed/i)
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /DELETE/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /CANCEL/i })).toBeInTheDocument()
    })

    it("calls onCancel when clicking CANCEL button", () => {
      render(
        <DeleteConfirmModal
          isOpen={true}
          contractName="Token Vault"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      fireEvent.click(screen.getByRole("button", { name: /CANCEL/i }))
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })

    it("calls onCancel when clicking header close [X] button", () => {
      render(
        <DeleteConfirmModal
          isOpen={true}
          contractName="Token Vault"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      fireEvent.click(screen.getByText("[X]"))
      expect(mockOnCancel).toHaveBeenCalledTimes(1)
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })
  })

  describe("Confirm and Deleting States", () => {
    it("calls onConfirm when clicking DELETE button", () => {
      render(
        <DeleteConfirmModal
          isOpen={true}
          contractName="Token Vault"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      fireEvent.click(screen.getByTestId("confirm-delete-btn"))
      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    })

    it("disables buttons and displays DELETING... when isDeleting is true", () => {
      render(
        <DeleteConfirmModal
          isOpen={true}
          contractName="Token Vault"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isDeleting={true}
        />
      )

      const deleteBtn = screen.getByRole("button", { name: /DELETING/i })
      const cancelBtn = screen.getByRole("button", { name: /CANCEL/i })

      expect(deleteBtn).toBeDisabled()
      expect(cancelBtn).toBeDisabled()

      fireEvent.click(deleteBtn)
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })
  })
})
