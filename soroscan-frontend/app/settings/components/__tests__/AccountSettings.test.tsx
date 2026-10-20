import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import AccountSettings from "../AccountSettings"

describe("AccountSettings", () => {
  beforeEach(() => {
    localStorage.clear()
    jest.useRealTimers()
  })

  it("renders initial state with default row count and inputs", () => {
    render(<AccountSettings />)

    expect(screen.getByText("Account Preference Profile")).toBeInTheDocument()
    expect(screen.getByText(/10 rows per view/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Operator callsign")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("operator@soroscan.io")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "SAVE ACCOUNT PROFILE" })
    ).toBeInTheDocument()
  })

  it("reads display preferences and saved profile from localStorage", () => {
    localStorage.setItem(
      "display_prefs",
      JSON.stringify({ rowsPerPage: 25, fontSize: "base" })
    )
    localStorage.setItem("account_display_name", "OperatorZero")
    localStorage.setItem("account_contact_email", "zero@soroscan.io")

    render(<AccountSettings />)

    expect(screen.getByText(/25 rows per view/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue("OperatorZero")).toBeInTheDocument()
    expect(screen.getByDisplayValue("zero@soroscan.io")).toBeInTheDocument()
  })

  it("fails validation and prevents save when fields are empty or invalid", async () => {
    render(<AccountSettings />)

    const saveBtn = screen.getByRole("button", { name: "SAVE ACCOUNT PROFILE" })
    fireEvent.click(saveBtn)

    // ValidatedInput displays required validation error
    await waitFor(() => {
      expect(screen.getAllByText(/is required/i).length).toBeGreaterThan(0)
    })

    expect(localStorage.getItem("account_display_name")).toBeNull()
    expect(localStorage.getItem("account_contact_email")).toBeNull()
  })

  it("fails validation when email is formatted incorrectly", async () => {
    render(<AccountSettings />)

    fireEvent.change(screen.getByPlaceholderText("Operator callsign"), {
      target: { value: "Captain" },
    })
    fireEvent.change(screen.getByPlaceholderText("operator@soroscan.io"), {
      target: { value: "invalid-email-address" },
    })

    fireEvent.click(screen.getByRole("button", { name: "SAVE ACCOUNT PROFILE" }))

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })

    expect(localStorage.getItem("account_contact_email")).toBeNull()
  })

  it("saves valid profile to localStorage and displays confirmation message", async () => {
    render(<AccountSettings />)

    fireEvent.change(screen.getByPlaceholderText("Operator callsign"), {
      target: { value: "OperatorOne" },
    })
    fireEvent.change(screen.getByPlaceholderText("operator@soroscan.io"), {
      target: { value: "operator@soroscan.io" },
    })

    fireEvent.click(screen.getByRole("button", { name: "SAVE ACCOUNT PROFILE" }))

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "✓ PROFILE SAVED" })
      ).toBeInTheDocument()
    })

    expect(localStorage.getItem("account_display_name")).toBe("OperatorOne")
    expect(localStorage.getItem("account_contact_email")).toBe("operator@soroscan.io")
  })
})
