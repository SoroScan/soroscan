import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { SearchInput } from "@/src/components/SearchInput"
import {
  SearchHistory,
  type SearchHistoryItem,
} from "@/components/SearchHistory"
import {
  SavedSearchList,
  type SavedSearch,
} from "@/components/SavedSearchList"
import {
  AdvancedSearchForm,
  type AdvancedSearchCriteria,
} from "@/components/AdvancedSearchForm"
import AdvancedSearchPage from "@/app/search/advanced/page"

jest.mock("@/components/terminal/landing/Navbar", () => ({
  Navbar: () => <nav data-testid="navbar" />,
}))

jest.mock("@/components/terminal/landing/Footer", () => ({
  Footer: () => <footer data-testid="footer" />,
}))

const SAMPLE_CRITERIA: AdvancedSearchCriteria = {
  contract: "CABC1234567890",
  eventType: "SWAP_COMPLETE",
  dateFrom: "2026-01-01",
  dateTo: "2026-01-31",
  minAmount: "100",
  maxAmount: "5000",
  text: "USDC",
}

const EMPTY_CRITERIA: AdvancedSearchCriteria = {
  contract: "",
  eventType: "",
  dateFrom: "",
  dateTo: "",
  minAmount: "",
  maxAmount: "",
  text: "",
}

describe("SearchInput", () => {
  it("renders searchbox with default placeholder, aria-label, and shortcut badge", () => {
    render(<SearchInput />)

    const input = screen.getByRole("searchbox", { name: "Search contracts" })
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute(
      "placeholder",
      "Search contracts... (Press / to focus)"
    )
    expect(screen.getByText("/")).toBeInTheDocument()
  })

  it("hides shortcut badge when showShortcutBadge is false", () => {
    render(<SearchInput showShortcutBadge={false} />)
    expect(screen.queryByText("/")).not.toBeInTheDocument()
  })

  it("supports typing, clearing, and submitting trimmed query on Enter", () => {
    const onSearch = jest.fn()
    const onKeyDown = jest.fn()

    render(<SearchInput onSearch={onSearch} onKeyDown={onKeyDown} />)

    const input = screen.getByRole("searchbox") as HTMLInputElement

    fireEvent.change(input, { target: { value: "  token_transfer  " } })
    expect(input.value).toBe("  token_transfer  ")

    fireEvent.keyDown(input, { key: "Enter" })
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith("token_transfer")
    expect(onKeyDown).toHaveBeenCalledTimes(1)

    fireEvent.change(input, { target: { value: "" } })
    expect(input.value).toBe("")
  })

  it("focuses searchbox on global '/' and Ctrl+K shortcuts, but ignores '/' inside other inputs", () => {
    render(
      <div>
        <input aria-label="Other input" />
        <SearchInput />
      </div>
    )

    const searchbox = screen.getByRole("searchbox")
    const otherInput = screen.getByLabelText("Other input")

    // Pressing '/' while focused on another input should not steal focus
    otherInput.focus()
    fireEvent.keyDown(otherInput, { key: "/" })
    expect(document.activeElement).toBe(otherInput)

    // Pressing '/' on document body focuses the searchbox
    otherInput.blur()
    fireEvent.keyDown(window, { key: "/" })
    expect(document.activeElement).toBe(searchbox)

    // Pressing Ctrl+K focuses the searchbox
    searchbox.blur()
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    expect(document.activeElement).toBe(searchbox)
  })

  it("forwards ref to the underlying input element", () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<SearchInput ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current).toBe(screen.getByRole("searchbox"))
  })
})

describe("SearchHistory", () => {
  it("renders empty state when there are no history items", () => {
    render(<SearchHistory items={[]} onLoad={jest.fn()} />)

    expect(screen.getByText("SEARCH_HISTORY")).toBeInTheDocument()
    expect(screen.getByText("No history yet.")).toBeInTheDocument()
  })

  it("renders history items in provided order and invokes onLoad when LOAD is clicked", () => {
    const onLoad = jest.fn()
    const items: SearchHistoryItem[] = [
      {
        id: "hist-2",
        at: "2026-06-15T14:30:00.000Z",
        criteria: { ...EMPTY_CRITERIA, eventType: "MINT" },
      },
      {
        id: "hist-1",
        at: "2026-06-14T10:00:00.000Z",
        criteria: { ...EMPTY_CRITERIA, eventType: "BURN" },
      },
    ]

    render(<SearchHistory items={items} onLoad={onLoad} />)

    const loadButtons = screen.getAllByRole("button", { name: "LOAD" })
    expect(loadButtons).toHaveLength(2)

    fireEvent.click(loadButtons[0])
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad).toHaveBeenCalledWith(items[0])

    fireEvent.click(loadButtons[1])
    expect(onLoad).toHaveBeenCalledWith(items[1])
  })
})

describe("SavedSearchList", () => {
  it("renders empty state when there are no saved searches", () => {
    render(<SavedSearchList items={[]} onLoad={jest.fn()} />)

    expect(screen.getByText("SAVED_SEARCHES")).toBeInTheDocument()
    expect(screen.getByText("No saved searches.")).toBeInTheDocument()
  })

  it("renders saved searches and invokes onLoad with the selected search", () => {
    const onLoad = jest.fn()
    const items: SavedSearch[] = [
      {
        id: "saved-1",
        name: "High Value Swaps",
        criteria: SAMPLE_CRITERIA,
        createdAt: "2026-06-10T09:00:00.000Z",
      },
      {
        id: "saved-2",
        name: "Daily Mints",
        criteria: { ...EMPTY_CRITERIA, eventType: "MINT" },
        createdAt: "2026-06-11T09:00:00.000Z",
      },
    ]

    render(<SavedSearchList items={items} onLoad={onLoad} />)

    expect(screen.getByText("High Value Swaps")).toBeInTheDocument()
    expect(screen.getByText("Daily Mints")).toBeInTheDocument()

    const loadButtons = screen.getAllByRole("button", { name: "LOAD" })
    expect(loadButtons).toHaveLength(2)

    fireEvent.click(loadButtons[1])
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad).toHaveBeenCalledWith(items[1])
  })
})

describe("AdvancedSearchForm", () => {
  it("renders all criteria fields and emits full criteria object on RUN_SEARCH", () => {
    const onSearch = jest.fn()
    const onSave = jest.fn()

    render(
      <AdvancedSearchForm
        initialValue={EMPTY_CRITERIA}
        onSearch={onSearch}
        onSave={onSave}
      />
    )

    fireEvent.change(screen.getByLabelText("Contract"), {
      target: { value: SAMPLE_CRITERIA.contract },
    })
    fireEvent.change(screen.getByLabelText("Event type"), {
      target: { value: SAMPLE_CRITERIA.eventType },
    })
    fireEvent.change(screen.getByLabelText("Free text"), {
      target: { value: SAMPLE_CRITERIA.text },
    })
    fireEvent.change(screen.getByLabelText("Date from"), {
      target: { value: SAMPLE_CRITERIA.dateFrom },
    })
    fireEvent.change(screen.getByLabelText("Date to"), {
      target: { value: SAMPLE_CRITERIA.dateTo },
    })
    fireEvent.change(screen.getByLabelText("Minimum amount"), {
      target: { value: SAMPLE_CRITERIA.minAmount },
    })
    fireEvent.change(screen.getByLabelText("Maximum amount"), {
      target: { value: SAMPLE_CRITERIA.maxAmount },
    })

    fireEvent.click(screen.getByRole("button", { name: "RUN_SEARCH" }))

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith(SAMPLE_CRITERIA)
    expect(onSave).not.toHaveBeenCalled()
  })

  it("emits current criteria on SAVE_SEARCH and syncs when initialValue changes", () => {
    const onSearch = jest.fn()
    const onSave = jest.fn()

    const { rerender } = render(
      <AdvancedSearchForm
        initialValue={EMPTY_CRITERIA}
        onSearch={onSearch}
        onSave={onSave}
      />
    )

    fireEvent.change(screen.getByLabelText("Contract"), {
      target: { value: "CXYZ999" },
    })
    fireEvent.click(screen.getByRole("button", { name: "SAVE_SEARCH" }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      ...EMPTY_CRITERIA,
      contract: "CXYZ999",
    })

    rerender(
      <AdvancedSearchForm
        initialValue={SAMPLE_CRITERIA}
        onSearch={onSearch}
        onSave={onSave}
      />
    )

    expect((screen.getByLabelText("Contract") as HTMLInputElement).value).toBe(
      SAMPLE_CRITERIA.contract
    )
    expect(
      (screen.getByLabelText("Event type") as HTMLInputElement).value
    ).toBe(SAMPLE_CRITERIA.eventType)
  })
})

describe("AdvancedSearchPage localStorage & query integration", () => {
  let storageStore: Record<string, string> = {}

  beforeEach(() => {
    storageStore = {}
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(
      (key: string) => storageStore[key] ?? null
    )
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(
      (key: string, value: string) => {
        storageStore[key] = value
      }
    )

    let idCounter = 0
    Object.defineProperty(globalThis, "crypto", {
      value: {
        randomUUID: () => `uuid-${++idCounter}`,
      },
      configurable: true,
    })

    window.history.replaceState({}, "", "/search/advanced")
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("hydrates saved searches and history from localStorage, saves new searches, and applies them", () => {
    const existingSaved: SavedSearch[] = [
      {
        id: "saved-existing",
        name: "Existing Bookmark",
        criteria: { ...EMPTY_CRITERIA, contract: "CEXISTING" },
        createdAt: "2026-05-01T00:00:00.000Z",
      },
    ]
    storageStore["advanced_saved_searches"] = JSON.stringify(existingSaved)

    const promptSpy = jest
      .spyOn(window, "prompt")
      .mockReturnValue("Swap Query Bookmark")

    render(<AdvancedSearchPage />)

    // Hydrated saved search appears
    expect(screen.getByText("Existing Bookmark")).toBeInTheDocument()

    // Compose and run a new search -> updates shareable URL and persists newest-first history
    fireEvent.change(screen.getByLabelText("Contract"), {
      target: { value: "CNEW123" },
    })
    fireEvent.change(screen.getByLabelText("Event type"), {
      target: { value: "TRANSFER" },
    })
    fireEvent.click(screen.getByRole("button", { name: "RUN_SEARCH" }))

    const shareInput = screen.getByPlaceholderText(
      "Run a search to generate a shareable link"
    ) as HTMLInputElement
    expect(shareInput.value).toContain("contract=CNEW123")
    expect(shareInput.value).toContain("eventType=TRANSFER")

    const persistedHistory = JSON.parse(
      storageStore["advanced_search_history"]
    ) as SearchHistoryItem[]
    expect(persistedHistory).toHaveLength(1)
    expect(persistedHistory[0].criteria.contract).toBe("CNEW123")

    // Save the current search -> persists to localStorage and displays in SavedSearchList
    fireEvent.click(screen.getByRole("button", { name: "SAVE_SEARCH" }))
    expect(promptSpy).toHaveBeenCalledWith("Name this search")
    expect(screen.getByText("Swap Query Bookmark")).toBeInTheDocument()

    const persistedSaved = JSON.parse(
      storageStore["advanced_saved_searches"]
    ) as SavedSearch[]
    expect(persistedSaved[0].name).toBe("Swap Query Bookmark")

    // Apply the older saved search ("Existing Bookmark") via its LOAD button
    const loadButtons = screen.getAllByRole("button", { name: "LOAD" })
    // Saved searches are rendered before history items: [Swap Query Bookmark, Existing Bookmark, history-1]
    fireEvent.click(loadButtons[1])

    expect((screen.getByLabelText("Contract") as HTMLInputElement).value).toBe(
      "CEXISTING"
    )
    expect(shareInput.value).toContain("contract=CEXISTING")
  })
})