import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import WebhookDetailPage from "@/app/webhooks/[id]/page";

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "wh_test_123" }),
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/webhooks/wh_test_123",
}));

describe("WebhookDetailPage REQUEST_TIMEOUT deduplication", () => {
  beforeEach(() => {
    const apiWebhook = {
      id: "wh_test_123",
      url: "https://example.com/webhook",
      status: "active",
      event_types: ["transfer"],
      contract_filter: "ALL_CONTRACTS",
      timeout_seconds: 30,
      secret: "whsec_test",
      success_rate: 100,
      total_deliveries: 10,
    };

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes("/deliveries/")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ results: [], count: 0 }),
          json: async () => ({ results: [], count: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(apiWebhook),
        json: async () => apiWebhook,
      });
    }) as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders REQUEST_TIMEOUT label exactly once on the detail page", async () => {
    render(<WebhookDetailPage />);

    await waitFor(() => {
      expect(screen.queryByText("LOADING_WEBHOOK")).not.toBeInTheDocument();
    });

    const timeoutLabels = screen.getAllByText("REQUEST_TIMEOUT");
    expect(timeoutLabels).toHaveLength(1);
    expect(screen.getByLabelText("REQUEST_TIMEOUT (seconds)")).toBeInTheDocument();
  });
});
