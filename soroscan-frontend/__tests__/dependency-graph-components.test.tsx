import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { NodeProps } from "reactflow";
import { ContractNode } from "@/components/dependency-graph/ContractNode";
import { DependencyGraph } from "@/components/dependency-graph/DependencyGraph";
import { GraphExporter } from "@/components/dependency-graph/GraphExporter";
import {
  useDependencyGraphStore,
  type GraphNodeData,
} from "@/components/dependency-graph/store";
import { MOCK_CONTRACTS } from "@/components/dependency-graph/types";
import ContractDependencyGraph, {
  type GraphEdge,
  type GraphNode,
} from "@/components/graph/ContractDependencyGraph";

const mockFitView = jest.fn();
const mockCytoscapeCore = {
  on: jest.fn(),
  destroy: jest.fn(),
};
const mockCytoscape = jest.fn(() => mockCytoscapeCore);

jest.mock("reactflow", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  function MockReactFlow({
    nodes = [],
    edges = [],
    children,
  }: {
    nodes?: Array<{ id: string }>;
    edges?: Array<{ id: string }>;
    children?: React.ReactNode;
  }) {
    return (
      <div
        data-testid="react-flow-mock"
        data-node-ids={nodes.map((node) => node.id).join(",")}
        data-edge-ids={edges.map((edge) => edge.id).join(",")}
      >
        {children}
      </div>
    );
  }

  return {
    __esModule: true,
    default: MockReactFlow,
    ReactFlow: MockReactFlow,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
    Handle: ({
      "aria-label": ariaLabel,
    }: {
      "aria-label": string;
    }) => <span aria-label={ariaLabel} />,
    Position: { Top: "top", Bottom: "bottom" },
    BackgroundVariant: { Dots: "dots" },
    MarkerType: { ArrowClosed: "arrowclosed" },
    useReactFlow: () => ({ fitView: mockFitView }),
    useNodesState: (initial: unknown[]) => {
      const [nodes, setNodes] = React.useState(initial);
      return [nodes, setNodes, () => {}];
    },
    useEdgesState: (initial: unknown[]) => {
      const [edges, setEdges] = React.useState(initial);
      return [edges, setEdges, () => {}];
    },
  };
});

jest.mock("cytoscape", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockCytoscape(...args),
}));

function resetDependencyGraphStore() {
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

function makeContractNodeProps(
  data: GraphNodeData,
  selected = false,
): NodeProps<GraphNodeData> {
  return {
    id: data.contract.id,
    type: "contractNode",
    data,
    position: { x: 0, y: 0 },
    selected,
    dragging: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
  };
}

function makeGraphNodeData(overrides: Partial<GraphNodeData> = {}): GraphNodeData {
  return {
    contract: MOCK_CONTRACTS[0],
    isSelected: false,
    isHighlighted: false,
    isDimmed: false,
    worstSeverity: "HIGH",
    ...overrides,
  };
}

describe("ContractNode", () => {
  const selectContract = jest.fn();
  const hoverContract = jest.fn();

  beforeEach(() => {
    selectContract.mockClear();
    hoverContract.mockClear();
    useDependencyGraphStore.setState({ selectContract, hoverContract });
  });

  it("renders contract details, risk, and severity", () => {
    render(<ContractNode {...makeContractNodeProps(makeGraphNodeData())} />);

    expect(
      screen.getByRole("button", {
        name: "Contract Router. Risk score: 8.2. Severity: HIGH",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Router")).toBeInTheDocument();
    expect(screen.getByText("8.2")).toBeInTheDocument();
    expect(screen.getByLabelText("Severity: HIGH")).toHaveTextContent("H");
    expect(screen.getByLabelText("dependency target")).toBeInTheDocument();
    expect(screen.getByLabelText("dependency source")).toBeInTheDocument();
  });

  it("shows selected styling and toggles the selected contract off on click", () => {
    const data = makeGraphNodeData({ isSelected: true });
    render(<ContractNode {...makeContractNodeProps(data, true)} />);

    const button = screen.getByRole("button", { name: /Contract Router/ });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveStyle({ transform: "scale(1.08)" });

    fireEvent.click(button);
    expect(selectContract).toHaveBeenCalledWith(null);
  });

  it("keeps a dimmed node accessible and sends hover enter/leave actions", () => {
    render(
      <ContractNode
        {...makeContractNodeProps(makeGraphNodeData({ isDimmed: true }))}
      />,
    );

    const button = screen.getByRole("button", { name: /Contract Router/ });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.mouseEnter(button);
    fireEvent.mouseLeave(button);
    expect(hoverContract.mock.calls).toEqual([["router"], [null]]);
  });
});

describe("GraphExporter", () => {
  let downloadedFilename: string | undefined;
  let createObjectURL: jest.Mock<string, [Blob | MediaSource]>;
  let revokeObjectURL: jest.Mock;
  let clickAnchor: jest.SpyInstance;

  beforeEach(() => {
    resetDependencyGraphStore();
    act(() => {
      useDependencyGraphStore.getState().setContracts(MOCK_CONTRACTS.slice(0, 2));
    });
    downloadedFilename = undefined;
    createObjectURL = jest.fn(() => "blob:graph-export");
    revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    clickAnchor = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download;
      });
  });

  afterEach(() => {
    clickAnchor.mockRestore();
  });

  it("exports the contract data as a downloadable JSON file", async () => {
    render(<GraphExporter />);
    fireEvent.click(screen.getByRole("button", { name: "Export graph data as JSON" }));

    expect(downloadedFilename).toBe("contract-dependency-graph.json");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0][0]).toMatchObject({
      type: "application/json",
    });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:graph-export");

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const contents = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    const payload = JSON.parse(contents) as {
      contractCount: number;
      contracts: Array<{ id: string }>;
      edges: Array<{ source: string; target: string }>;
    };
    expect(payload.contractCount).toBe(2);
    expect(payload.contracts.map((contract) => contract.id)).toEqual(["router", "vault"]);
    expect(payload.edges).toContainEqual({
      source: "router",
      target: "vault",
      dependencyType: "DIRECT",
    });
  });

  it("exports an SVG graph with the contract labels", () => {
    render(<GraphExporter />);
    fireEvent.click(screen.getByRole("button", { name: "Export graph as SVG" }));

    expect(downloadedFilename).toBe("contract-dependency-graph.svg");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL.mock.calls[0][0]).toMatchObject({ type: "image/svg+xml" });
  });

  it("reports JSON export failures when creating a download URL fails", () => {
    createObjectURL.mockImplementation(() => {
      throw new Error("URL creation failed");
    });
    render(<GraphExporter />);
    fireEvent.click(screen.getByRole("button", { name: "Export graph data as JSON" }));

    expect(screen.getByRole("alert")).toHaveTextContent("JSON export failed.");
    expect(clickAnchor).not.toHaveBeenCalled();
  });

  it("exports a PNG file from the graph canvas", () => {
    const context = {
      fillRect: jest.fn(),
      fillText: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      fillStyle: "",
      font: "",
      lineWidth: 0,
      textAlign: "left",
    } as unknown as CanvasRenderingContext2D;
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    jest
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback) => callback(new Blob(["png"], { type: "image/png" })));

    render(<GraphExporter />);
    fireEvent.click(screen.getByRole("button", { name: "Export graph as PNG" }));

    expect(downloadedFilename).toBe("contract-dependency-graph.png");
    expect(createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: "image/png" }));
    jest.restoreAllMocks();
  });
});

describe("DependencyGraph", () => {
  beforeEach(() => {
    resetDependencyGraphStore();
    mockFitView.mockClear();
  });

  it("renders the graph nodes and edges from the dependency store", () => {
    act(() => {
      useDependencyGraphStore.getState().setContracts(MOCK_CONTRACTS.slice(0, 2));
    });

    render(<DependencyGraph graphId="test-dependency-graph" />);

    expect(screen.getByRole("img", { name: "Contract dependency graph" })).toHaveAttribute(
      "id",
      "test-dependency-graph",
    );
    expect(screen.getByTestId("react-flow-mock")).toHaveAttribute(
      "data-node-ids",
      "router,vault",
    );
    expect(screen.getByTestId("react-flow-mock")).toHaveAttribute(
      "data-edge-ids",
      "router→vault",
    );
  });

  it("renders an empty React Flow canvas when the store has no data", () => {
    render(<DependencyGraph />);

    expect(screen.getByTestId("react-flow-mock")).toHaveAttribute("data-node-ids", "");
    expect(screen.getByTestId("react-flow-mock")).toHaveAttribute("data-edge-ids", "");
  });
});

describe("ContractDependencyGraph", () => {
  beforeEach(() => {
    mockCytoscape.mockClear();
    mockCytoscapeCore.on.mockClear();
    mockCytoscapeCore.destroy.mockClear();
  });

  it("creates Cytoscape elements from the supplied nodes and edges and handles node taps", () => {
    const nodes: GraphNode[] = [
      { id: "router", label: "Router", status: "healthy" },
      { id: "vault", label: "Vault", status: "degraded" },
    ];
    const edges: GraphEdge[] = [{ from: "router", to: "vault", calls: 4 }];
    const onNodeClick = jest.fn();
    const { unmount } = render(
      <ContractDependencyGraph
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        layout="circle"
      />,
    );

    expect(mockCytoscape).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: [
          { data: { id: "router", label: "Router", status: "healthy" } },
          { data: { id: "vault", label: "Vault", status: "degraded" } },
          {
            data: {
              id: "router-vault",
              source: "router",
              target: "vault",
              label: "4",
            },
          },
        ],
        layout: expect.objectContaining({ name: "circle" }),
      }),
    );

    const tapHandler = mockCytoscapeCore.on.mock.calls.find(
      ([event, selector]) => event === "tap" && selector === "node",
    )?.[2] as ((event: { target: { id: () => string } }) => void) | undefined;
    expect(tapHandler).toBeDefined();
    tapHandler?.({ target: { id: () => "vault" } });
    expect(onNodeClick).toHaveBeenCalledWith("vault");

    unmount();
    expect(mockCytoscapeCore.destroy).toHaveBeenCalledTimes(1);
  });

  it("initializes with no elements when nodes and edges are empty", () => {
    render(<ContractDependencyGraph nodes={[]} edges={[]} />);

    expect(mockCytoscape).toHaveBeenCalledWith(
      expect.objectContaining({ elements: [] }),
    );
  });
});
