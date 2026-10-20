import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import QueryBuilderReportPage from "@/app/reports/query-builder/page"

describe("QueryBuilderReportPage Empty State (Issue #1709)", () => {
  beforeEach(() => {
    localStorage.clear()
    jest.spyOn(window, "alert").mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders default data table when rows match query criteria", () => {
    render(<QueryBuilderReportPage />)

    // Table should render with source rows
    expect(screen.queryByTestId("query-builder-empty")).not.toBeInTheDocument()
    expect(screen.getAllByText("CABC1").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("CXYZ9").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("tx_001")).toBeInTheDocument()
    expect(screen.getByText("Rows: 4/4")).toBeInTheDocument()
  })

  it("displays EmptyState when query returns no rows", () => {
    render(<QueryBuilderReportPage />)

    const contractInput = screen.getByTestId("contract-filter-input")
    fireEvent.change(contractInput, { target: { value: "C_DOES_NOT_EXIST" } })

    // Results table should be replaced by EmptyState
    const emptyState = screen.getByTestId("query-builder-empty")
    expect(emptyState).toBeInTheDocument()
    expect(screen.getByText("NO_QUERY_RESULTS")).toBeInTheDocument()
    expect(
      screen.getByText(/No event records matched your filter criteria/i)
    ).toBeInTheDocument()
    expect(screen.getByText("Rows: 0/0")).toBeInTheDocument()
  })

  it("disables export buttons when results are empty", () => {
    render(<QueryBuilderReportPage />)

    const contractInput = screen.getByTestId("contract-filter-input")
    fireEvent.change(contractInput, { target: { value: "NO_MATCH" } })

    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Export JSON/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /Export Parquet/i })).toBeDisabled()
  })

  it("resets filters and restores data table when clicking RESET_FILTERS action on EmptyState", () => {
    render(<QueryBuilderReportPage />)

    const contractInput = screen.getByTestId("contract-filter-input") as HTMLInputElement
    fireEvent.change(contractInput, { target: { value: "IMPOSSIBLE_FILTER" } })

    expect(screen.getByTestId("query-builder-empty")).toBeInTheDocument()
    expect(contractInput.value).toBe("IMPOSSIBLE_FILTER")

    // Click the RESET_FILTERS button in EmptyState action
    const resetActionBtn = screen.getByRole("button", { name: "RESET_FILTERS" })
    expect(resetActionBtn).toBeInTheDocument()
    fireEvent.click(resetActionBtn)

    // Filters should be cleared
    expect(contractInput.value).toBe("")
    expect(screen.queryByTestId("query-builder-empty")).not.toBeInTheDocument()
    expect(screen.getByText("Rows: 4/4")).toBeInTheDocument()
    expect(screen.getAllByText("CABC1").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("tx_001")).toBeInTheDocument()
  })

  it("resets eventType filter using the filter bar reset button", () => {
    render(<QueryBuilderReportPage />)

    const eventTypeSelect = screen.getByTestId("event-type-filter-select") as HTMLSelectElement
    const contractInput = screen.getByTestId("contract-filter-input") as HTMLInputElement

    fireEvent.change(contractInput, { target: { value: "CABC1" } })
    fireEvent.change(eventTypeSelect, { target: { value: "burn" } }) // CABC1 has only swap and mint

    expect(screen.getByTestId("query-builder-empty")).toBeInTheDocument()

    // Filter section reset button
    const filterResetBtn = screen.getByTestId("reset-filters-btn")
    expect(filterResetBtn).toBeInTheDocument()
    fireEvent.click(filterResetBtn)

    expect(contractInput.value).toBe("")
    expect(eventTypeSelect.value).toBe("")
    expect(screen.queryByTestId("query-builder-empty")).not.toBeInTheDocument()
    expect(screen.getByText("Rows: 4/4")).toBeInTheDocument()
  })
})
