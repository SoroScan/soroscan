import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { RegisterModal } from "../RegisterModal"

describe("RegisterModal", () => {
  const mockOnClose = jest.fn()
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnSubmit.mockClear()
  })

  describe("Open and Close Behaviour", () => {
    it("renders nothing when isOpen is false", () => {
      render(
        <RegisterModal
          isOpen={false}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(screen.queryByText(/REGISTER_CONTRACT/i)).not.toBeInTheDocument()
    })

    it("renders modal dialog and form fields when isOpen is true", () => {
      render(
        <RegisterModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText(/REGISTER_CONTRACT/i)).toBeInTheDocument()
      expect(screen.getByTestId("contract-id-input")).toBeInTheDocument()
      expect(screen.getByTestId("contract-name-input")).toBeInTheDocument()
      expect(screen.getByTestId("contract-description-input")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("defi, token, swap")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /REGISTER/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /CANCEL/i })).toBeInTheDocument()
    })

    it("calls onClose when cancel button is clicked", () => {
      render(
        <RegisterModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      fireEvent.click(screen.getByRole("button", { name: /CANCEL/i }))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it("calls onClose when close [X] icon button is clicked", () => {
      render(
        <RegisterModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      fireEvent.click(screen.getByText("[X]"))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe("Validation Paths", () => {
    it("shows error when submitting without contract ID", async () => {
      const { container } = render(
        <RegisterModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const form = container.querySelector("form")!
      fireEvent.submit(form)

      expect(screen.getByText("Contract ID is required")).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it("shows error when submitting with contract ID but empty name", async () => {
      const { container } = render(
        <RegisterModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      fireEvent.change(screen.getByTestId("contract-id-input"), {
        target: { value: "CA123456" },
      })
      const form = container.querySelector("form")!
      fireEvent.submit(form)

      expect(screen.getByText("Name is required")).toBeInTheDocument()
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe("Form Submission and Description Counter", () => {
    it("updates character counter when typing description and warns near limit", () => {
      render(
        <RegisterModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      const descInput = screen.getByTestId("contract-description-input")
      expect(screen.getByText("0/256")).toBeInTheDocument()

      fireEvent.change(descInput, { target: { value: "Short description" } })
      expect(screen.getByText("17/256")).toBeInTheDocument()

      // Exceed warning threshold (256 * 0.9 = 230)
      const longText = "A".repeat(235)
      fireEvent.change(descInput, { target: { value: longText } })
      const counter = screen.getByText("235/256")
      expect(counter).toBeInTheDocument()
      expect(counter).toHaveClass("text-terminal-danger")
    })

    it("submits valid form data including tags and status, then closes modal", async () => {
      mockOnSubmit.mockResolvedValueOnce(undefined)

      const { container } = render(
        <RegisterModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      fireEvent.change(screen.getByTestId("contract-id-input"), {
        target: { value: "CA99887766" },
      })
      fireEvent.change(screen.getByTestId("contract-name-input"), {
        target: { value: "Soroban Swap" },
      })
      fireEvent.change(screen.getByTestId("contract-description-input"), {
        target: { value: "AMM liquidity contract" },
      })
      fireEvent.change(screen.getByPlaceholderText("defi, token, swap"), {
        target: { value: "defi, amm, token" },
      })

      // Toggle status to inactive
      const inactiveRadio = screen.getByDisplayValue("inactive")
      fireEvent.click(inactiveRadio)

      const form = container.querySelector("form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
        expect(mockOnSubmit).toHaveBeenCalledWith({
          contractId: "CA99887766",
          name: "Soroban Swap",
          description: "AMM liquidity contract",
          tags: ["defi", "amm", "token"],
          status: "inactive",
        })
      })

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it("handles onSubmit failure and displays error banner without closing", async () => {
      mockOnSubmit.mockRejectedValueOnce(new Error("Network submission error"))

      const { container } = render(
        <RegisterModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />
      )

      fireEvent.change(screen.getByTestId("contract-id-input"), {
        target: { value: "CA112233" },
      })
      fireEvent.change(screen.getByTestId("contract-name-input"), {
        target: { value: "Test Token" },
      })

      const form = container.querySelector("form")!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText("Network submission error")).toBeInTheDocument()
      })

      expect(mockOnClose).not.toHaveBeenCalled()
      expect(screen.getByRole("button", { name: /REGISTER/i })).not.toBeDisabled()
    })
  })
})
