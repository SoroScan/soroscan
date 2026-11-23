import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AlertRulesPage from "@/app/alerts/rules/page";
import { authenticatedFetch } from "@/lib/auth";
import { adaptRule, buildCondition, describeCondition, draftToPayload } from "@/lib/alert-rules-api";

jest.mock("@/lib/auth", () => ({ authenticatedFetch: jest.fn() }));
const mockFetch = authenticatedFetch as jest.MockedFunction<typeof authenticatedFetch>;

const json = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const CONTRACTS = { results: [{ id: 1, name: "Token", contract_id: "CTOKEN" }] };
const RULE = {
  id: 7,
  contract: 1,
  contract_id: "CTOKEN",
  name: "Large transfer",
  condition: {
    op: "and",
    conditions: [
      { op: "eq", field: "event_type", value: "transfer" },
      { op: "gte", field: "payload.amount", value: 1000 },
    ],
  },
  channels: [{ type: "slack", target: "https://hooks.slack.com/x" }],
  action_type: "slack",
  action_target: "https://hooks.slack.com/x",
  is_active: true,
  created_at: "2026-11-01T00:00:00Z",
};

/** Route mocked requests by method + URL. */
function routeFetch(routes: Record<string, () => Response | Promise<Response>>) {
  mockFetch.mockImplementation(async (input, init) => {
    const url = String(input).replace("http://localhost:8000", "");
    const key = `${init?.method ?? "GET"} ${url}`;
    const handler = routes[key];
    if (!handler) throw new Error(`Unexpected request ${key}`);
    return handler();
  });
}

const baseRoutes = (rules: unknown[] = [RULE]) => ({
  "GET /api/ingest/alert-rules/": () => json({ results: rules }),
  "GET /api/ingest/contracts/": () => json(CONTRACTS),
});

beforeEach(() => mockFetch.mockReset());

describe("alert rules API helpers", () => {
  it("builds and describes conditions", () => {
    expect(buildCondition({ eventType: "burn", field: "", op: "eq", value: "" })).toEqual({
      op: "eq",
      field: "event_type",
      value: "burn",
    });
    const both = buildCondition({ eventType: "transfer", field: "payload.amount", op: "gte", value: "10" });
    expect(both).toEqual({
      op: "and",
      conditions: [
        { op: "eq", field: "event_type", value: "transfer" },
        { op: "gte", field: "payload.amount", value: 10 },
      ],
    });
    expect(describeCondition(both)).toBe('event_type = "transfer" AND payload.amount >= 10');
  });

  it("maps the first channel to action_type/action_target and drops empty channels", () => {
    const payload = draftToPayload({
      contract: 1,
      name: " Big ",
      eventType: "transfer",
      field: "",
      op: "eq",
      value: "",
      channels: [
        { type: "email", target: "ops@example.com" },
        { type: "slack", target: " " },
      ],
    });
    expect(payload).toMatchObject({
      name: "Big",
      action_type: "email",
      action_target: "ops@example.com",
      channels: [{ type: "email", target: "ops@example.com" }],
    });
  });

  it("falls back to the legacy action_target when channels are empty", () => {
    expect(adaptRule({ ...RULE, channels: [] } as Parameters<typeof adaptRule>[0]).channels).toEqual([
      { type: "slack", target: "https://hooks.slack.com/x" },
    ]);
  });
});

describe("AlertRulesPage", () => {
  it("shows a loading state, then rules from the API", async () => {
    routeFetch(baseRoutes());
    render(<AlertRulesPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading alert rules");
    const row = (await screen.findByText("Large transfer", { selector: "td" })).closest("tr")!;
    expect(within(row).getByText("Token")).toBeInTheDocument();
    expect(within(row).getByText('event_type = "transfer" AND payload.amount >= 1000')).toBeInTheDocument();
    expect(within(row).getByText("slack")).toBeInTheDocument();
  });

  it("shows an error with retry when loading fails", async () => {
    let calls = 0;
    routeFetch({
      "GET /api/ingest/alert-rules/": () => (++calls === 1 ? json({ detail: "Server exploded" }, 500) : json([RULE])),
      "GET /api/ingest/contracts/": () => json(CONTRACTS),
    });
    render(<AlertRulesPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Server exploded");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Large transfer", { selector: "td" })).toBeInTheDocument();
  });

  it("shows empty states for no rules and no contracts", async () => {
    routeFetch({
      "GET /api/ingest/alert-rules/": () => json({ results: [] }),
      "GET /api/ingest/contracts/": () => json({ results: [] }),
    });
    render(<AlertRulesPage />);
    expect(await screen.findByText(/No alert rules yet/)).toBeInTheDocument();
    expect(screen.getByText(/Register a contract first/)).toBeInTheDocument();
  });

  it("creates a rule from a template", async () => {
    const created = { ...RULE, id: 8, name: "Any burn", condition: { op: "eq", field: "event_type", value: "burn" } };
    const post = jest.fn(() => json(created, 201));
    routeFetch({ ...baseRoutes([]), "POST /api/ingest/alert-rules/": post });
    render(<AlertRulesPage />);
    fireEvent.click(await screen.findByRole("button", { name: /Any burn/ }));
    fireEvent.change(screen.getByLabelText("Channel 1 target"), { target: { value: "https://example.com/hook" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rule" }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    const body = JSON.parse(String(mockFetch.mock.calls.find(([, init]) => init?.method === "POST")![1]!.body));
    expect(body).toEqual({
      contract: 1,
      name: "Any burn",
      condition: { op: "eq", field: "event_type", value: "burn" },
      channels: [{ type: "webhook", target: "https://example.com/hook" }],
      action_type: "webhook",
      action_target: "https://example.com/hook",
    });
    expect((await screen.findByText("Any burn", { selector: "td" })).closest("tr")).toBeInTheDocument();
  });

  it("shows the API's validation message when saving fails", async () => {
    routeFetch({
      ...baseRoutes([]),
      "POST /api/ingest/alert-rules/": () => json({ condition: ["Unknown operator 'x'."] }, 400),
    });
    render(<AlertRulesPage />);
    fireEvent.change(await screen.findByLabelText("Rule Name"), { target: { value: "Bad" } });
    fireEvent.change(screen.getByLabelText("Event Type (blank for any)"), { target: { value: "swap" } });
    fireEvent.change(screen.getByLabelText("Channel 1 target"), { target: { value: "https://x" } });
    fireEvent.click(screen.getByRole("button", { name: "Save rule" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("condition: Unknown operator 'x'.");
  });

  it("persists toggling and deleting a rule", async () => {
    const patch = jest.fn(() => json({ ...RULE, is_active: false }));
    const del = jest.fn(() => ({ ok: true, status: 204, json: async () => null }) as Response);
    routeFetch({ ...baseRoutes(), "PATCH /api/ingest/alert-rules/7/": patch, "DELETE /api/ingest/alert-rules/7/": del });
    render(<AlertRulesPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Toggle Large transfer" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Toggle Large transfer" })).toHaveTextContent("off"));
    const patchInit = mockFetch.mock.calls.find(([, init]) => init?.method === "PATCH")![1]!;
    expect(JSON.parse(String(patchInit.body))).toEqual({ is_active: false });

    fireEvent.click(screen.getByRole("button", { name: "Delete Large transfer" }));
    await waitFor(() => expect(screen.queryByText("Large transfer", { selector: "td" })).not.toBeInTheDocument());
    expect(del).toHaveBeenCalled();
    expect(screen.getByText(/No alert rules yet/)).toBeInTheDocument();
  });

  it("keeps the rule and shows an error when toggling fails", async () => {
    routeFetch({ ...baseRoutes(), "PATCH /api/ingest/alert-rules/7/": () => json({ detail: "Not found." }, 404) });
    render(<AlertRulesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Toggle Large transfer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Not found.");
    expect(screen.getByRole("button", { name: "Toggle Large transfer" })).toHaveTextContent("on");
  });

  it("loads delivery history from the executions action", async () => {
    routeFetch({
      ...baseRoutes(),
      "GET /api/ingest/alert-rules/7/executions/": () =>
        json({
          results: [
            { id: 1, event_type: "transfer", ledger: 42, channel: "slack", status: "failed", response: "HTTP 500", created_at: "2026-11-02T00:00:00Z" },
          ],
        }),
    });
    render(<AlertRulesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "history" }));
    expect(await screen.findByText("failed via slack - transfer @ ledger 42")).toBeInTheDocument();
    expect(screen.getByText("HTTP 500")).toBeInTheDocument();
  });

  it("shows an empty history for a rule that has not fired", async () => {
    routeFetch({ ...baseRoutes(), "GET /api/ingest/alert-rules/7/executions/": () => json({ results: [] }) });
    render(<AlertRulesPage />);
    fireEvent.click(await screen.findByRole("button", { name: "history" }));
    expect(await screen.findByText("This rule has not fired yet.")).toBeInTheDocument();
  });
});
