import React from "react"
import { render, screen } from "@testing-library/react"
import { ErrorLog } from "../ErrorLog"

describe("ErrorLog", () => {
  const sampleErrors = [
    {
      id: "err_1",
      timestamp: "2026-10-20T08:00:00Z",
      level: "ERROR" as const,
      message: "Database connection timed out during ingestion",
      context: "soroban-rpc://mainnet.stellar.org/poll",
    },
    {
      id: "err_2",
      timestamp: "2026-10-20T08:05:00Z",
      level: "WARNING" as const,
      message: "Webhook retry queue backlog exceeds threshold (12/10)",
    },
  ]

  it("renders header, log items, timestamps, and footer info", () => {
    const { container } = render(
      <ErrorLog
        errors={sampleErrors}
      />
    )

    expect(screen.getByText("[SYSTEM_ERROR_LOG]")).toBeInTheDocument()
    expect(screen.getByText("LIVE_FEED")).toBeInTheDocument()

    // Level badges
    expect(screen.getByText("ERROR")).toBeInTheDocument()
    expect(screen.getByText("WARNING")).toBeInTheDocument()

    // Messages
    expect(screen.getByText("Database connection timed out during ingestion")).toBeInTheDocument()
    expect(screen.getByText("Webhook retry queue backlog exceeds threshold (12/10)")).toBeInTheDocument()

    // Context
    expect(screen.getByText("CONTEXT: soroban-rpc://mainnet.stellar.org/poll")).toBeInTheDocument()

    // Footer info
    expect(screen.getByText("Cursor: 0.0.0")).toBeInTheDocument()
    expect(screen.getByText("encoding: utf-8")).toBeInTheDocument()

    // Verify error border styling
    const errorContainers = container.querySelectorAll(".border-l-2")
    expect(errorContainers.length).toBe(2)
    expect(errorContainers[0].className).toContain("border-terminal-danger")
    expect(errorContainers[1].className).toContain("border-terminal-warning")
  })

  it("renders friendly optimal empty state when errors array is empty", () => {
    render(
      <ErrorLog
        errors={[]}
      />
    )

    expect(screen.getByText("[SYSTEM_ERROR_LOG]")).toBeInTheDocument()
    expect(screen.getByText("NO_CONTENT_FOUND: system health is optimal.")).toBeInTheDocument()
    expect(screen.queryByText("ERROR")).not.toBeInTheDocument()
  })

  it("renders TAILING_LOGS... placeholder when loading is true", () => {
    render(
      <ErrorLog
        errors={sampleErrors}
        loading={true}
      />
    )

    expect(screen.getByText("[SYSTEM_ERROR_LOG]")).toBeInTheDocument()
    expect(screen.getByText("TAILING_LOGS...")).toBeInTheDocument()
    expect(screen.queryByText("Database connection timed out during ingestion")).not.toBeInTheDocument()
    expect(screen.queryByText("NO_CONTENT_FOUND: system health is optimal.")).not.toBeInTheDocument()
  })

  it("omits context block when error context is not provided", () => {
    const errorWithoutContext = [
      {
        id: "err_3",
        timestamp: "2026-10-20T08:10:00Z",
        level: "ERROR" as const,
        message: "Isolated error with no context",
      },
    ]

    const { container } = render(
      <ErrorLog
        errors={errorWithoutContext}
      />
    )

    expect(screen.getByText("Isolated error with no context")).toBeInTheDocument()
    expect(container.textContent).not.toContain("CONTEXT:")
  })
})
