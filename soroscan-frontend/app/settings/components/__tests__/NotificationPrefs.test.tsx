import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import NotificationPrefs from "../NotificationPrefs"

describe("NotificationPrefs", () => {
  beforeEach(() => {
    localStorage.clear()
    jest.useRealTimers()
  })

  it("renders default notification settings", () => {
    render(<NotificationPrefs />)

    expect(screen.getByText("[ NOTIFICATIONS ]")).toBeInTheDocument()
    expect(screen.getByText("Email Notifications")).toBeInTheDocument()
    expect(screen.getByText("In-App Notifications")).toBeInTheDocument()
    expect(screen.getByText("Webhook")).toBeInTheDocument()

    // Default: email ON, inApp ON, webhook OFF
    const buttons = screen.getAllByRole("button", { name: /ON|OFF/i })
    expect(buttons[0]).toHaveTextContent("ON")
    expect(buttons[1]).toHaveTextContent("ON")
    expect(buttons[2]).toHaveTextContent("OFF")

    expect(screen.queryByPlaceholderText("https://your-webhook-url.com")).not.toBeInTheDocument()
  })

  it("toggles webhook option and renders webhook URL input", () => {
    render(<NotificationPrefs />)

    const buttons = screen.getAllByRole("button", { name: /ON|OFF/i })
    const webhookToggle = buttons[2]

    fireEvent.click(webhookToggle)
    expect(webhookToggle).toHaveTextContent("ON")

    const urlInput = screen.getByPlaceholderText("https://your-webhook-url.com")
    expect(urlInput).toBeInTheDocument()

    fireEvent.change(urlInput, {
      target: { value: "https://example.com/alerts" },
    })
    expect(urlInput).toHaveValue("https://example.com/alerts")
  })

  it("saves preferences to localStorage and shows saved confirmation", async () => {
    render(<NotificationPrefs />)

    // Toggle email to OFF
    const emailToggle = screen.getAllByRole("button", { name: /ON|OFF/i })[0]
    fireEvent.click(emailToggle)
    expect(emailToggle).toHaveTextContent("OFF")

    const saveBtn = screen.getByRole("button", { name: "SAVE PREFERENCES" })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "✓ SAVED" })
      ).toBeInTheDocument()
    })

    const stored = JSON.parse(localStorage.getItem("notificationPrefs") || "{}")
    expect(stored.email).toBe(false)
    expect(stored.inApp).toBe(true)
  })

  it("loads stored preferences on mount", () => {
    localStorage.setItem(
      "notificationPrefs",
      JSON.stringify({
        email: false,
        inApp: false,
        webhook: true,
        webhookUrl: "https://custom.hook.io",
      })
    )

    render(<NotificationPrefs />)

    const buttons = screen.getAllByRole("button", { name: /ON|OFF/i })
    expect(buttons[0]).toHaveTextContent("OFF")
    expect(buttons[1]).toHaveTextContent("OFF")
    expect(buttons[2]).toHaveTextContent("ON")
    expect(screen.getByDisplayValue("https://custom.hook.io")).toBeInTheDocument()
  })
})
