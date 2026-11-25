import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import AuditLogsPage from "@/app/admin/audit-logs/page";

describe("AuditLogsPage", () => {
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    fetchSpy = jest.fn();
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: fetchSpy,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(global, "fetch");
    jest.restoreAllMocks();
  });

  it("renders the page, columns and all sample rows without any data request", () => {
    render(<AuditLogsPage />);

    expect(screen.getByTestId("audit-logs-page")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Audit Logs" })).toBeInTheDocument();
    for (const column of ["Timestamp", "Actor", "Action", "Target", "Details"]) {
      expect(screen.getByRole("columnheader", { name: column })).toBeInTheDocument();
    }

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(screen.getByText("2025-01-15T10:30:00Z")).toBeInTheDocument();
    expect(screen.getByText("0x1a2b3c...")).toBeInTheDocument();
    expect(screen.getByText("VERIFY_APPROVE")).toBeInTheDocument();
    expect(screen.getByText("CCAAA")).toBeInTheDocument();
    expect(screen.getByText("Contract verification approved")).toBeInTheDocument();
    expect(screen.getByText("Changed role from viewer to editor")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("has no loading state because rows are rendered synchronously", () => {
    render(<AuditLogsPage />);

    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4);
  });

  it("filters rows by the search input across actor, action and target", () => {
    render(<AuditLogsPage />);

    fireEvent.change(screen.getByTestId("audit-search"), { target: { value: "admin" } });

    expect(screen.getByText("ROLE_CHANGE")).toBeInTheDocument();
    expect(screen.queryByText("VERIFY_APPROVE")).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);

    fireEvent.change(screen.getByTestId("audit-search"), { target: { value: "CCBBB" } });

    expect(screen.getByText("VERIFY_REJECT")).toBeInTheDocument();
    expect(screen.queryByText("ROLE_CHANGE")).not.toBeInTheDocument();
  });

  it("filters rows by the action dropdown", () => {
    render(<AuditLogsPage />);

    fireEvent.change(screen.getByTestId("action-filter"), {
      target: { value: "VERIFY_REJECT" },
    });

    expect(screen.getByText("VERIFY_REJECT")).toBeInTheDocument();
    expect(screen.queryByText("VERIFY_APPROVE")).not.toBeInTheDocument();
    expect(screen.queryByText("ROLE_CHANGE")).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);

    fireEvent.change(screen.getByTestId("action-filter"), { target: { value: "all" } });
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4);
  });

  it("shows the empty state when search and action filters match nothing", () => {
    render(<AuditLogsPage />);

    fireEvent.change(screen.getByTestId("audit-search"), { target: { value: "missing-user" } });
    fireEvent.change(screen.getByTestId("action-filter"), { target: { value: "ROLE_CHANGE" } });

    expect(screen.getByText("No audit logs found")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
    expect(screen.queryByText("VERIFY_APPROVE")).not.toBeInTheDocument();
  });

  it("resets to the first page when filters change and has no pager for the sample data", () => {
    render(<AuditLogsPage />);

    expect(screen.queryByTestId("prev-page")).not.toBeInTheDocument();
    expect(screen.queryByTestId("next-page")).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId("audit-search"), { target: { value: "admin" } });
    expect(screen.queryByTestId("next-page")).not.toBeInTheDocument();
  });

  it("shows no error state when the data source is unavailable", () => {
    fetchSpy.mockRejectedValue(new Error("API is down"));

    render(<AuditLogsPage />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument();
    expect(screen.getByText("VERIFY_APPROVE")).toBeInTheDocument();
  });
});
