import { fireEvent, render, screen } from "@testing-library/react";
import { authenticatedFetch } from "@/lib/auth";
import ContractUpgradeTimelinePage from "@/app/contract-upgrades/page";

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

const timelineResponse = {
  contract_id: "CABC123",
  deployments: [
    {
      id: 8,
      bytecode_hash: "hash-v1",
      ledger_deployed: 100,
      deployer_address: "GDEPLOYER",
      is_upgrade: false,
      tx_hash: "tx-v1",
      notes: "Initial deployment",
      detected_at: "2026-11-01T10:00:00Z",
    },
    {
      id: 9,
      bytecode_hash: "hash-v2",
      ledger_deployed: 200,
      deployer_address: "GUPGRADER",
      is_upgrade: true,
      tx_hash: "tx-v2",
      notes: "",
      detected_at: "2026-11-10T10:00:00Z",
    },
  ],
  abi_versions: [
    {
      id: 1,
      version_number: 1,
      valid_from_ledger: 100,
      valid_to_ledger: 199,
      has_breaking_changes: false,
      breaking_change_details: "",
      created_at: "2026-11-01T10:00:00Z",
    },
    {
      id: 2,
      version_number: 2,
      valid_from_ledger: 200,
      valid_to_ledger: null,
      has_breaking_changes: true,
      breaking_change_details: "Removed a required field",
      created_at: "2026-11-10T10:00:00Z",
    },
  ],
  compatibility_warnings: [
    {
      abi_version: 2,
      ledger: 200,
      detail: "Removed a required field",
    },
  ],
};

describe("ContractUpgradeTimelinePage", () => {
  beforeEach(() => {
    mockAuthenticatedFetch.mockReset();
    window.history.replaceState({}, "", "/contract-upgrades");
  });

  it("shows loading while fetching a contract selected by the query parameter", async () => {
    window.history.replaceState({}, "", "/contract-upgrades?contract_id=CABC123");
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {}));

    render(<ContractUpgradeTimelinePage />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Loading contract deployment history",
    );
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ingest/contracts/CABC123/deployments/"),
      { cache: "no-store" },
    );
  });

  it("loads deployment history and highlights breaking ABI changes", async () => {
    mockAuthenticatedFetch.mockResolvedValue(apiResponse(timelineResponse));

    render(<ContractUpgradeTimelinePage />);
    fireEvent.change(screen.getByRole("textbox", { name: "Contract ID" }), {
      target: { value: "CABC123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load timeline" }));

    expect(await screen.findByText("Breaking ABI changes detected")).toBeInTheDocument();
    expect(screen.getByText("Removed a required field")).toBeInTheDocument();
    expect(screen.getByText("upgraded")).toBeInTheDocument();
    expect(screen.getByText("Version: v2")).toBeInTheDocument();
    expect(screen.getByText("BREAKING ABI CHANGE: Removed a required field")).toBeInTheDocument();
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ingest/contracts/CABC123/deployments/"),
      { cache: "no-store" },
    );
  });

  it("shows a clear not-found message for an unknown contract", async () => {
    window.history.replaceState({}, "", "/contract-upgrades?contract_id=CNOTFOUND");
    mockAuthenticatedFetch.mockResolvedValue(apiResponse({}, 404));

    render(<ContractUpgradeTimelinePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Contract not found: CNOTFOUND");
  });

  it("shows an API error for other failed responses", async () => {
    window.history.replaceState({}, "", "/contract-upgrades?contract_id=CABC123");
    mockAuthenticatedFetch.mockResolvedValue(apiResponse({}, 500));

    render(<ContractUpgradeTimelinePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to load deployment history (HTTP 500).",
    );
  });

  it("shows an empty state when the contract has no deployments", async () => {
    window.history.replaceState({}, "", "/contract-upgrades?contract_id=CABC123");
    mockAuthenticatedFetch.mockResolvedValue(
      apiResponse({
        contract_id: "CABC123",
        deployments: [],
        abi_versions: [],
        compatibility_warnings: [],
      }),
    );

    render(<ContractUpgradeTimelinePage />);

    expect(await screen.findByTestId("upgrade-empty-state")).toHaveTextContent(
      "No deployments found for contract CABC123.",
    );
  });
});
