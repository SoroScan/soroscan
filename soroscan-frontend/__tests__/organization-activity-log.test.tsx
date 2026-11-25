import React from "react";
import { render, screen, within } from "@testing-library/react";
import { OrganizationActivityLog } from "@/components/organization/OrganizationActivityLog";
import type { OrgActivityEntry } from "@/lib/organization";

const entry: OrgActivityEntry = {
  id: "activity-1",
  action: "invite_sent",
  actorEmail: "admin@example.com",
  targetEmail: "member@example.com",
  detail: "Invitation sent to new member",
  timestamp: "2026-11-22T10:15:00.000Z",
};

describe("OrganizationActivityLog", () => {
  it("renders the activity empty state", () => {
    render(<OrganizationActivityLog entries={[]} />);
    expect(screen.getByText("ACTIVITY_LOG")).toBeInTheDocument();
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Organization activity" })).not.toBeInTheDocument();
  });

  it("displays the action, details, actor, recipient and machine-readable timestamp", () => {
    render(<OrganizationActivityLog entries={[entry]} />);
    const list = screen.getByRole("list", { name: "Organization activity" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("invite sent")).toBeInTheDocument();
    expect(screen.getByText("Invitation sent to new member")).toBeInTheDocument();
    expect(screen.getByText("by admin@example.com → member@example.com")).toBeInTheDocument();
    expect(list.querySelector("time")).toHaveAttribute("datetime", entry.timestamp);
  });

  it("renders other actions without a target email", () => {
    render(
      <OrganizationActivityLog
        entries={[{ ...entry, id: "created", action: "org_created", targetEmail: undefined }]}
      />,
    );
    expect(screen.getByText("org created")).toBeInTheDocument();
    expect(screen.getByText("by admin@example.com")).toBeInTheDocument();
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
  });

  it("renders a long activity history without dropping or duplicating entries", () => {
    const entries: OrgActivityEntry[] = Array.from({ length: 75 }, (_, index) => ({
      ...entry,
      id: `activity-${index}`,
      action: index % 2 === 0 ? "member_added" : "settings_updated",
      detail: `Audit event ${index}`,
    }));
    render(<OrganizationActivityLog entries={entries} />);
    const list = screen.getByRole("list", { name: "Organization activity" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(75);
    expect(within(list).getByText("Audit event 0")).toBeInTheDocument();
    expect(within(list).getByText("Audit event 74")).toBeInTheDocument();
  });
});
