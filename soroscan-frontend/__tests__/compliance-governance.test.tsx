import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import RetentionPolicyEditor from "@/components/compliance/RetentionPolicyEditor"
import DataResidencyViewer from "@/components/compliance/DataResidencyViewer"
import ComplianceStatusCard from "@/components/compliance/ComplianceStatusCard"
import CookieConsentBanner from "@/components/compliance/CookieConsentBanner"

describe("RetentionPolicyEditor", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it("renders heading, description, retention options defaulting to 30 days, and Save Policy button", () => {
    render(<RetentionPolicyEditor />)

    expect(screen.getByText("Data Retention Policy")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Configure how long event data is retained before being automatically deleted."
      )
    ).toBeInTheDocument()
    expect(screen.getByText("Retention Period")).toBeInTheDocument()

    const select = screen.getByRole("combobox") as HTMLSelectElement
    expect(select.value).toBe("30")
    expect(screen.getByRole("option", { name: "30 Days" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "90 Days" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "365 Days" })).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Keep Forever" })
    ).toBeInTheDocument()

    const saveButton = screen.getByRole("button", { name: "Save Policy" })
    expect(saveButton).toBeEnabled()
  })

  it("allows changing the selected retention period", () => {
    render(<RetentionPolicyEditor />)

    const select = screen.getByRole("combobox") as HTMLSelectElement

    fireEvent.change(select, { target: { value: "90" } })
    expect(select.value).toBe("90")

    fireEvent.change(select, { target: { value: "365" } })
    expect(select.value).toBe("365")

    fireEvent.change(select, { target: { value: "forever" } })
    expect(select.value).toBe("forever")
  })

  it("disables button while saving, shows Saved successfully! after 800ms, and clears confirmation after 3s", () => {
    render(<RetentionPolicyEditor />)

    const select = screen.getByRole("combobox")
    fireEvent.change(select, { target: { value: "365" } })

    const saveButton = screen.getByRole("button", { name: "Save Policy" })
    fireEvent.click(saveButton)

    // Saving state immediately disables button and updates label
    const savingButton = screen.getByRole("button", { name: "Saving..." })
    expect(savingButton).toBeDisabled()
    expect(screen.queryByText("Saved successfully!")).not.toBeInTheDocument()

    // Completing save after 800ms re-enables button and shows confirmation
    act(() => {
      jest.advanceTimersByTime(800)
    })

    expect(screen.getByRole("button", { name: "Save Policy" })).toBeEnabled()
    expect(screen.getByText("Saved successfully!")).toBeInTheDocument()

    // Confirmation badge disappears after 3000ms
    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(screen.queryByText("Saved successfully!")).not.toBeInTheDocument()
  })
})

describe("DataResidencyViewer", () => {
  it("renders data residency heading, description, region name, AWS region code, and icon", () => {
    const { container } = render(<DataResidencyViewer />)

    expect(screen.getByText("Data Residency")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Your organization's data is currently stored in the following region."
      )
    ).toBeInTheDocument()
    expect(screen.getByText("EU-West (Frankfurt)")).toBeInTheDocument()
    expect(screen.getByText("AWS eu-central-1")).toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})

describe("ComplianceStatusCard", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders compliance heading and all three compliance status items", () => {
    render(<ComplianceStatusCard />)

    expect(screen.getByText("Compliance Status")).toBeInTheDocument()

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(screen.getByText("GDPR Ready")).toBeInTheDocument()
    expect(screen.getByText("Data encrypted at rest")).toBeInTheDocument()
    expect(
      screen.getByText("Automated data retention enforcement")
    ).toBeInTheDocument()
  })

  it("triggers window.print when Download Report (PDF) is clicked", () => {
    const printSpy = jest.spyOn(window, "print").mockImplementation(() => {})

    render(<ComplianceStatusCard />)

    const downloadButton = screen.getByRole("button", {
      name: "Download Report (PDF)",
    })
    fireEvent.click(downloadButton)

    expect(printSpy).toHaveBeenCalledTimes(1)
  })
})

describe("CookieConsentBanner", () => {
  const CONSENT_KEY = "soroscan-cookie-consent"
  let storageStore: Record<string, string> = {}

  beforeEach(() => {
    storageStore = {}
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(
      (key: string) => storageStore[key] ?? null
    )
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(
      (key: string, value: string) => {
        storageStore[key] = value
      }
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders banner with Accept All and Decline Optional actions when no consent is stored", () => {
    render(<CookieConsentBanner />)

    expect(screen.getByText("Cookie Consent")).toBeInTheDocument()
    expect(
      screen.getByText(/We use strictly necessary cookies to make our site work/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Accept All" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Decline Optional" })
    ).toBeInTheDocument()
  })

  it("stores 'accepted' in localStorage, hides immediately, and stays hidden on remount", () => {
    const { unmount } = render(<CookieConsentBanner />)

    fireEvent.click(screen.getByRole("button", { name: "Accept All" }))

    expect(storageStore[CONSENT_KEY]).toBe("accepted")
    expect(screen.queryByText("Cookie Consent")).not.toBeInTheDocument()

    unmount()

    const { container } = render(<CookieConsentBanner />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText("Cookie Consent")).not.toBeInTheDocument()
  })

  it("stores 'declined' in localStorage, hides immediately, and stays hidden on remount", () => {
    const { unmount } = render(<CookieConsentBanner />)

    fireEvent.click(screen.getByRole("button", { name: "Decline Optional" }))

    expect(storageStore[CONSENT_KEY]).toBe("declined")
    expect(screen.queryByText("Cookie Consent")).not.toBeInTheDocument()

    unmount()

    const { container } = render(<CookieConsentBanner />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText("Cookie Consent")).not.toBeInTheDocument()
  })

  it("does not render when consent preference already exists in localStorage", () => {
    storageStore[CONSENT_KEY] = "accepted"

    const { container } = render(<CookieConsentBanner />)
    expect(container).toBeEmptyDOMElement()
  })
})