import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import DedupConfigPage from "@/app/admin/dedup/page";
import { getAccessToken } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  getAccessToken: jest.fn(() => "test-token"),
}));

const mockGetAccessToken = getAccessToken as jest.Mock;
const API_BASE = "http://localhost:8000";

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response;
}

describe("DedupConfigPage", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessToken.mockReturnValue("test-token");
    fetchMock = jest.fn().mockResolvedValue(jsonResponse({ enabled: true, fields: [] }));
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(global, "fetch");
  });

  it("renders default configuration, empty duplicate state and makes no request", () => {
    render(<DedupConfigPage />);

    expect(screen.getByRole("heading", { name: "Event Deduplication" })).toBeInTheDocument();
    expect(screen.getByTestId("dedup-contract-id")).toHaveValue("");
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByText("Selected: event_type, tx_hash")).toBeInTheDocument();
    expect(screen.getByText("No duplicate records")).toBeInTheDocument();
    expect(screen.queryByTestId("dedup-loading")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads configuration with an authenticated GET request", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ enabled: false, fields: ["ledger", "amount"] }),
    );

    render(<DedupConfigPage />);
    fireEvent.change(screen.getByTestId("dedup-contract-id"), {
      target: { value: " CTEST123 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE}/api/ingest/contracts/CTEST123/dedup-config/`,
        expect.anything(),
      );
    });
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(requestInit.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(await screen.findByText("Loaded dedup configuration")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText("Selected: ledger, amount")).toBeInTheDocument();
  });

  it("shows a loading state while configuration is being fetched", async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    fetchMock.mockImplementation(
      () => new Promise<Response>((resolve) => { resolveRequest = resolve; }),
    );

    render(<DedupConfigPage />);
    fireEvent.change(screen.getByTestId("dedup-contract-id"), {
      target: { value: "CTEST123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load" }));

    expect(screen.getByTestId("dedup-save")).toBeDisabled();
    expect(screen.getByText("Load")).toHaveTextContent("Load");

    await act(async () => { resolveRequest(jsonResponse({ enabled: true, fields: [] })); });

    expect(screen.getByTestId("dedup-save")).not.toBeDisabled();
  });

  it("shows the API detail when loading configuration fails", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: "Failed to load config" }, 404),
    );

    render(<DedupConfigPage />);
    fireEvent.change(screen.getByTestId("dedup-contract-id"), {
      target: { value: "CTEST123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Load" }));

    expect(await screen.findByText("Failed to load config")).toBeInTheDocument();
  });

  it("saves the edited configuration with a PUT request and the selected fields", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ enabled: false, fields: ["tx_hash", "ledger"] }),
    );

    render(<DedupConfigPage />);
    fireEvent.change(screen.getByTestId("dedup-contract-id"), {
      target: { value: "CTEST123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "event_type" }));
    fireEvent.click(screen.getByRole("button", { name: "ledger" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByTestId("dedup-save"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE}/api/ingest/contracts/CTEST123/dedup-config/`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ enabled: false, fields: ["tx_hash", "ledger"] }),
        }),
      );
    });
    expect(await screen.findByText("Saved dedup configuration")).toBeInTheDocument();
  });

  it("shows the fallback error when saving fails", async () => {
    fetchMock.mockRejectedValue({ reason: "boom" });

    render(<DedupConfigPage />);
    fireEvent.change(screen.getByTestId("dedup-contract-id"), {
      target: { value: "CTEST123" },
    });
    fireEvent.click(screen.getByTestId("dedup-save"));

    expect(await screen.findByText("Failed to save config")).toBeInTheDocument();
  });

  it("posts a parsed payload to the dedup test endpoint and displays the result", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ duplicate: true }));

    render(<DedupConfigPage />);
    fireEvent.change(screen.getByTestId("dedup-contract-id"), {
      target: { value: "CTEST123" },
    });
    fireEvent.click(screen.getByTestId("dedup-test-run"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE}/api/ingest/contracts/CTEST123/dedup-test/`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            event_type: "transfer",
            ledger: 100,
            tx_hash: "abc",
            payload: { amount: 10 },
          }),
        }),
      );
    });
    expect(await screen.findByText(/"duplicate": true/)).toBeInTheDocument();
  });

  it("shows the filtered empty state and resets the filter", () => {
    render(<DedupConfigPage />);

    const filter = screen.getByTestId("dedup-filter-input");
    fireEvent.change(filter, { target: { value: "missing" } });

    expect(
      screen.getByText("No duplicate records match the current filters."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("dedup-table")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));

    expect(filter).toHaveValue("");
    expect(screen.getByText("No duplicate records")).toBeInTheDocument();
  });
});
