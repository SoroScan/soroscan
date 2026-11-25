import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WebhookTestingConsolePage from "@/app/webhooks/testing/page";

jest.mock("@/components/terminal/landing/Navbar", () => ({
  Navbar: () => <nav>navbar</nav>,
}));

jest.mock("@/components/terminal/landing/Footer", () => ({
  Footer: () => <footer>footer</footer>,
}));

const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
  window.localStorage.clear();
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: jest.fn(() => `id-${Math.random()}`),
  });
});

describe("Webhook testing console page", () => {
  it("shows empty response and history states initially", () => {
    render(<WebhookTestingConsolePage />);

    expect(screen.getByText("No response yet.")).toBeInTheDocument();
    expect(screen.getByText("No test history yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SEND_TEST_PAYLOAD" })).toBeEnabled();
  });

  it("edits the URL and payload, sends them, and shows the response and history", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { "content-type": "application/json" },
        body: '{"received":true}',
      }),
    });

    render(<WebhookTestingConsolePage />);

    fireEvent.change(screen.getByLabelText("WEBHOOK_URL"), {
      target: { value: "http://localhost:9000/webhook" },
    });
    fireEvent.change(screen.getByLabelText("PAYLOAD_EDITOR"), {
      target: { value: '{"event":"custom","data":{"id":7}}' },
    });
    fireEvent.click(screen.getByRole("button", { name: "SEND_TEST_PAYLOAD" }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/dev/request",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      method: "POST",
      url: "http://localhost:9000/webhook",
      headers: { "Content-Type": "application/json", "X-SoroScan-Test": "true" },
      body: JSON.stringify({ event: "custom", data: { id: 7 } }),
    });

    expect(await screen.findByText("STATUS: 200 OK")).toBeInTheDocument();
    expect(screen.getByText('{"received":true}')).toBeInTheDocument();
    expect(screen.queryByText("No response yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("No test history yet.")).not.toBeInTheDocument();
    expect(screen.getAllByText("http://localhost:9000/webhook").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("shows a loading state while the request is in flight", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    render(<WebhookTestingConsolePage />);
    fireEvent.click(screen.getByRole("button", { name: "SEND_TEST_PAYLOAD" }));

    const sendingButton = await screen.findByRole("button", { name: "SENDING..." });
    expect(sendingButton).toBeDisabled();

    resolveRequest({
      json: async () => ({ ok: true, status: 202, statusText: "Accepted", headers: {}, body: "" }),
    });

    expect(await screen.findByRole("button", { name: "SEND_TEST_PAYLOAD" })).toBeEnabled();
    expect(await screen.findByText("(empty body)")).toBeInTheDocument();
  });

  it("rejects invalid JSON without making a request", () => {
    render(<WebhookTestingConsolePage />);
    fireEvent.change(screen.getByLabelText("PAYLOAD_EDITOR"), {
      target: { value: "{not json}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SEND_TEST_PAYLOAD" }));

    expect(screen.getByText("Payload must be valid JSON.")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByText("No response yet.")).toBeInTheDocument();
  });

  it("shows an error and keeps the empty history when the request fails", async () => {
    mockFetch.mockRejectedValue(new Error("Failed to send webhook test."));

    render(<WebhookTestingConsolePage />);
    fireEvent.click(screen.getByRole("button", { name: "SEND_TEST_PAYLOAD" }));

    expect(await screen.findByText("Failed to send webhook test.")).toBeInTheDocument();
    expect(screen.getByText("No response yet.")).toBeInTheDocument();
    expect(screen.getByText("No test history yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SEND_TEST_PAYLOAD" })).toBeEnabled();
  });

  it("appends multiple sends to the history, newest first", async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ ok: false, status: 500, statusText: "Server Error", headers: {}, body: "oops" }),
    });

    render(<WebhookTestingConsolePage />);
    const button = screen.getByRole("button", { name: "SEND_TEST_PAYLOAD" });
    fireEvent.click(button);
    await screen.findByText("STATUS: 500 Server Error");
    fireEvent.click(button);
    await waitFor(() => expect(screen.getAllByText("500")).toHaveLength(2));

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("No test history yet.")).not.toBeInTheDocument();
  });
});
