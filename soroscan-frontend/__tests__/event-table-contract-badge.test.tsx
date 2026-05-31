import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EventTable } from "@/app/dashboard/components/EventTable";
import type { EventRecord } from "@/components/ingest/types";

jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

const event: EventRecord = {
  id: "evt_1",
  contractId: "CB76XYM3HDYCR2LZEM6BTXGWBZCH6D66Z6F7B",
  contractName: "TreasuryVault",
  eventType: "transfer",
  ledger: 12345,
  eventIndex: 2,
  timestamp: "2026-02-22T10:30:00.000Z",
  txHash: "abcdef1234567890abcdef1234567890abcdef1234567890",
  payload: { amount: "100" },
};

describe("EventTable contract indicator", () => {
  it("shows a colored contract badge with name and short id", () => {
    render(<EventTable events={[event]} loading={false} onEventClick={jest.fn()} />);

    const contractLink = screen.getByRole("link", {
      name: "Open contract TreasuryVault",
    });

    expect(contractLink).toHaveAttribute(
      "href",
      "/contracts/CB76XYM3HDYCR2LZEM6BTXGWBZCH6D66Z6F7B",
    );
    expect(contractLink).toHaveTextContent("TreasuryVault");
    expect(contractLink).toHaveTextContent("CB76XYM3...6Z6F7B");
    expect(contractLink).toHaveStyle({ borderColor: "rgba(255, 170, 0, 0.82)" });
  });

  it("uses the short contract id when no alias is available", () => {
    render(
      <EventTable
        events={[{ ...event, id: "evt_2", contractName: "" }]}
        loading={false}
        onEventClick={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("link", {
        name: `Open contract ${event.contractId}`,
      }),
    ).toHaveTextContent("CB76XYM3...6Z6F7B");
  });

  it("keeps event details available from the view action", () => {
    const onEventClick = jest.fn();
    render(<EventTable events={[event]} loading={false} onEventClick={onEventClick} />);

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    expect(onEventClick).toHaveBeenCalledWith(event);
  });
});
