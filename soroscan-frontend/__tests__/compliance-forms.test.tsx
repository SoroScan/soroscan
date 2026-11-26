import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import DeletionRequestForm from "@/components/compliance/DeletionRequestForm"
import DataExportForm from "@/components/compliance/DataExportForm"
import {
  useRequestRightToBeForgottenMutation,
  useRequestDataGdprExportMutation,
} from "@/src/generated/apollo-hooks"

jest.mock("@/src/generated/apollo-hooks", () => ({
  useRequestRightToBeForgottenMutation: jest.fn(),
  useRequestDataGdprExportMutation: jest.fn(),
}))

const mockUseDeletionMutation =
  useRequestRightToBeForgottenMutation as jest.MockedFunction<
    typeof useRequestRightToBeForgottenMutation
  >

const mockUseExportMutation =
  useRequestDataGdprExportMutation as jest.MockedFunction<
    typeof useRequestDataGdprExportMutation
  >

describe("DeletionRequestForm", () => {
  const mockRequestDeletion = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequestDeletion.mockResolvedValue({
      data: { requestRightToBeForgotten: { status: "PENDING" } },
    })
    mockUseDeletionMutation.mockReturnValue([
      mockRequestDeletion,
      {
        data: undefined,
        loading: false,
        error: undefined,
      },
    ] as unknown as ReturnType<typeof useRequestRightToBeForgottenMutation>)
  })

  it("renders heading, optional reason field, unchecked confirmation checkbox, and disabled submit button", () => {
    render(<DeletionRequestForm />)

    expect(screen.getByText("Right to be Forgotten")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText("Please let us know why you are leaving...")
    ).toBeInTheDocument()

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox).not.toBeChecked()

    const submitButton = screen.getByRole("button", {
      name: /Submit Deletion Request/i,
    })
    expect(submitButton).toBeDisabled()
  })

  it("blocks submission until the confirmation checkbox is checked", () => {
    render(<DeletionRequestForm />)

    const checkbox = screen.getByRole("checkbox")
    const submitButton = screen.getByRole("button", {
      name: /Submit Deletion Request/i,
    })

    expect(submitButton).toBeDisabled()
    expect(mockRequestDeletion).not.toHaveBeenCalled()

    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(submitButton).toBeEnabled()

    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
    expect(submitButton).toBeDisabled()
  })

  it("submits the deletion request with userId and reason when confirmed", async () => {
    render(<DeletionRequestForm />)

    const reasonInput = screen.getByPlaceholderText(
      "Please let us know why you are leaving..."
    )
    fireEvent.change(reasonInput, {
      target: { value: "Closing workspace account" },
    })

    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(
      screen.getByRole("button", { name: /Submit Deletion Request/i })
    )

    await waitFor(() => {
      expect(mockRequestDeletion).toHaveBeenCalledTimes(1)
      expect(mockRequestDeletion).toHaveBeenCalledWith({
        variables: {
          userId: "user-1",
          reason: "Closing workspace account",
        },
      })
    })
  })

  it("displays the 30-day pending confirmation banner and hides the form once submitted", () => {
    mockUseDeletionMutation.mockReturnValue([
      mockRequestDeletion,
      {
        data: {
          requestRightToBeForgotten: {
            status: "PENDING",
          },
        },
        loading: false,
        error: undefined,
      },
    ] as unknown as ReturnType<typeof useRequestRightToBeForgottenMutation>)

    render(<DeletionRequestForm />)

    expect(screen.getByText("Deletion Request PENDING")).toBeInTheDocument()
    expect(
      screen.getByText(/Will be fully deleted in 30 days/i)
    ).toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /Submit Deletion Request/i })
    ).not.toBeInTheDocument()
  })

  it("displays approved status banner when deletion request is APPROVED", () => {
    mockUseDeletionMutation.mockReturnValue([
      mockRequestDeletion,
      {
        data: {
          requestRightToBeForgotten: {
            status: "APPROVED",
          },
        },
        loading: false,
        error: undefined,
      },
    ] as unknown as ReturnType<typeof useRequestRightToBeForgottenMutation>)

    render(<DeletionRequestForm />)

    expect(screen.getByText("Deletion Request APPROVED")).toBeInTheDocument()
  })

  it("disables the submit button and shows loading label while submitting", () => {
    mockUseDeletionMutation.mockReturnValue([
      mockRequestDeletion,
      {
        data: undefined,
        loading: true,
        error: undefined,
      },
    ] as unknown as ReturnType<typeof useRequestRightToBeForgottenMutation>)

    render(<DeletionRequestForm />)

    const button = screen.getByRole("button", { name: /Submitting\.\.\./i })
    expect(button).toBeDisabled()
  })

  it("renders server error messages and catches mutation rejection cleanly", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    mockRequestDeletion.mockRejectedValueOnce(new Error("Network failure"))

    mockUseDeletionMutation.mockReturnValue([
      mockRequestDeletion,
      {
        data: undefined,
        loading: false,
        error: new Error("Deletion already in progress"),
      },
    ] as unknown as ReturnType<typeof useRequestRightToBeForgottenMutation>)

    render(<DeletionRequestForm />)

    expect(
      screen.getByText("Error: Deletion already in progress")
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(
      screen.getByRole("button", { name: /Submit Deletion Request/i })
    )

    await waitFor(() => {
      expect(mockRequestDeletion).toHaveBeenCalledTimes(1)
      expect(consoleSpy).toHaveBeenCalledWith(
        "Deletion request failed",
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })
})

describe("DataExportForm", () => {
  const mockRequestExport = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequestExport.mockResolvedValue({
      data: {
        requestGDPRDataExport: {
          requestId: "req-12345678-abcd",
          status: "PENDING",
          expiresAt: "2026-12-01T00:00:00.000Z",
          downloadUrl: null,
        },
      },
    })
    mockUseExportMutation.mockReturnValue([
      mockRequestExport,
      {
        data: undefined,
        loading: false,
        error: undefined,
      },
    ] as unknown as ReturnType<typeof useRequestDataGdprExportMutation>)
  })

  it("renders heading, format selector defaulting to JSON, and enabled export button", () => {
    render(<DataExportForm />)

    expect(screen.getByText("GDPR Data Export")).toBeInTheDocument()

    const select = screen.getByRole("combobox") as HTMLSelectElement
    expect(select.value).toBe("JSON")
    expect(screen.getByRole("option", { name: "JSON" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "CSV" })).toBeInTheDocument()

    const button = screen.getByRole("button", { name: /Request Data Export/i })
    expect(button).toBeEnabled()
  })

  it("submits export request with default JSON format", async () => {
    render(<DataExportForm />)

    fireEvent.click(
      screen.getByRole("button", { name: /Request Data Export/i })
    )

    await waitFor(() => {
      expect(mockRequestExport).toHaveBeenCalledTimes(1)
      expect(mockRequestExport).toHaveBeenCalledWith({
        variables: {
          organizationId: "org-1",
          format: "JSON",
        },
      })
    })
  })

  it("updates selected format to CSV and submits with CSV payload", async () => {
    render(<DataExportForm />)

    const select = screen.getByRole("combobox")
    fireEvent.change(select, { target: { value: "CSV" } })
    fireEvent.click(
      screen.getByRole("button", { name: /Request Data Export/i })
    )

    await waitFor(() => {
      expect(mockRequestExport).toHaveBeenCalledTimes(1)
      expect(mockRequestExport).toHaveBeenCalledWith({
        variables: {
          organizationId: "org-1",
          format: "CSV",
        },
      })
    })
  })

  it("renders download link when downloadUrl is returned", () => {
    mockUseExportMutation.mockReturnValue([
      mockRequestExport,
      {
        data: {
          requestGDPRDataExport: {
            requestId: "req-87654321-efgh",
            status: "READY",
            expiresAt: "2026-12-01T12:00:00.000Z",
            downloadUrl: "https://exports.soroscan.io/req-87654321.json",
          },
        },
        loading: false,
        error: undefined,
      },
    ] as unknown as ReturnType<typeof useRequestDataGdprExportMutation>)

    render(<DataExportForm />)

    expect(screen.getByText("Request #req-8765")).toBeInTheDocument()
    expect(screen.getByText("READY")).toBeInTheDocument()

    const downloadLink = screen.getByRole("link", { name: /Download Export/i })
    expect(downloadLink).toHaveAttribute(
      "href",
      "https://exports.soroscan.io/req-87654321.json"
    )
    expect(downloadLink).toHaveAttribute("target", "_blank")
  })

  it("renders 24-hour notice when downloadUrl is not yet available", () => {
    mockUseExportMutation.mockReturnValue([
      mockRequestExport,
      {
        data: {
          requestGDPRDataExport: {
            requestId: "req-11112222-ijkl",
            status: "PROCESSING",
            expiresAt: "2026-12-01T12:00:00.000Z",
            downloadUrl: null,
          },
        },
        loading: false,
        error: undefined,
      },
    ] as unknown as ReturnType<typeof useRequestDataGdprExportMutation>)

    render(<DataExportForm />)

    expect(screen.getByText("Request #req-1111")).toBeInTheDocument()
    expect(screen.getByText("PROCESSING")).toBeInTheDocument()
    expect(
      screen.getByText("Download link will be available within 24 hours.")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /Download Export/i })
    ).not.toBeInTheDocument()
  })

  it("disables button and displays Requesting... while loading", () => {
    mockUseExportMutation.mockReturnValue([
      mockRequestExport,
      {
        data: undefined,
        loading: true,
        error: undefined,
      },
    ] as unknown as ReturnType<typeof useRequestDataGdprExportMutation>)

    render(<DataExportForm />)

    const button = screen.getByRole("button", { name: /Requesting\.\.\./i })
    expect(button).toBeDisabled()
  })

  it("renders server error message and catches rejected export requests", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    mockRequestExport.mockRejectedValueOnce(new Error("Export failed"))

    mockUseExportMutation.mockReturnValue([
      mockRequestExport,
      {
        data: undefined,
        loading: false,
        error: new Error("Export quota exceeded"),
      },
    ] as unknown as ReturnType<typeof useRequestDataGdprExportMutation>)

    render(<DataExportForm />)

    expect(
      screen.getByText("Error: Export quota exceeded")
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: /Request Data Export/i })
    )

    await waitFor(() => {
      expect(mockRequestExport).toHaveBeenCalledTimes(1)
      expect(consoleSpy).toHaveBeenCalledWith(
        "Export request failed",
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })
})