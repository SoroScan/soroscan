import { act, render, screen, waitFor } from "@testing-library/react";
import { authenticatedFetch } from "@/lib/auth";
import CostAnalysisPage from "@/app/cost-analysis/page";

jest.mock("@/lib/auth", () => ({
  authenticatedFetch: jest.fn(),
}));

const mockAuthenticatedFetch = jest.mocked(authenticatedFetch);

function apiResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

const snapshot = {
  organization_id: 1,
  organization_name: "Example Org",
  month: "2026-11-01",
  actual_cost_usd: "12.5000",
  projected_monthly_cost_usd: "15.0000",
  budget: {
    monthly_budget_usd: "100.0000",
    is_active: true,
  },
  breakdown: {
    contracts: {
      CABC123: { estimated_cost_usd: "10.0000" },
      CDEF456: { estimated_cost_usd: "2.5000" },
    },
    event_types: {
      swap: 10,
      transfer: 5,
    },
    storage: { bytes: 100 },
  },
};

describe("CostAnalysisPage", () => {
  beforeEach(() => {
    mockAuthenticatedFetch.mockReset();
  });

  it("shows a loading state while the cost API request is pending", () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}));

    render(<CostAnalysisPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading organization costs");
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("renders API costs, contracts, operation counts, and budget data", async () => {
    mockAuthenticatedFetch.mockResolvedValue(apiResponse({ results: [snapshot] }));

    render(<CostAnalysisPage />);

    expect(await screen.findByText("$12.50")).toBeInTheDocument();
    expect(screen.getByText("$15.00")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("CABC123")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
    expect(screen.getByText("swap")).toBeInTheDocument();
    expect(screen.getByText("10 events")).toBeInTheDocument();
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/ingest\/admin\/organization-costs\/\?month=\d{4}-\d{2}$/),
      { cache: "no-store" },
    );
  });

  it("explains that staff access is required when the API returns 403", async () => {
    mockAuthenticatedFetch.mockResolvedValue(apiResponse({ error: "Admin access required" }, 403));

    render(<CostAnalysisPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Staff access is required to view organization cost analysis.",
    );
  });

  it("shows an API error and retry action for other failed responses", async () => {
    mockAuthenticatedFetch.mockResolvedValue(apiResponse({}, 500));

    render(<CostAnalysisPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load organization costs (HTTP 500).",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows an empty state when the API has no snapshots for the month", async () => {
    mockAuthenticatedFetch.mockResolvedValue(apiResponse({ results: [] }));

    render(<CostAnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText(/No organization cost snapshots are available/)).toBeInTheDocument();
    });
  });

  it("settles the loading state after a pending request completes", async () => {
    let resolveRequest!: (response: Response) => void;
    mockAuthenticatedFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(<CostAnalysisPage />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    await act(async () => {
      resolveRequest(apiResponse({ results: [] }));
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(await screen.findByText(/No organization cost snapshots are available/)).toBeInTheDocument();
  });
});
