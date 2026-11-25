import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TimelineView } from "@/components/ingest/TimelineView"
import { EventExplorerView } from "@/components/ingest/EventExplorerView"
import {
  fetchContract,
  fetchEventTypes,
  fetchTimeline,
  fetchExplorerEvents,
} from "@/components/ingest/graphql"
import { useContractEventSubscription } from "@/src/hooks/useContractEventSubscription"
import type {
  EventRecord,
  EventTimelineResult,
} from "@/components/ingest/types"

jest.mock("@/components/ingest/graphql", () => ({
  fetchContract: jest.fn(),
  fetchEventTypes: jest.fn(),
  fetchTimeline: jest.fn(),
  fetchExplorerEvents: jest.fn(),
}))

jest.mock("@/src/hooks/useContractEventSubscription", () => ({
  useContractEventSubscription: jest.fn(),
}))

jest.mock("@/components/ingest/ExportEventsModal", () => ({
  ExportEventsModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean
    onClose: () => void
  }) =>
    isOpen ? (
      <div data-testid="export-events-modal">
        <button type="button" onClick={onClose}>
          Close Export
        </button>
      </div>
    ) : null,
}))

const mockFetchContract = fetchContract as jest.MockedFunction<
  typeof fetchContract
>
const mockFetchEventTypes = fetchEventTypes as jest.MockedFunction<
  typeof fetchEventTypes
>
const mockFetchTimeline = fetchTimeline as jest.MockedFunction<
  typeof fetchTimeline
>
const mockFetchExplorerEvents = fetchExplorerEvents as jest.MockedFunction<
  typeof fetchExplorerEvents
>
const mockUseSubscription =
  useContractEventSubscription as jest.MockedFunction<
    typeof useContractEventSubscription
  >

const CONTRACT_ID = "CABC1234567890XYZ"

const SAMPLE_EVENTS: EventRecord[] = [
  {
    id: "evt-1",
    contractId: CONTRACT_ID,
    contractName: "Soroban DEX",
    eventType: "SWAP",
    ledger: 50120,
    eventIndex: 0,
    timestamp: "2026-06-15T10:00:00.000Z",
    txHash: "abcdef1234567890abcdef1234567890",
    payload: { tokenIn: "XLM", tokenOut: "USDC", amount: 500 },
  },
  {
    id: "evt-2",
    contractId: CONTRACT_ID,
    contractName: "Soroban DEX",
    eventType: "TRANSFER",
    ledger: 50121,
    eventIndex: 1,
    timestamp: "2026-06-15T10:15:00.000Z",
    txHash: "1234567890abcdef1234567890abcdef",
    payload: { to: "GXYZ...", amount: 250 },
  },
]

const SAMPLE_TIMELINE: EventTimelineResult = {
  contractId: CONTRACT_ID,
  bucketSize: "THIRTY_MINUTES",
  since: "2026-06-15T10:00:00.000Z",
  until: "2026-06-15T11:00:00.000Z",
  totalEvents: 2,
  groups: [
    {
      start: "2026-06-15T10:00:00.000Z",
      end: "2026-06-15T10:30:00.000Z",
      eventCount: 2,
      eventTypeCounts: [
        { eventType: "SWAP", count: 1 },
        { eventType: "TRANSFER", count: 1 },
      ],
      events: SAMPLE_EVENTS,
    },
  ],
}

describe("TimelineView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchContract.mockResolvedValue({
      contractId: CONTRACT_ID,
      name: "Soroban DEX",
    })
    mockFetchEventTypes.mockResolvedValue(["SWAP", "TRANSFER"])
    mockFetchTimeline.mockResolvedValue(SAMPLE_TIMELINE)
  })

  it("shows loading state initially and renders contract metadata, filters, and grouped timeline", async () => {
    render(<TimelineView contractId={CONTRACT_ID} />)

    expect(screen.getByText("Loading timeline...")).toBeInTheDocument()

    expect(await screen.findByText("Soroban DEX")).toBeInTheDocument()
    expect(await screen.findByText("Timeline loaded.")).toBeInTheDocument()

    expect(screen.getByLabelText("SWAP")).toBeInTheDocument()
    expect(screen.getByLabelText("TRANSFER")).toBeInTheDocument()
    expect(screen.getByText("[SWAP] 1, [TRANSFER] 1")).toBeInTheDocument()
    expect(screen.getByText("2 events")).toBeInTheDocument()
  })

  it("renders empty state when timeline returns no groups and handles missing contracts", async () => {
    mockFetchTimeline.mockResolvedValueOnce({
      ...SAMPLE_TIMELINE,
      totalEvents: 0,
      groups: [],
    })

    const { unmount } = render(<TimelineView contractId={CONTRACT_ID} />)

    expect(
      await screen.findByText(
        "No events found in the selected filter and zoom range."
      )
    ).toBeInTheDocument()

    unmount()

    mockFetchContract.mockResolvedValueOnce(null)
    mockFetchTimeline.mockResolvedValueOnce({
      ...SAMPLE_TIMELINE,
      totalEvents: 0,
      groups: [],
    })

    render(<TimelineView contractId={CONTRACT_ID} />)

    expect(
      await screen.findByText(
        "This contract does not exist in the indexed registry."
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Export Events" })
    ).toBeDisabled()
  })

  it("renders error state when timeline query fails", async () => {
    mockFetchTimeline.mockRejectedValueOnce(new Error("Timeline query failed"))

    render(<TimelineView contractId={CONTRACT_ID} />)

    expect(
      await screen.findByText("Timeline query failed")
    ).toBeInTheDocument()
    expect(screen.getByText("Timeline unavailable.")).toBeInTheDocument()
  })

  it("updates bucket size on Zoom Out / Zoom In and refetches with selected event type filters", async () => {
    render(<TimelineView contractId={CONTRACT_ID} />)

    await screen.findByText("Timeline loaded.")
    expect(mockFetchTimeline).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: CONTRACT_ID,
        bucketSize: "THIRTY_MINUTES",
        eventTypes: null,
      })
    )

    // Zoom Out -> ONE_HOUR
    fireEvent.click(screen.getByRole("button", { name: "Zoom Out" }))
    await waitFor(() => {
      expect(mockFetchTimeline).toHaveBeenLastCalledWith(
        expect.objectContaining({
          bucketSize: "ONE_HOUR",
        })
      )
    })
    expect(screen.getByText("1 hour")).toBeInTheDocument()

    // Check SWAP filter -> passes eventTypes: ["SWAP"]
    fireEvent.click(screen.getByLabelText("SWAP"))
    await waitFor(() => {
      expect(mockFetchTimeline).toHaveBeenLastCalledWith(
        expect.objectContaining({
          eventTypes: ["SWAP"],
        })
      )
    })

    // Clear Filters -> resets eventTypes: null
    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }))
    await waitFor(() => {
      expect(mockFetchTimeline).toHaveBeenLastCalledWith(
        expect.objectContaining({
          eventTypes: null,
        })
      )
    })
  })

  it("expands a timeline group to show event details and opens export modal", async () => {
    render(<TimelineView contractId={CONTRACT_ID} />)

    await screen.findByText("Timeline loaded.")

    const groupToggle = screen.getByRole("button", { name: /2 events/i })
    expect(groupToggle).toHaveAttribute("aria-expanded", "false")

    fireEvent.click(groupToggle)
    expect(groupToggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText(/ledger 50120/i)).toBeInTheDocument()
    expect(screen.getByText(/tokenIn/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Export Events" }))
    expect(screen.getByTestId("export-events-modal")).toBeInTheDocument()
  })
})

describe("EventExplorerView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSubscription.mockReturnValue({
      connectionState: "connected",
      events: [],
      error: null,
      reconnect: jest.fn(),
    } as unknown as ReturnType<typeof useContractEventSubscription>)
    mockFetchContract.mockResolvedValue({
      contractId: CONTRACT_ID,
      name: "Soroban DEX",
    })
    mockFetchEventTypes.mockResolvedValue(["SWAP", "TRANSFER"])
    mockFetchExplorerEvents.mockResolvedValue(SAMPLE_EVENTS)
  })

  it("shows loading state initially and renders populated events table", async () => {
    render(<EventExplorerView contractId={CONTRACT_ID} />)

    expect(screen.getByText("Loading events...")).toBeInTheDocument()

    expect(await screen.findByText("Soroban DEX")).toBeInTheDocument()
    expect(await screen.findByText("Events loaded.")).toBeInTheDocument()
    expect(
      screen.getByText("Showing 2 event(s) on page 1.")
    ).toBeInTheDocument()
    expect(screen.getByText("50120")).toBeInTheDocument()
    expect(screen.getByText("50121")).toBeInTheDocument()
  })

  it("renders empty state when no events match and handles missing contract", async () => {
    mockFetchExplorerEvents.mockResolvedValueOnce([])

    const { unmount } = render(<EventExplorerView contractId={CONTRACT_ID} />)

    expect(
      await screen.findByText("No events found for this filter selection.")
    ).toBeInTheDocument()

    unmount()

    mockFetchContract.mockResolvedValueOnce(null)
    render(<EventExplorerView contractId={CONTRACT_ID} />)

    expect(
      await screen.findByText(
        "This contract does not exist in the indexed registry."
      )
    ).toBeInTheDocument()
    expect(screen.getByTestId("export-btn")).toBeDisabled()
  })

  it("renders load error when fetchExplorerEvents rejects and validates invalid date ranges", async () => {
    mockFetchExplorerEvents.mockRejectedValueOnce(
      new Error("Explorer backend unreachable")
    )

    render(<EventExplorerView contractId={CONTRACT_ID} />)

    expect(
      await screen.findByText("Explorer backend unreachable")
    ).toBeInTheDocument()

    // Invalid date range (From > To) shows validation error without querying
    const callCountBeforeValidation = mockFetchExplorerEvents.mock.calls.length
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-06-20T10:00" },
    })
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-06-10T10:00" },
    })
    fireEvent.click(screen.getByTestId("apply-filters"))

    expect(
      mockFetchExplorerEvents.mock.calls.length
    ).toBe(callCountBeforeValidation)
  })

  it("applies and clears event type and date filters", async () => {
    render(<EventExplorerView contractId={CONTRACT_ID} />)

    await screen.findByText("Events loaded.")

    fireEvent.change(screen.getByTestId("event-type-filter"), {
      target: { value: "SWAP" },
    })
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-06-15T00:00" },
    })
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2026-06-16T00:00" },
    })

    fireEvent.click(screen.getByTestId("apply-filters"))

    await waitFor(() => {
      expect(mockFetchExplorerEvents).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contractId: CONTRACT_ID,
          eventType: "SWAP",
          offset: 0,
          limit: 51,
          since: expect.any(String),
          until: expect.any(String),
        })
      )
    })

    fireEvent.click(screen.getByTestId("clear-filters"))

    await waitFor(() => {
      expect(mockFetchExplorerEvents).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contractId: CONTRACT_ID,
          eventType: null,
          offset: 0,
          limit: 51,
          since: null,
          until: null,
        })
      )
    })
  })

  it("paginates forward and backward when more than PAGE_SIZE (50) events exist", async () => {
    const fiftyOneEvents: EventRecord[] = Array.from({ length: 51 }, (_, i) => ({
      ...SAMPLE_EVENTS[0],
      id: `evt-${i + 1}`,
      ledger: 60000 + i,
    }))

    mockFetchExplorerEvents.mockResolvedValueOnce(fiftyOneEvents)

    render(<EventExplorerView contractId={CONTRACT_ID} />)

    expect(
      await screen.findByText("Showing 50 event(s) on page 1.")
    ).toBeInTheDocument()

    const prevButton = screen.getByRole("button", { name: "Previous" })
    const nextButton = screen.getByRole("button", { name: "Next" })
    expect(prevButton).toBeDisabled()
    expect(nextButton).toBeEnabled()

    // Navigate to Page 2
    mockFetchExplorerEvents.mockResolvedValueOnce(SAMPLE_EVENTS)
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(mockFetchExplorerEvents).toHaveBeenLastCalledWith(
        expect.objectContaining({
          offset: 50,
          limit: 51,
        })
      )
    })
    expect(await screen.findByText("Page 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled()

    // Navigate back to Page 1
    mockFetchExplorerEvents.mockResolvedValueOnce(fiftyOneEvents)
    fireEvent.click(screen.getByRole("button", { name: "Previous" }))

    await waitFor(() => {
      expect(mockFetchExplorerEvents).toHaveBeenLastCalledWith(
        expect.objectContaining({
          offset: 0,
          limit: 51,
        })
      )
    })
    expect(await screen.findByText("Page 1")).toBeInTheDocument()
  })
})