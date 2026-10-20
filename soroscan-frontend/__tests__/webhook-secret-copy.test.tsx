import React from "react"
import { render, screen, fireEvent, act } from "@testing-library/react"
import WebhookDetailPage from "@/app/webhooks/[id]/page"
import { showToast } from "@/context/ToastContext"

jest.mock("next/navigation", () => ({
  usePathname: () => "/webhooks/wh_001",
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({ id: "wh_001" }),
}))

jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
  MockLink.displayName = "MockLink"
  return MockLink
})

jest.mock("@/context/ToastContext", () => {
  const actual = jest.requireActual("@/context/ToastContext")
  return {
    ...actual,
    showToast: jest.fn(),
  }
})

describe("Webhook Signing Secret Copy and Reveal (Issue #1675)", () => {
  const mockWebhook = {
    id: "wh_001",
    target_url: "https://api.myapp.io/hooks/soroban",
    event_type: "SWAP_COMPLETE",
    contract_id: "CABC...9X4Z",
    is_active: true,
    status: "active",
    created_at: "2026-02-10T09:12:00Z",
    last_triggered: "2026-02-23T22:34:01Z",
    timeout_seconds: 30,
    secret: "whsec_super_secret_token_12345",
    failure_count: 0,
    total_deliveries: 42,
    success_rate: 98.7,
    last_status_code: 200,
  }

  let originalClipboard: Clipboard

  beforeEach(() => {
    jest.clearAllMocks()
    originalClipboard = navigator.clipboard
    global.fetch = jest.fn(async (url: unknown) => {
      const href = String(url)
      if (href.includes("/deliveries/")) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify([]),
        } as Response
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockWebhook),
      } as Response
    }) as jest.Mock
  })

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    })
    jest.restoreAllMocks()
  })

  it("masks the secret initially and reveals/hides when the eye button is clicked", async () => {
    render(<WebhookDetailPage />)

    // Initially secret is masked with bullets
    const expectedMasked = "•".repeat(mockWebhook.secret.length)
    expect(await screen.findByText(expectedMasked)).toBeInTheDocument()
    expect(screen.queryByText(mockWebhook.secret)).not.toBeInTheDocument()

    // Click reveal
    const revealBtn = screen.getByRole("button", { name: "Reveal secret" })
    fireEvent.click(revealBtn)

    // Revealed secret is now in document
    expect(await screen.findByText(mockWebhook.secret)).toBeInTheDocument()
    expect(screen.queryByText(expectedMasked)).not.toBeInTheDocument()

    // Click hide
    const hideBtn = screen.getByRole("button", { name: "Hide secret" })
    fireEvent.click(hideBtn)
    expect(await screen.findByText(expectedMasked)).toBeInTheDocument()
  })

  it("copies secret to clipboard and displays user feedback", async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    })

    render(<WebhookDetailPage />)

    const copyBtn = await screen.findByTestId("copy-secret-button")
    expect(copyBtn).toHaveAttribute("aria-label", "Copy secret")

    await act(async () => {
      fireEvent.click(copyBtn)
    })

    expect(writeTextMock).toHaveBeenCalledWith("whsec_super_secret_token_12345")
    expect(showToast).toHaveBeenCalledWith(
      "Webhook signing secret copied to clipboard.",
      "success",
      "COPIED",
    )

    // User feedback in UI
    expect(screen.getByText("COPIED")).toBeInTheDocument()
    expect(copyBtn).toHaveAttribute("aria-label", "Copied secret")
  })

  it("handles fallback clipboard copying when navigator.clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    })

    document.execCommand = jest.fn().mockReturnValue(true)

    render(<WebhookDetailPage />)

    const copyBtn = await screen.findByTestId("copy-secret-button")

    await act(async () => {
      fireEvent.click(copyBtn)
    })

    expect(document.execCommand).toHaveBeenCalledWith("copy")
    expect(screen.getByText("COPIED")).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith(
      "Webhook signing secret copied to clipboard.",
      "success",
      "COPIED",
    )
  })
})
