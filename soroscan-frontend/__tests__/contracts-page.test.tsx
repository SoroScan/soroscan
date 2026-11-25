import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContractsPage from "@/app/contracts/page";
import {
  deleteContract,
  listContracts,
  registerContract,
} from "@/components/ingest/contract-graphql";
import type { Contract } from "@/components/ingest/contract-types";

jest.mock("next/navigation", () => ({
  usePathname: () => "/contracts",
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/ingest/contract-graphql", () => ({
  listContracts: jest.fn(),
  registerContract: jest.fn(),
  deleteContract: jest.fn(),
}));

const mockListContracts = listContracts as jest.Mock;
const mockRegisterContract = registerContract as jest.Mock;
const mockDeleteContract = deleteContract as jest.Mock;

const CONTRACTS: Contract[] = [
  {
    id: "contract-1",
    contractId: "CAAA111",
    name: "Token One",
    description: "First token",
    status: "active",
    eventCount: 7,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
    verificationStatus: "verified",
  },
  {
    id: "contract-2",
    contractId: "CBBB222",
    name: "Token Two",
    description: "Second token",
    status: "inactive",
    eventCount: 3,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-03T00:00:00Z",
    verificationStatus: "pending",
  },
];

describe("ContractsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListContracts.mockResolvedValue(CONTRACTS);
    mockRegisterContract.mockResolvedValue(CONTRACTS[0]);
    mockDeleteContract.mockResolvedValue(undefined);
    jest.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders the loading skeleton until the contract list resolves", async () => {
    let resolveList: (value: Contract[]) => void = () => undefined;
    mockListContracts.mockImplementation(
      () => new Promise<Contract[]>((resolve) => { resolveList = resolve; }),
    );

    render(<ContractsPage />);

    expect(screen.getByText("Loading contracts…")).toBeInTheDocument();
    expect(screen.queryByText("Token One")).not.toBeInTheDocument();

    await act(async () => { resolveList(CONTRACTS); });

    expect(screen.getAllByText("Token One").length).toBeGreaterThan(0);
    expect(screen.queryByText("Loading contracts…")).not.toBeInTheDocument();
  });

  it("renders loaded contracts, summary metrics and row actions", async () => {
    render(<ContractsPage />);

    expect(await screen.findAllByText("Token One")).toHaveLength(2);
    expect(screen.getAllByText("Token Two")).toHaveLength(2);
    expect(screen.getByText("Total Contracts")).toBeInTheDocument();
    expect(screen.getByText("Total Events")).toBeInTheDocument();
    expect(screen.getAllByTitle("Trigger data backfill")).toHaveLength(2);
    expect(screen.getAllByTitle("Delete contract")).toHaveLength(2);
    expect(mockListContracts).toHaveBeenCalledTimes(1);
  });

  it("renders the empty state when no contracts are returned", async () => {
    mockListContracts.mockResolvedValue([]);

    render(<ContractsPage />);

    expect(await screen.findByText("No contracts. Register one to start.")).toBeInTheDocument();
    expect(screen.queryByText("Total Contracts")).not.toBeInTheDocument();
  });

  it("shows the fallback load error for a non-Error rejection", async () => {
    mockListContracts.mockRejectedValue("offline");

    render(<ContractsPage />);

    expect(await screen.findByText("Failed to load contracts")).toBeInTheDocument();
  });

  it("shows the thrown error message when loading fails", async () => {
    mockListContracts.mockRejectedValue(new Error("GraphQL unavailable"));

    render(<ContractsPage />);

    expect(await screen.findByText("GraphQL unavailable")).toBeInTheDocument();
  });

  it("registers a contract and reloads the list", async () => {
    render(<ContractsPage />);
    await screen.findAllByText("Token One");

    fireEvent.click(screen.getByTestId("register-contract-btn"));
    fireEvent.change(screen.getByTestId("contract-id-input"), {
      target: { value: "CCCC333" },
    });
    fireEvent.change(screen.getByTestId("contract-name-input"), {
      target: { value: "Token Three" },
    });
    fireEvent.click(screen.getByTestId("register-submit-btn"));

    await waitFor(() => {
      expect(mockRegisterContract).toHaveBeenCalledWith(
        expect.objectContaining({ contractId: "CCCC333", name: "Token Three" }),
      );
    });
    expect(mockListContracts).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.queryByTestId("contract-id-input")).not.toBeInTheDocument();
    });
  });

  it("cancels delete without calling the API", async () => {
    render(<ContractsPage />);
    await screen.findAllByText("Token One");

    fireEvent.click(screen.getAllByTitle("Delete contract")[0]);
    expect(screen.getByText(/Are you sure you want to delete contract "Token One"/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /CANCEL/i }));

    expect(mockDeleteContract).not.toHaveBeenCalled();
    expect(screen.queryByTestId("confirm-delete-btn")).not.toBeInTheDocument();
  });

  it("deletes the selected contract after confirmation and reloads the list", async () => {
    render(<ContractsPage />);
    await screen.findAllByText("Token One");

    fireEvent.click(screen.getAllByTitle("Delete contract")[0]);
    fireEvent.click(screen.getByTestId("confirm-delete-btn"));

    await waitFor(() => {
      expect(mockDeleteContract).toHaveBeenCalledWith("contract-1");
    });
    expect(mockListContracts).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.queryByTestId("confirm-delete-btn")).not.toBeInTheDocument();
    });
  });

  it("shows the fallback delete error for a non-Error rejection", async () => {
    mockDeleteContract.mockRejectedValue("denied");

    render(<ContractsPage />);
    await screen.findAllByText("Token One");
    fireEvent.click(screen.getAllByTitle("Delete contract")[0]);
    fireEvent.click(screen.getByTestId("confirm-delete-btn"));

    expect(await screen.findByText("Failed to delete contract")).toBeInTheDocument();
  });

  it("starts a backfill and notifies the user", async () => {
    render(<ContractsPage />);
    await screen.findAllByText("Token One");
    jest.useFakeTimers();

    fireEvent.click(screen.getAllByTitle("Trigger data backfill")[0]);
    expect(screen.getAllByTitle("Trigger data backfill")[0]).toBeDisabled();

    await act(async () => { jest.advanceTimersByTime(1500); });

    expect(window.alert).toHaveBeenCalledWith(
      expect.stringContaining("Backfill started for contract contract-1"),
    );
    expect(screen.getAllByTitle("Trigger data backfill")[0]).not.toBeDisabled();
  });

  it("shows an error when starting a backfill fails", async () => {
    render(<ContractsPage />);
    await screen.findAllByText("Token One");

    const realSetTimeout = global.setTimeout;
    const timeoutSpy = jest.spyOn(global, "setTimeout").mockImplementation(
      ((callback: () => void, ms?: number) => {
        if (ms === 1500) throw { reason: "boom" };
        return realSetTimeout(callback, ms);
      }) as typeof setTimeout,
    );

    fireEvent.click(screen.getAllByTitle("Trigger data backfill")[0]);
    timeoutSpy.mockRestore();

    expect(await screen.findByText("Failed to start backfill")).toBeInTheDocument();
  });
});
