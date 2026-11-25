/**
 * Tests for the live Contract Dependencies page (#922)
 *
 * Covers:
 *   - mapCallGraphToContracts (GraphQL call-graph → ContractWithDeps mapping)
 *   - Store integration (nodes/edges, severity coloring, filtering)
 *   - Page UI states with a mocked Apollo GraphQL API:
 *       no-contract, loading, success, error (+ retry), empty
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";

import { DependenciesForContractDocument } from "@/src/generated/apollo-hooks";
import { useDependencyGraphStore } from "@/components/dependency-graph/store";
import {
  mapCallGraphToContracts,
  type CallGraphPayload,
} from "@/components/dependency-graph/map-call-graph";
import { MOCK_CONTRACTS } from "@/components/dependency-graph/mock-data";
import ContractDependenciesClient from "@/app/contract-dependencies/ContractDependenciesClient";

// ── next/navigation + next/dynamic are stubbed so the page renders in jsdom ───
const mockGet = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
}));

jest.mock("next/dynamic", () => ({
  __esModule: true,
  // Return a component that renders nothing (avoids importing ReactFlow/canvas).
  default: () => () => null,
}));

const CONTRACT_ID = "CROOTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const GRAPH_PAYLOAD: CallGraphPayload = {
  hasCycles: false,
  cycleDetails: null,
  graphData: {
    nodes: [
      { id: "alpha", label: "alpha" },
      { id: "beta", label: "beta" },
      { id: "gamma", label: "gamma" },
    ],
    edges: [
      { from: "alpha", to: "beta", weight: 3, risk_score: 80 },
      { from: "beta", to: "gamma", weight: 1, risk_score: 20 },
    ],
  },
};

function resetStore() {
  act(() => {
    useDependencyGraphStore.setState({
      contracts: [],
      nodes: [],
      edges: [],
      selectedContractId: null,
      hoveredContractId: null,
      highlightedPath: new Set(),
      filterName: "",
      filterSeverity: "ALL",
      viewMode: "graph",
      isLoading: false,
    });
  });
}

function queryResult(contractId: string, payload: CallGraphPayload | null) {
  return {
    request: {
      query: DependenciesForContractDocument,
      variables: { contractId },
    },
    result: {
      data: {
        dependenciesForContract:
          payload === null
            ? null
            : {
                __typename: "CallGraph",
                hasCycles: payload.hasCycles ?? false,
                cycleDetails: payload.cycleDetails ?? null,
                contract: {
                  __typename: "ContractSummary",
                  contractId,
                  name: "root",
                },
                graphData: payload.graphData ?? null,
              },
      },
    },
  };
}

beforeEach(() => {
  resetStore();
  mockGet.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Mapper
// ─────────────────────────────────────────────────────────────────────────────

describe("mapCallGraphToContracts", () => {
  it("maps graph nodes into contracts and edges into dependencies/dependents", () => {
    const contracts = mapCallGraphToContracts(GRAPH_PAYLOAD);

    expect(contracts).toHaveLength(3);

    const alpha = contracts.find((c) => c.id === "alpha")!;
    const beta = contracts.find((c) => c.id === "beta")!;
    const gamma = contracts.find((c) => c.id === "gamma")!;

    expect(alpha.name).toBe("alpha");
    expect(alpha.address).toBe("alpha");
    expect(alpha.dependencies).toHaveLength(1);
    expect(alpha.dependencies[0].contractName).toBe("beta");
    expect(alpha.dependencies[0].dependencyType).toBe("DIRECT");

    // Dependents are back-populated on the target node.
    expect(beta.dependents.map((d) => d.contractName)).toContain("alpha");
    expect(gamma.dependents.map((d) => d.contractName)).toContain("beta");
  });

  it("derives riskScore and downstream reachability from the edge set", () => {
    const contracts = mapCallGraphToContracts(GRAPH_PAYLOAD);
    const alpha = contracts.find((c) => c.id === "alpha")!;
    const beta = contracts.find((c) => c.id === "beta")!;
    const gamma = contracts.find((c) => c.id === "gamma")!;

    expect(alpha.riskScore).toBe(8); // 80 / 10
    expect(alpha.reachabilityPct).toBe(100); // reaches beta + gamma
    expect(beta.reachabilityPct).toBe(50); // reaches gamma only
    expect(gamma.reachabilityPct).toBe(0);
  });

  it("marks edges inside a detected cycle as CIRCULAR", () => {
    const contracts = mapCallGraphToContracts({
      hasCycles: true,
      cycleDetails: ["alpha", "beta"],
      graphData: {
        nodes: [
          { id: "alpha", label: "alpha" },
          { id: "beta", label: "beta" },
        ],
        edges: [{ from: "alpha", to: "beta", risk_score: 10 }],
      },
    });

    const alpha = contracts.find((c) => c.id === "alpha")!;
    expect(alpha.dependencies[0].dependencyType).toBe("CIRCULAR");
  });

  it("returns an empty array for missing or empty graph data", () => {
    expect(mapCallGraphToContracts(null)).toEqual([]);
    expect(mapCallGraphToContracts({ graphData: { nodes: [], edges: [] } })).toEqual([]);
  });

  it("ignores edges that reference unknown nodes", () => {
    const contracts = mapCallGraphToContracts({
      graphData: {
        nodes: [{ id: "alpha", label: "alpha" }],
        edges: [{ from: "alpha", to: "ghost" }],
      },
    });
    expect(contracts).toHaveLength(1);
    expect(contracts[0].dependencies).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Store integration (node/edge mapping, severity coloring, filtering)
// ─────────────────────────────────────────────────────────────────────────────

describe("dependency graph store with live data", () => {
  it("builds nodes and edges from mapped contracts", () => {
    const contracts = mapCallGraphToContracts(GRAPH_PAYLOAD);
    act(() => {
      useDependencyGraphStore.getState().setContracts(contracts);
    });

    const { nodes, edges } = useDependencyGraphStore.getState();
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
    expect(edges.map((e) => `${e.source}->${e.target}`)).toContain("alpha->beta");
  });

  it("colors nodes by their worst vulnerability severity", () => {
    act(() => {
      useDependencyGraphStore.getState().setContracts(MOCK_CONTRACTS);
    });

    const { nodes } = useDependencyGraphStore.getState();
    const router = nodes.find((n) => n.id === "router")!; // HIGH
    const token = nodes.find((n) => n.id === "token")!; // CRITICAL
    const treasury = nodes.find((n) => n.id === "treasury")!; // NONE

    expect(router.data.worstSeverity).toBe("HIGH");
    expect(router.style?.borderColor).toBe("#ff3366");
    expect(token.style?.borderColor).toBe("#ff3366");
    expect(treasury.data.worstSeverity).toBe("NONE");
    expect(treasury.style?.borderColor).toBe("#00ff41");
  });

  it("filters nodes by contract name", () => {
    const contracts = mapCallGraphToContracts(GRAPH_PAYLOAD);
    act(() => {
      useDependencyGraphStore.getState().setContracts(contracts);
    });

    act(() => {
      useDependencyGraphStore.getState().setFilterName("gamma");
    });

    const { nodes, edges } = useDependencyGraphStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("gamma");
    expect(edges).toHaveLength(0);
  });

  it("filters nodes by severity", () => {
    act(() => {
      useDependencyGraphStore.getState().setContracts(MOCK_CONTRACTS);
    });
    act(() => {
      useDependencyGraphStore.getState().setFilterSeverity("HIGH");
    });

    const { nodes } = useDependencyGraphStore.getState();
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every((n) => n.data.worstSeverity === "HIGH")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Page UI states (mocked Apollo API)
// ─────────────────────────────────────────────────────────────────────────────

describe("ContractDependenciesClient", () => {
  it("shows a prompt when no contract is selected", () => {
    mockGet.mockReturnValue(null);

    render(
      <MockedProvider mocks={[]}>
        <ContractDependenciesClient />
      </MockedProvider>,
    );

    expect(screen.getByText("NO_CONTRACT_SELECTED")).toBeInTheDocument();
  });

  it("shows a loading state while the query is in flight", () => {
    mockGet.mockImplementation((key: string) => (key === "contract" ? CONTRACT_ID : null));

    const delayed = [
      {
        ...queryResult(CONTRACT_ID, GRAPH_PAYLOAD),
        delay: 100000,
      },
    ];

    render(
      <MockedProvider mocks={delayed}>
        <ContractDependenciesClient />
      </MockedProvider>,
    );

    expect(screen.getByText("LOADING_DEPENDENCY_GRAPH")).toBeInTheDocument();
  });

  it("renders the graph and loads mapped contracts on success", async () => {
    mockGet.mockImplementation((key: string) => (key === "contract" ? CONTRACT_ID : null));

    render(
      <MockedProvider mocks={[queryResult(CONTRACT_ID, GRAPH_PAYLOAD)]}>
        <ContractDependenciesClient />
      </MockedProvider>,
    );

    expect(await screen.findByText("Contract Dependency Explorer")).toBeInTheDocument();

    await waitFor(() => {
      expect(useDependencyGraphStore.getState().contracts).toHaveLength(3);
    });

    const { nodes, edges } = useDependencyGraphStore.getState();
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
  });

  it("shows an error state with a retry action when the query fails", async () => {
    mockGet.mockImplementation((key: string) => (key === "contract" ? CONTRACT_ID : null));

    const failing = [
      {
        request: {
          query: DependenciesForContractDocument,
          variables: { contractId: CONTRACT_ID },
        },
        error: new Error("network exploded"),
      },
    ];

    render(
      <MockedProvider mocks={failing}>
        <ContractDependenciesClient />
      </MockedProvider>,
    );

    expect(await screen.findByText("network exploded")).toBeInTheDocument();
    expect(screen.getByText("RETRY")).toBeInTheDocument();
  });

  it("shows an empty state when the contract has no recorded dependencies", async () => {
    mockGet.mockImplementation((key: string) => (key === "contract" ? CONTRACT_ID : null));

    const empty: CallGraphPayload = { hasCycles: false, cycleDetails: null, graphData: { nodes: [], edges: [] } };

    render(
      <MockedProvider mocks={[queryResult(CONTRACT_ID, empty)]}>
        <ContractDependenciesClient />
      </MockedProvider>,
    );

    expect(await screen.findByText("NO_DEPENDENCIES")).toBeInTheDocument();
  });
});
