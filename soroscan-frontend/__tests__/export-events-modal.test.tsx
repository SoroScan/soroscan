import { fireEvent, render, screen } from "@testing-library/react";

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
});
