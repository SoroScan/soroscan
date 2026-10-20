import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import SettingsShell from "../../SettingsShell"

const mockReplace = jest.fn()
let currentQuery = ""

jest.mock("next/navigation", () => ({
  usePathname: () => "/settings",
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(currentQuery),
}))

// Mock sub-components to test Shell tab orchestration cleanly
jest.mock("../../components/AccountSettings", () => function MockAccountSettings() {
  return <div data-testid="account-panel">AccountPanel</div>
})
jest.mock("../../components/ThemeSelector", () => function MockThemeSelector() {
  return <div data-testid="theme-panel">ThemePanel</div>
})
jest.mock("../../components/NotificationPrefs", () => function MockNotificationPrefs() {
  return <div data-testid="notifications-panel">NotificationsPanel</div>
})
jest.mock("../../components/APIKeyManager", () => function MockAPIKeyManager() {
  return <div data-testid="apiKeys-panel">APIKeysPanel</div>
})
jest.mock("../../components/WebhookManager", () => function MockWebhookManager() {
  return <div data-testid="webhooks-panel">WebhooksPanel</div>
})
jest.mock("../../components/BillingOverview", () => function MockBillingOverview() {
  return <div data-testid="billing-panel">BillingPanel</div>
})
jest.mock("../../components/ComplianceSettings", () => function MockComplianceSettings() {
  return <div data-testid="compliance-panel">CompliancePanel</div>
})

describe("SettingsShell", () => {
  beforeEach(() => {
    mockReplace.mockClear()
    currentQuery = ""
  })

  it("renders settings header and navigation tabs", () => {
    render(<SettingsShell />)

    expect(screen.getByText(/◆ SETTINGS/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Theme" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "API Keys" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Webhooks" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Billing" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Compliance" })).toBeInTheDocument()

    // Default tab is account
    expect(screen.getByTestId("account-panel")).toBeInTheDocument()
  })

  it("navigates to another tab and replaces URL query param", () => {
    render(<SettingsShell />)

    const themeTab = screen.getByRole("button", { name: "Theme" })
    fireEvent.click(themeTab)

    expect(mockReplace).toHaveBeenCalledWith("/settings?tab=theme")
  })

  it("renders active panel based on URL search params", () => {
    currentQuery = "tab=notifications"
    render(<SettingsShell />)

    expect(screen.getByTestId("notifications-panel")).toBeInTheDocument()
    expect(screen.queryByTestId("account-panel")).not.toBeInTheDocument()
  })
})
