import { render, screen } from "@testing-library/react";
import { useQuery } from "@apollo/client";

import { EventRateMeter } from "../ingest/EventRateMeter";

jest.mock("@apollo/client", () => ({
  ...jest.requireActual("@apollo/client"),
  useQuery: jest.fn(),
}));

describe("EventRateMeter", () => {
  const mockContractId = "test-contract-id";
  const mockedUseQuery = useQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state when data is loading", () => {
    mockedUseQuery.mockReturnValue({
      loading: true,
      data: undefined,
      error: undefined,
    });

    render(<EventRateMeter contractId={mockContractId} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders error message when there's an error", () => {
    mockedUseQuery.mockReturnValue({
      loading: false,
      data: undefined,
      error: new Error("Failed to fetch"),
    });

    render(<EventRateMeter contractId={mockContractId} />);
    expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
  });

  it("renders contract not found when no contract data", () => {
    mockedUseQuery.mockReturnValue({
      loading: false,
      data: { contract: null },
      error: undefined,
    });

    render(<EventRateMeter contractId={mockContractId} />);
    expect(screen.getByText(/contract not found/i)).toBeInTheDocument();
  });

  it("displays the correct rate and color when rate is low", () => {
    mockedUseQuery.mockReturnValue({
      loading: false,
      data: {
        contract: {
          id: mockContractId,
          maxEventsPerMinute: 100,
          events: { totalCount: 10 },
          recentEvents: {
            edges: [
              { node: { timestamp: "2026-05-31T21:40:00Z" } },
              { node: { timestamp: "2026-05-31T21:41:00Z" } },
              { node: { timestamp: "2026-05-31T21:42:00Z" } },
            ],
          },
        },
      },
      error: undefined,
    });

    render(<EventRateMeter contractId={mockContractId} />);

    const rateText = screen.getByText("1");
    expect(rateText).toBeInTheDocument();
    expect(rateText).toHaveClass("text-terminal-green");
    expect(screen.getByText(/events\/min/)).toBeInTheDocument();
  });

  it("displays yellow color when rate is approaching limit", () => {
    const baseTime = new Date("2026-05-31T21:40:00Z").getTime();
    const edges = Array.from({ length: 10 }, (_, index) => ({
      node: { timestamp: new Date(baseTime + index * 750).toISOString() },
    }));

    mockedUseQuery.mockReturnValue({
      loading: false,
      data: {
        contract: {
          id: mockContractId,
          maxEventsPerMinute: 100,
          events: { totalCount: 10 },
          recentEvents: { edges },
        },
      },
      error: undefined,
    });

    render(<EventRateMeter contractId={mockContractId} />);

    const rateText = screen.getByText("80");
    expect(rateText).toBeInTheDocument();
    expect(rateText).toHaveClass("text-terminal-yellow");
  });
});
