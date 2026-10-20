import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import QueryBuilderReportPage from "@/app/reports/query-builder/page";

describe("QueryBuilder accessible feedback (Issue #1626)", () => {
  beforeEach(() => {
    localStorage.clear();
    window.alert = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows accessible error feedback instead of window.alert when report name is empty", () => {
    render(<QueryBuilderReportPage />);

    // Click Save Report without entering name
    const saveButton = screen.getByRole("button", { name: "Save Report" });
    fireEvent.click(saveButton);

    expect(window.alert).not.toHaveBeenCalled();

    const feedback = screen.getByTestId("query-builder-feedback");
    expect(feedback).toBeInTheDocument();
    expect(feedback).toHaveAttribute("role", "alert");
    expect(feedback).toHaveTextContent("Please enter a report name");
  });

  it("shows accessible success feedback instead of window.alert when report is saved", () => {
    render(<QueryBuilderReportPage />);

    const nameInput = screen.getByPlaceholderText("Enter report name");
    fireEvent.change(nameInput, { target: { value: "Monthly Invariants" } });

    const saveButton = screen.getByRole("button", { name: "Save Report" });
    fireEvent.click(saveButton);

    expect(window.alert).not.toHaveBeenCalled();

    const feedback = screen.getByTestId("query-builder-feedback");
    expect(feedback).toBeInTheDocument();
    expect(feedback).toHaveAttribute("role", "status");
    expect(feedback).toHaveTextContent('Report "Monthly Invariants" saved!');
  });

  it("allows dismiss button to close feedback", () => {
    render(<QueryBuilderReportPage />);

    const saveButton = screen.getByRole("button", { name: "Save Report" });
    fireEvent.click(saveButton);

    expect(screen.getByTestId("query-builder-feedback")).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText("Dismiss feedback");
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId("query-builder-feedback")).not.toBeInTheDocument();
  });
});
