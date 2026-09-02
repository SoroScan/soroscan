/**
 * React hooks tests — issue #1282
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import React from "react";

import { GET_CONTRACT, GET_EVENTS } from "../src/hooks/graphql.js";
import { useContract } from "../src/hooks/useContract.js";
import { useEvents } from "../src/hooks/useEvents.js";
import {
  SoroScanHooksProvider,
  useWebhook,
} from "../src/hooks/useWebhook.js";
import { SoroScanClient } from "../src/client.js";

const eventsMock: MockedResponse = {
  request: {
    query: GET_EVENTS,
    variables: {
      contractId: "CCAAA",
      eventType: undefined,
      first: 20,
      after: null,
    },
  },
  result: {
    data: {
      events: {
        edges: [
          {
            cursor: "cursor:1",
            node: {
              id: "1",
              eventType: "transfer",
              contractId: "CCAAA",
              contractName: "Test",
              payload: { amount: 1 },
              ledger: 100,
              eventIndex: 0,
              timestamp: "2026-01-01T00:00:00Z",
              txHash: "abc",
            },
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: "cursor:1" },
        totalCount: 1,
      },
    },
  },
};

const contractMock: MockedResponse = {
  request: {
    query: GET_CONTRACT,
    variables: { contractId: "CCAAA" },
  },
  result: {
    data: {
      contract: {
        id: "10",
        contractId: "CCAAA",
        name: "Tracked",
        alias: null,
        description: "demo",
        isActive: true,
        lastEventAt: null,
        eventCount: 3,
        createdAt: "2026-01-01T00:00:00Z",
      },
    },
  },
};

function apolloWrapper(mocks: MockedResponse[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    );
  };
}

describe("useEvents", () => {
  it("returns mapped events with loading and error state", async () => {
    const { result } = renderHook(
      () => useEvents({ contractId: "CCAAA" }),
      { wrapper: apolloWrapper([eventsMock]) }
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.type).toBe("transfer");
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe("useContract", () => {
  it("returns contract data from GraphQL", async () => {
    const { result } = renderHook(
      () => useContract({ contractId: "CCAAA" }),
      { wrapper: apolloWrapper([contractMock]) }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.label).toBe("Tracked");
    expect(result.current.data?.totalEvents).toBe(3);
  });
});

describe("useWebhook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and filters webhooks via REST client", async () => {
    const client = {
      listWebhooks: vi.fn().mockResolvedValue({
        items: [
          {
            id: "1",
            url: "https://a.example/hook",
            triggers: ["event.created"],
            contractId: "CCAAA",
            status: "active",
            secret: "s",
            createdAt: "2026-01-01T00:00:00Z",
            lastDeliveredAt: null,
            failureCount: 0,
          },
          {
            id: "2",
            url: "https://b.example/hook",
            triggers: ["event.created"],
            contractId: "CCBBB",
            status: "active",
            secret: "s",
            createdAt: "2026-01-01T00:00:00Z",
            lastDeliveredAt: null,
            failureCount: 0,
          },
        ],
        totalCount: 2,
      }),
      subscribeWebhook: vi.fn(),
      deleteWebhook: vi.fn(),
    } as unknown as SoroScanClient;

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SoroScanHooksProvider client={client}>{children}</SoroScanHooksProvider>
    );

    const { result } = renderHook(
      () => useWebhook({ contractId: "CCAAA" }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe("1");
  });
});
