import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import APIKeyManager from "../APIKeyManager"

describe("APIKeyManager", () => {
  beforeEach(() => {
    localStorage.clear()
    jest.useRealTimers()
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(() => Promise.resolve()),
      },
    })
  })

  it("renders empty state when no keys exist", () => {
    render(<APIKeyManager />)

    expect(screen.getByText("[ API KEYS ]")).toBeInTheDocument()
    expect(screen.getByText("No API keys yet.")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "+ Generate New Key" })
    ).toBeInTheDocument()
  })

  it("generates a new key and persists it to localStorage", async () => {
    render(<APIKeyManager />)

    fireEvent.click(screen.getByRole("button", { name: "+ Generate New Key" }))

    expect(screen.queryByText("No API keys yet.")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "COPY" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "DEL" })).toBeInTheDocument()

    const stored = JSON.parse(localStorage.getItem("apiKeys") || "[]")
    expect(stored).toHaveLength(1)
    expect(stored[0].key.startsWith("sk_live_")).toBe(true)
    expect(screen.getByText(new RegExp(stored[0].key.slice(0, 10)))).toBeInTheDocument()
  })

  it("copies API key to clipboard", async () => {
    const mockApiKey = "soroscan_api_test_key_sample_12345"
    localStorage.setItem(
      "apiKeys",
      JSON.stringify([
        {
          id: "key-1",
          key: mockApiKey,
          createdAt: "Jan 1, 2025",
        },
      ])
    )

    render(<APIKeyManager />)

    const copyBtn = screen.getByRole("button", { name: "COPY" })
    fireEvent.click(copyBtn)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockApiKey)
      expect(screen.getByRole("button", { name: "✓" })).toBeInTheDocument()
    })
  })

  it("revokes an API key via confirmation dialog", async () => {
    const mockKeyToRevoke = "soroscan_api_key_to_revoke_67890"
    localStorage.setItem(
      "apiKeys",
      JSON.stringify([
        {
          id: "key-to-delete",
          key: mockKeyToRevoke,
          createdAt: "Feb 1, 2025",
        },
      ])
    )

    render(<APIKeyManager />)

    expect(screen.getByText(/soroscan_api_key/)).toBeInTheDocument()

    // Click DEL to open confirmation dialog
    fireEvent.click(screen.getByRole("button", { name: "DEL" }))

    expect(screen.getByText("Revoke API Key")).toBeInTheDocument()
    expect(
      screen.getByText(
        "This action is permanent. The key will stop working immediately."
      )
    ).toBeInTheDocument()

    // Click Revoke in dialog
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }))

    await waitFor(() => {
      expect(screen.getByText("No API keys yet.")).toBeInTheDocument()
    })

    const stored = JSON.parse(localStorage.getItem("apiKeys") || "[]")
    expect(stored).toHaveLength(0)
  })
})
