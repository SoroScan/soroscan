import * as React from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import WebhooksPage from "../page"
import { authenticatedFetch } from "@/lib/auth"

const showToast = jest.fn()

jest.mock("@/lib/auth", () => ({
  authenticatedFetch: jest.fn(),
}))

jest.mock("@/components/terminal/Modal", () => ({
  Modal: ({
    isOpen,
    onClose,
    title,
    children,
  }: {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
  }) =>
    isOpen ? (
      <div data-testid="modal" aria-label={title ?? ""}>
        <button onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
}))

jest.mock("@/context/ToastContext", () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock("../components/CreateWebhookModal", () => ({
  CreateWebhookModal: ({
    onCreate,
  }: {
    onCreate: (input: Record<string, unknown>) => Promise<unknown>
  }) => (
    <div data-testid="create-webhook-modal">
      <button
        data-testid="mock-create-submit"
        onClick={() => {
          void onCreate({
            url: "https://example.com/hooks/soroban",
            eventTypes: ["ALL"],
            status: "ACTIVE",
            isActive: true,
            timeoutSeconds: 30,
          })
        }}
      >
        SUBMIT_CREATE
      </button>
    </div>
  ),
}))

const mockAuthenticatedFetch = authenticatedFetch as jest.Mock
const API_BASE = "http://localhost:8000"
const WEBHOOKS_URL = `${API_BASE}/api/ingest/webhooks/`

function respond(body: unknown, status = 200): Response {
  const bodyString = typeof body === "string" ? body : JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => bodyString,
  } as unknown as Response
}

const listResponse = [
  {
    id: 1,
    target_url: "https://api.myapp.io/hooks/soroban",
    event_type: "SWAP_COMPLETE",
    is_active: true,
    status: "ACTIVE",
  },
  {
    id: 2,
    target_url: "https://webhook.site/abc",
    event_type: "",
    is_active: false,
    status: "SUSPENDED",
  },
]

const createdResponse = {
  id: 3,
  target_url: "https://example.com/hooks/soroban",
  event_type: "",
  is_active: true,
  status: "ACTIVE",
  secret: "whsec_live1234567890abcdef",
}

let createFails = false
let deleteFails = false
let testFails = false

beforeEach(() => {
  jest.clearAllMocks()
  showToast.mockClear()
  createFails = false
  deleteFails = false
  testFails = false
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  })

  mockAuthenticatedFetch.mockImplementation(async (input: string, init: RequestInit = {}) => {
    const url = String(input)
    const method = (init.method ?? "GET").toUpperCase()
    if (url === WEBHOOKS_URL && method === "GET") return respond(listResponse)
    if (url === WEBHOOKS_URL && method === "POST") {
      if (createFails) return respond({ detail: "target_url: invalid URL" }, 400)
      return respond(createdResponse, 201)
    }
    if (method === "DELETE") {
      if (deleteFails) return respond({ detail: "delete failed" }, 500)
      return respond(null, 204)
    }
    if (url.endsWith("/test/") && method === "POST") {
      if (testFails) return respond({ detail: "test failed" }, 500)
      return respond({ status: "test_webhook_queued" }, 200)
    }
    return respond({ detail: "Not found" }, 404)
  })
})

describe("WebhooksPage", () => {
  it("shows a loading state while fetching, then renders the list", async () => {
    render(<WebhooksPage />)
    expect(screen.getByText("LOADING_WEBHOOKS")).toBeInTheDocument()

    await waitFor(() =>
      expect(screen.getAllByText("https://api.myapp.io/hooks/soroban")).toHaveLength(2)
    )
    expect(screen.getByText("2 subscriptions configured")).toBeInTheDocument()
    expect(screen.getAllByText("https://webhook.site/abc")).toHaveLength(2)
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(WEBHOOKS_URL, { cache: "no-store" })
  })

  it("renders the empty state when there are no webhooks", async () => {
    mockAuthenticatedFetch.mockImplementation(async () => respond([], 200))
    render(<WebhooksPage />)
    await waitFor(() => expect(screen.getByText("No webhooks configured")).toBeInTheDocument())
    expect(screen.queryByText("https://api.myapp.io/hooks/soroban")).not.toBeInTheDocument()
  })

  it("shows an error state with a retry button when the list fails", async () => {
    mockAuthenticatedFetch.mockImplementationOnce(async () => respond({ detail: "Service unavailable" }, 500))
    render(<WebhooksPage />)
    await waitFor(() => expect(screen.getByText(/Service unavailable/)).toBeInTheDocument())
    expect(screen.getByTestId("retry-webhooks-btn")).toBeInTheDocument()

    mockAuthenticatedFetch.mockImplementation(async () => respond(listResponse, 200))
    await act(async () => {
      fireEvent.click(screen.getByTestId("retry-webhooks-btn"))
    })
    await waitFor(() =>
      expect(screen.getAllByText("https://api.myapp.io/hooks/soroban")).toHaveLength(2)
    )
  })

  it("creates a webhook via the API and reflects it in the list", async () => {
    render(<WebhooksPage />)
    await waitFor(() =>
      expect(screen.getAllByText("https://api.myapp.io/hooks/soroban")).toHaveLength(2)
    )

    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-create-submit"))
    })

    await waitFor(() =>
      expect(screen.getAllByText("https://example.com/hooks/soroban")).toHaveLength(2)
    )
    expect(screen.getByText("whsec_live1234567890abcdef")).toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith("Webhook created.", "success", "WEBHOOK_CREATED")
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      WEBHOOKS_URL,
      expect.objectContaining({ method: "POST" })
    )
  })

  it("shows the signing secret only when the create response returns it", async () => {
    mockAuthenticatedFetch.mockImplementation(async (input: string, init: RequestInit = {}) => {
      const url = String(input)
      const method = (init.method ?? "GET").toUpperCase()
      if (url === WEBHOOKS_URL && method === "GET") return respond(listResponse, 200)
      if (url === WEBHOOKS_URL && method === "POST")
        return respond({ id: 4, target_url: "https://no-secret.example/hooks", is_active: true }, 201)
      return respond({ detail: "Not found" }, 404)
    })
    render(<WebhooksPage />)
    await waitFor(() =>
      expect(screen.getByText("https://api.myapp.io/hooks/soroban")).toBeInTheDocument()
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-create-submit"))
    })
    await waitFor(() =>
      expect(screen.getAllByText("https://no-secret.example/hooks")).toHaveLength(2)
    )
    expect(screen.queryByText(/whsec_/)).not.toBeInTheDocument()
    expect(showToast).toHaveBeenCalledWith("Webhook created.", "success", "WEBHOOK_CREATED")
  })

  it("surfaces create errors without adding a row", async () => {
    createFails = true
    render(<WebhooksPage />)
    await waitFor(() =>
      expect(screen.getAllByText("https://api.myapp.io/hooks/soroban")).toHaveLength(2)
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-create-submit"))
    })
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("target_url: invalid URL", "error", "WEBHOOK_CREATE_ERROR")
    )
    expect(screen.queryAllByText("https://example.com/hooks/soroban")).toHaveLength(0)
  })

  it("deletes a webhook via the API and removes it from the list", async () => {
    render(<WebhooksPage />)
    await waitFor(() =>
      expect(screen.getAllByText("https://api.myapp.io/hooks/soroban")).toHaveLength(2)
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-webhook-1"))
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-delete-webhook-btn"))
    })
    await waitFor(() =>
      expect(screen.queryAllByText("https://api.myapp.io/hooks/soroban")).toHaveLength(0)
    )
    expect(screen.getAllByText("https://webhook.site/abc")).toHaveLength(2)
    expect(showToast).toHaveBeenCalledWith("Subscription removed.", "success", "WEBHOOK_DELETED")
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/ingest/webhooks/1/`,
      expect.objectContaining({ method: "DELETE" })
    )
  })

  it("surfaces delete errors and keeps the row", async () => {
    deleteFails = true
    render(<WebhooksPage />)
    await waitFor(() =>
      expect(screen.getByText("https://api.myapp.io/hooks/soroban")).toBeInTheDocument()
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-webhook-1"))
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-delete-webhook-btn"))
    })
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("delete failed", "error", "WEBHOOK_DELETE_ERROR")
    )
    expect(screen.getAllByText("https://api.myapp.io/hooks/soroban")).toHaveLength(2)
  })

  it("tests a webhook via the API and shows the result", async () => {
    render(<WebhooksPage />)
    await waitFor(() =>
      expect(screen.getAllByText("https://api.myapp.io/hooks/soroban")).toHaveLength(2)
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId("test-webhook-1"))
    })
    await waitFor(() =>
      expect(screen.getAllByText("✓ TEST_OK (200)")).toHaveLength(2)
    )
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/ingest/webhooks/1/test/`,
      expect.objectContaining({ method: "POST" })
    )
  })

  it("shows a failed test result when the test endpoint errors", async () => {
    testFails = true
    render(<WebhooksPage />)
    await waitFor(() =>
      expect(screen.getByText("https://api.myapp.io/hooks/soroban")).toBeInTheDocument()
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId("test-webhook-1"))
    })
    await waitFor(() =>
      expect(screen.getAllByText("✗ TEST_FAILED (500)")).toHaveLength(2)
    )
  })

  it("copies the signing secret when the copy button is clicked", async () => {
    render(<WebhooksPage />)
    await waitFor(() =>
      expect(screen.getAllByText("https://api.myapp.io/hooks/soroban")).toHaveLength(2)
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-create-submit"))
    })
    await waitFor(() =>
      expect(screen.getByText("whsec_live1234567890abcdef")).toBeInTheDocument()
    )
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "COPY" }))
    })
    expect(showToast).toHaveBeenCalledWith("Signing secret copied.", "success")
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("whsec_live1234567890abcdef")
  })
})
