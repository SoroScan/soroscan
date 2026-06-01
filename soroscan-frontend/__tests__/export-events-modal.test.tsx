import { fireEvent, render, screen } from "@testing-library/react";

import { fetchEventsForExport } from "@/components/ingest/graphql";
import { ExportEventsModal } from "@/components/ingest/ExportEventsModal";

jest.mock("@/components/ingest/graphql", () => ({
  fetchEventsForExport: jest.fn(),
}));

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  contractId: "contract-123",
  initialFilters: {
    eventTypes: [],
    since: null,
    until: null,
  },
  onStatus: jest.fn(),
};

describe("ExportEventsModal", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it("shows CSV, JSON, and Parquet format radio options", () => {
    render(<ExportEventsModal {...defaultProps} />);

    expect(screen.getByRole("radio", { name: "CSV" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "JSON" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Parquet" })).toBeInTheDocument();
  });

  it("defaults to CSV when no export format is persisted", () => {
    render(<ExportEventsModal {...defaultProps} />);

    expect(screen.getByRole("radio", { name: "CSV" })).toBeChecked();
  });

  it("persists the selected export format", () => {
    render(<ExportEventsModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("radio", { name: "JSON" }));

    expect(screen.getByRole("radio", { name: "JSON" })).toBeChecked();
    expect(window.localStorage.getItem("soroscan-export-format")).toBe("json");
  });

  it("loads the persisted export format when the modal opens", () => {
    window.localStorage.setItem("soroscan-export-format", "parquet");

    render(<ExportEventsModal {...defaultProps} />);

    expect(screen.getByRole("radio", { name: "Parquet" })).toBeChecked();
  });

  it("generates a preview and enables download after previewing export data", async () => {
    const mockedFetch = fetchEventsForExport as jest.MockedFunction<
      typeof fetchEventsForExport
    >;

    mockedFetch.mockResolvedValueOnce([
      {
        id: "event-1",
        contractId: "contract-123",
        contractName: "Contract Name",
        eventType: "TRANSFER",
        ledger: 42,
        eventIndex: 1,
        timestamp: "2024-01-01T00:00:00Z",
        txHash: "abcdef0123456789",
        payload: { value: 100 },
      },
    ] as unknown as import("@/components/ingest/types").EventRecord[]);

    render(<ExportEventsModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /Generate preview/i }));

    expect(
      await screen.findByText(/Estimated preview size:/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download/i })).toBeEnabled();
    expect(screen.getByRole("columnheader", { name: /Contract/i })).toBeInTheDocument();
    expect(screen.getByText("contract-123")).toBeInTheDocument();
  });
});
