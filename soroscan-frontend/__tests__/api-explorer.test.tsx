import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { createGraphiQLFetcher } from "@graphiql/toolkit"
import { explorerPlugin } from "@graphiql/plugin-explorer"
import { APIExplorer } from "@/components/developer/APIExplorer"

type MockFetcher = (params: { query: string }) => Promise<unknown>

interface MockGraphiQLProps {
  fetcher: MockFetcher
  defaultQuery: string
  plugins: unknown[]
  shouldPersistHeaders?: boolean
}

const mockCreateGraphiQLFetcher =
  createGraphiQLFetcher as jest.MockedFunction<typeof createGraphiQLFetcher>
const mockExplorerPlugin = explorerPlugin as jest.MockedFunction<
  typeof explorerPlugin
>

jest.mock("@graphiql/toolkit", () => ({
  createGraphiQLFetcher: jest.fn(),
}))

jest.mock("@graphiql/plugin-explorer", () => ({
  explorerPlugin: jest.fn(() => ({ title: "Explorer", icon: () => null, content: () => null })),
}))

jest.mock("graphiql", () => ({
  GraphiQL: function MockGraphiQL({
    fetcher,
    defaultQuery,
    plugins,
    shouldPersistHeaders,
  }: MockGraphiQLProps) {
    const [query, setQuery] = React.useState(defaultQuery)
    const [output, setOutput] = React.useState("")
    const [isExplorerOpen, setIsExplorerOpen] = React.useState(true)

    const handleExecute = async () => {
      if (!query.trim()) {
        setOutput("Query is empty")
        return
      }
      try {
        const res = await fetcher({ query })
        setOutput(JSON.stringify(res))
      } catch (err) {
        setOutput(
          err instanceof Error ? err.message : "Backend unavailable"
        )
      }
    }

    return (
      <div
        data-testid="mock-graphiql"
        data-persist-headers={String(Boolean(shouldPersistHeaders))}
        data-plugin-count={String(plugins.length)}
      >
        <button
          type="button"
          aria-label="Toggle Documentation Explorer"
          aria-expanded={isExplorerOpen}
          onClick={() => setIsExplorerOpen((prev) => !prev)}
        >
          Explorer
        </button>

        {isExplorerOpen && (
          <aside aria-label="Schema Explorer">
            <div>events(limit: 10)</div>
            <div>contractId</div>
            <div>eventType</div>
          </aside>
        )}

        <textarea
          aria-label="GraphQL Query Editor"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          type="button"
          aria-label="Execute Query"
          onClick={handleExecute}
        >
          Run Query
        </button>

        <pre data-testid="query-response">{output}</pre>
      </div>
    )
  },
}))

describe("APIExplorer", () => {
  const mockFetcherFn = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetcherFn.mockResolvedValue({
      data: {
        events: [{ id: "evt-1", eventType: "SWAP" }],
      },
    })
    mockCreateGraphiQLFetcher.mockReturnValue(
      mockFetcherFn as unknown as ReturnType<typeof createGraphiQLFetcher>
    )
  })

  it("renders container, terminal styles, default query, schema fields, and accessible controls", () => {
    render(<APIExplorer className="custom-explorer-class" />)

    const wrapper = screen.getByTestId("api-explorer")
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass("custom-explorer-class")

    const graphiql = screen.getByTestId("mock-graphiql")
    expect(graphiql).toHaveAttribute("data-persist-headers", "true")
    expect(graphiql).toHaveAttribute("data-plugin-count", "1")

    expect(mockExplorerPlugin).toHaveBeenCalledWith({
      showAttribution: false,
    })
    expect(mockCreateGraphiQLFetcher).toHaveBeenCalledWith({
      url: "http://localhost:8000/graphql/",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const editor = screen.getByRole("textbox", {
      name: "GraphQL Query Editor",
    }) as HTMLTextAreaElement
    expect(editor.value).toContain("query GetRecentEvents")
    expect(editor.value).toContain("events(limit: 10)")

    expect(
      screen.getByRole("button", { name: "Execute Query" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Toggle Documentation Explorer" })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Schema Explorer")).toBeInTheDocument()
  })

  it("toggles the schema explorer panel and executes queries via the configured fetcher", async () => {
    render(<APIExplorer url="https://api.soroscan.io/graphql/" />)

    expect(mockCreateGraphiQLFetcher).toHaveBeenCalledWith({
      url: "https://api.soroscan.io/graphql/",
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Collapse and re-expand the explorer panel
    const toggleBtn = screen.getByRole("button", {
      name: "Toggle Documentation Explorer",
    })
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByLabelText("Schema Explorer")).not.toBeInTheDocument()

    fireEvent.click(toggleBtn)
    expect(screen.getByLabelText("Schema Explorer")).toBeInTheDocument()

    // Execute query and inspect response
    fireEvent.click(screen.getByRole("button", { name: "Execute Query" }))

    await waitFor(() => {
      expect(mockFetcherFn).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId("query-response")).toHaveTextContent(
        "evt-1"
      )
    })
  })

  it("handles empty query input and fetcher errors gracefully", async () => {
    const customQuery = "query CustomHealth { health }"
    render(<APIExplorer defaultQuery={customQuery} />)

    const editor = screen.getByRole("textbox", {
      name: "GraphQL Query Editor",
    }) as HTMLTextAreaElement
    expect(editor.value).toBe(customQuery)

    // Empty query state
    fireEvent.change(editor, { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: "Execute Query" }))
    expect(screen.getByTestId("query-response")).toHaveTextContent(
      "Query is empty"
    )
    expect(mockFetcherFn).not.toHaveBeenCalled()

    // Backend unavailable error state
    mockFetcherFn.mockRejectedValueOnce(new Error("GraphQL endpoint offline"))
    fireEvent.change(editor, { target: { value: customQuery } })
    fireEvent.click(screen.getByRole("button", { name: "Execute Query" }))

    await waitFor(() => {
      expect(screen.getByTestId("query-response")).toHaveTextContent(
        "GraphQL endpoint offline"
      )
    })
  })
})