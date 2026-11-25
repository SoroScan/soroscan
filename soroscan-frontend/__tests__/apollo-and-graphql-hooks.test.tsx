import React from "react"
import { renderHook, waitFor, act } from "@testing-library/react"
import { gql, execute } from "@apollo/client"
import { MockedProvider } from "@apollo/client/testing"
import { client } from "@/lib/apollo-client"
import {
  getAccessToken,
  refreshAccessToken,
  clearTokens,
} from "@/lib/auth"
import {
  useGraphQLQuery,
  useGraphQLMutation,
} from "@/lib/hooks/useGraphQL"

jest.mock("@/lib/auth", () => ({
  getAccessToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  clearTokens: jest.fn(),
}))

const mockGetAccessToken = getAccessToken as jest.MockedFunction<
  typeof getAccessToken
>
const mockRefreshAccessToken = refreshAccessToken as jest.MockedFunction<
  typeof refreshAccessToken
>
const mockClearTokens = clearTokens as jest.MockedFunction<typeof clearTokens>

const TEST_QUERY = gql`
  query TestPing($id: ID!) {
    ping(id: $id) {
      id
      status
    }
  }
`

const TEST_MUTATION = gql`
  mutation TestTrigger($contractId: String!) {
    triggerSync(contractId: $contractId) {
      ok
    }
  }
`

const TEST_SUBSCRIPTION = gql`
  subscription OnEventAdded {
    eventAdded {
      id
    }
  }
`

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response
}

function executeLinkOperation(
  link: typeof client.link,
  query = TEST_QUERY,
  variables: Record<string, unknown> = { id: "1" }
) {
  return new Promise<{
    results: unknown[]
    error?: unknown
  }>((resolve) => {
    const results: unknown[] = []
    execute(link, { query, variables }).subscribe({
      next: (value) => results.push(value),
      error: (error) => resolve({ results, error }),
      complete: () => resolve({ results }),
    })
  })
}

describe("apollo-client links", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it("sets Authorization header only when an access token exists", async () => {
    const fetchMock = global.fetch as jest.Mock

    // 1. Without token -> no authorization header
    mockGetAccessToken.mockReturnValue(null)
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { ping: { id: "1", status: "ok" } } })
    )

    await executeLinkOperation(client.link)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const unauthHeaders = fetchMock.mock.calls[0][1].headers as Record<
      string,
      string
    >
    expect(unauthHeaders.authorization).toBeUndefined()

    // 2. With token -> sets Bearer authorization header
    mockGetAccessToken.mockReturnValue("jwt-access-token")
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { ping: { id: "1", status: "ok" } } })
    )

    await executeLinkOperation(client.link)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const authHeaders = fetchMock.mock.calls[1][1].headers as Record<
      string,
      string
    >
    expect(authHeaders.authorization).toBe("Bearer jwt-access-token")
  })

  it("refreshes the access token once on UNAUTHENTICATED/401 error and retries with the new token", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const fetchMock = global.fetch as jest.Mock

    mockGetAccessToken.mockReturnValue("expired-jwt-token")
    mockRefreshAccessToken.mockResolvedValueOnce("refreshed-jwt-token")

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          errors: [
            {
              message: "Authentication credentials were not provided.",
              extensions: { code: "UNAUTHENTICATED", status: 401 },
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: { ping: { id: "1", status: "recovered" } },
        })
      )

    const { results } = await executeLinkOperation(client.link)

    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1)
    expect(mockClearTokens).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const retryHeaders = fetchMock.mock.calls[1][1].headers as Record<
      string,
      string
    >
    expect(retryHeaders.authorization).toBe("Bearer refreshed-jwt-token")
    expect(results).toEqual([
      { data: { ping: { id: "1", status: "recovered" } } },
    ])

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it("clears tokens and does not loop when token refresh fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const fetchMock = global.fetch as jest.Mock

    mockGetAccessToken.mockReturnValue("expired-jwt-token")
    mockRefreshAccessToken.mockResolvedValueOnce(null)

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        errors: [
          {
            message: "Token invalid",
            extensions: { status: 401 },
          },
        ],
      })
    )

    const { results } = await executeLinkOperation(client.link)

    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1)
    expect(mockClearTokens).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results).toEqual([])

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it("does not retry non-auth GraphQL errors", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const fetchMock = global.fetch as jest.Mock

    mockGetAccessToken.mockReturnValue("valid-token")
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        errors: [
          {
            message: "Invalid contract ID",
            extensions: { code: "BAD_USER_INPUT" },
          },
        ],
      })
    )

    const { results } = await executeLinkOperation(client.link)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mockRefreshAccessToken).not.toHaveBeenCalled()
    expect(results).toHaveLength(1)

    errorSpy.mockRestore()
  })

  it("retries transient network failures and stops after the configured max attempts (3)", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const fetchMock = global.fetch as jest.Mock

    mockGetAccessToken.mockReturnValue("valid-token")
    fetchMock.mockRejectedValue(new TypeError("Network request failed"))

    const { error } = await executeLinkOperation(client.link)

    expect(error).toBeInstanceOf(Error)
    // RetryLink attempts.max = 3 (1 initial attempt + 2 retries)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    errorSpy.mockRestore()
  })

  it("routes subscription operations to the WebSocket link when NEXT_PUBLIC_WS_URL is configured", async () => {
    const previousWsUrl = process.env.NEXT_PUBLIC_WS_URL
    process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:8000/graphql/"

    const mockWsSubscribe = jest.fn(
      (
        _payload: unknown,
        sink: {
          next: (val: unknown) => void
          error: (err: unknown) => void
          complete: () => void
        }
      ) => {
        sink.next({ data: { eventAdded: { id: "sub-evt-1" } } })
        sink.complete()
        return jest.fn()
      }
    )

    const mockCreateWsClient = jest.fn(() => ({
      subscribe: mockWsSubscribe,
      dispose: jest.fn(),
    }))

    try {
      let isolatedClient!: typeof client
      jest.isolateModules(() => {
        jest.doMock("graphql-ws", () => ({
          createClient: mockCreateWsClient,
        }))
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("@/lib/apollo-client") as typeof import("@/lib/apollo-client")
        isolatedClient = mod.client
      })

      const fetchMock = global.fetch as jest.Mock
      const { results } = await executeLinkOperation(
        isolatedClient.link,
        TEST_SUBSCRIPTION,
        {}
      )

      expect(mockCreateWsClient).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "ws://localhost:8000/graphql/",
        })
      )
      expect(mockWsSubscribe).toHaveBeenCalledTimes(1)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(results).toEqual([{ data: { eventAdded: { id: "sub-evt-1" } } }])
    } finally {
      if (previousWsUrl === undefined) {
        delete process.env.NEXT_PUBLIC_WS_URL
      } else {
        process.env.NEXT_PUBLIC_WS_URL = previousWsUrl
      }
    }
  })
})

describe("useGraphQLQuery & useGraphQLMutation", () => {
  it("useGraphQLQuery passes variables, resolves data, updates isLoading/isError, and calls onCompleted", async () => {
    const onCompleted = jest.fn()
    const mocks = [
      {
        request: {
          query: TEST_QUERY,
          variables: { id: "42" },
        },
        result: {
          data: {
            ping: { __typename: "Ping", id: "42", status: "healthy" },
          },
        },
      },
    ]

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MockedProvider mocks={mocks}>{children}</MockedProvider>
    )

    const { result } = renderHook(
      () =>
        useGraphQLQuery(TEST_QUERY, {
          variables: { id: "42" },
          onCompleted,
        }),
      { wrapper }
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isError).toBe(false)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.data).toEqual({
      ping: { __typename: "Ping", id: "42", status: "healthy" },
    })
    expect(onCompleted).toHaveBeenCalledTimes(1)
  })

  it("useGraphQLQuery sets isError and triggers custom onError on failure", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const onError = jest.fn()
    const mocks = [
      {
        request: {
          query: TEST_QUERY,
          variables: { id: "bad" },
        },
        error: new Error("Query execution failed"),
      },
    ]

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MockedProvider mocks={mocks}>{children}</MockedProvider>
    )

    const { result } = renderHook(
      () =>
        useGraphQLQuery(TEST_QUERY, {
          variables: { id: "bad" },
          onError,
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.isLoading).toBe(false)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith(
      "GraphQL Query Error:",
      expect.stringContaining("Query execution failed")
    )

    consoleSpy.mockRestore()
  })

  it("useGraphQLMutation executes mutation with variables, calls onCompleted, and surfaces errors", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const onCompleted = jest.fn()
    const onError = jest.fn()

    const mocks = [
      {
        request: {
          query: TEST_MUTATION,
          variables: { contractId: "CABC123" },
        },
        result: {
          data: {
            triggerSync: { __typename: "SyncPayload", ok: true },
          },
        },
      },
      {
        request: {
          query: TEST_MUTATION,
          variables: { contractId: "CFAIL" },
        },
        error: new Error("Sync rejected"),
      },
    ]

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MockedProvider mocks={mocks}>{children}</MockedProvider>
    )

    const { result } = renderHook(
      () =>
        useGraphQLMutation(TEST_MUTATION, {
          onCompleted,
          onError,
        }),
      { wrapper }
    )

    expect(result.current[1].isLoading).toBe(false)
    expect(result.current[1].isError).toBe(false)

    // 1. Successful mutation
    await act(async () => {
      const response = await result.current[0]({
        variables: { contractId: "CABC123" },
      })
      expect(response.data).toEqual({
        triggerSync: { __typename: "SyncPayload", ok: true },
      })
    })

    expect(onCompleted).toHaveBeenCalledTimes(1)
    expect(result.current[1].isError).toBe(false)

    // 2. Failing mutation
    await act(async () => {
      await expect(
        result.current[0]({ variables: { contractId: "CFAIL" } })
      ).rejects.toThrow("Sync rejected")
    })

    await waitFor(() => {
      expect(result.current[1].isError).toBe(true)
    })
    expect(onError).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith(
      "GraphQL Mutation Error:",
      expect.stringContaining("Sync rejected")
    )

    consoleSpy.mockRestore()
  })
})