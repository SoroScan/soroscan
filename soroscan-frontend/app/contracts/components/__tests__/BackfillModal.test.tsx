import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { BackfillModal } from "@/app/contracts/[id]/components/BackfillModal"
import type { BackfillTask } from "@/components/ingest/contract-types"

describe("BackfillModal", () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  const sampleRunningTask: BackfillTask = {
    taskId: "bf-task-12345",
    contractId: "CA11223344",
    fromLedger: 1000,
    toLedger: 5000,
    status: "running",
    progress: 45,
    message: "Syncing ledgers 1000..5000",
  }

  const sampleCompletedTask: BackfillTask = {
    taskId: "bf-task-completed",
    contractId: "CA998877",
    fromLedger: 100,
    toLedger: 200,
    status: "completed",
    progress: 100,
  }

  const sampleFailedTask: BackfillTask = {
    taskId: "bf-task-failed",
    contractId: "CA000000",
    fromLedger: 10,
    toLedger: 20,
    status: "failed",
    message: "RPC timeout while fetching ledger entries",
  }

  describe("Open and Close Behaviour", () => {
    it("renders nothing when isOpen is false", () => {
      render(
        <BackfillModal
          isOpen={false}
          onClose={mockOnClose}
          task={sampleRunningTask}
        />
      )

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(screen.queryByText(/BACKFILL_TASK/i)).not.toBeInTheDocument()
    })

    it("renders dialog when isOpen is true", () => {
      render(
        <BackfillModal
          isOpen={true}
          onClose={mockOnClose}
          task={sampleRunningTask}
        />
      )

      expect(screen.getByRole("dialog")).toBeInTheDocument()
      expect(screen.getByText(/BACKFILL_TASK/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /CLOSE/i })).toBeInTheDocument()
    })

    it("calls onClose when CLOSE button is clicked", () => {
      render(
        <BackfillModal
          isOpen={true}
          onClose={mockOnClose}
          task={sampleRunningTask}
        />
      )

      fireEvent.click(screen.getByRole("button", { name: /CLOSE/i }))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it("calls onClose when close [X] icon button is clicked", () => {
      render(
        <BackfillModal
          isOpen={true}
          onClose={mockOnClose}
          task={sampleRunningTask}
        />
      )

      fireEvent.click(screen.getByText("[X]"))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe("Task Data Rendering", () => {
    it("renders fallback message when task is null", () => {
      render(
        <BackfillModal
          isOpen={true}
          onClose={mockOnClose}
          task={null}
        />
      )

      expect(
        screen.getByText("No task information available")
      ).toBeInTheDocument()
    })

    it("renders running task with progress bar and custom message", () => {
      const { container } = render(
        <BackfillModal
          isOpen={true}
          onClose={mockOnClose}
          task={sampleRunningTask}
        />
      )

      expect(screen.getByText("Task ID:")).toBeInTheDocument()
      expect(screen.getByText("bf-task-12345")).toBeInTheDocument()
      expect(screen.getByText("Status:")).toBeInTheDocument()
      expect(screen.getByText("RUNNING")).toBeInTheDocument()
      expect(screen.getByText("Progress:")).toBeInTheDocument()
      expect(screen.getByText("45%")).toBeInTheDocument()
      expect(
        screen.getByText("Syncing ledgers 1000..5000")
      ).toBeInTheDocument()

      const progressBar = container.querySelector('div[style*="width: 45%"]')
      expect(progressBar).toBeInTheDocument()
    })

    it("renders completed task status properly", () => {
      render(
        <BackfillModal
          isOpen={true}
          onClose={mockOnClose}
          task={sampleCompletedTask}
        />
      )

      expect(screen.getByText("bf-task-completed")).toBeInTheDocument()
      expect(screen.getByText("COMPLETED")).toBeInTheDocument()
      expect(screen.getByText("100%")).toBeInTheDocument()
    })

    it("renders failed task status and error message", () => {
      render(
        <BackfillModal
          isOpen={true}
          onClose={mockOnClose}
          task={sampleFailedTask}
        />
      )

      expect(screen.getByText("bf-task-failed")).toBeInTheDocument()
      expect(screen.getByText("FAILED")).toBeInTheDocument()
      expect(
        screen.getByText("RPC timeout while fetching ledger entries")
      ).toBeInTheDocument()
    })
  })
})
