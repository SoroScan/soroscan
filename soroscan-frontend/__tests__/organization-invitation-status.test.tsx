import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { InvitationStatus } from "@/components/organization/InvitationStatus";
import { cancelInvitation, resendInvitation } from "@/lib/organization-store";
import type { OrgRole, TeamInvitation } from "@/lib/organization";

jest.mock("@/lib/organization-store", () => ({
  cancelInvitation: jest.fn(),
  resendInvitation: jest.fn(),
}));

const cancelMock = jest.mocked(cancelInvitation);
const resendMock = jest.mocked(resendInvitation);
const DAY = 24 * 60 * 60 * 1000;

function invitation(
  status: TeamInvitation["status"] = "pending",
  expiresAt = new Date(Date.now() + 3 * DAY).toISOString(),
): TeamInvitation {
  return {
    id: `invite-${status}`,
    email: "teammate@example.com",
    role: "operator",
    invitedAt: new Date(Date.now() - DAY).toISOString(),
    expiresAt,
    status,
  };
}

function show(invitations: TeamInvitation[], currentRole: OrgRole | null = "owner") {
  const onChanged = jest.fn();
  render(
    <InvitationStatus
      organizationId="org-1"
      invitations={invitations}
      currentRole={currentRole}
      onChanged={onChanged}
    />,
  );
  return onChanged;
}

beforeEach(() => jest.resetAllMocks());

describe("InvitationStatus", () => {
  it("renders a pending invitation with email, role, expiry and actions", () => {
    show([invitation()]);
    expect(screen.getByText("teammate@example.com")).toBeInTheDocument();
    expect(screen.getByText("Operator")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText(/\dd remaining/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resend/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it.each(["accepted", "cancelled"] as const)(
    "does not show %s invitations",
    (status) => {
      show([invitation(status)]);
      expect(screen.getByRole("status")).toHaveTextContent("No pending invitations.");
      expect(screen.queryByText("teammate@example.com")).not.toBeInTheDocument();
    },
  );

  it("omits expired-status invitations whose expiry date has passed", () => {
    show([invitation("expired", new Date(Date.now() - DAY).toISOString())]);
    expect(screen.getByRole("status")).toHaveTextContent("No pending invitations.");
  });

  it("shows an expired pending invitation as expired", () => {
    show([invitation("pending", new Date(Date.now() - DAY).toISOString())]);
    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByText("expired")).toBeInTheDocument();
  });

  it("hides management actions from viewers and members without a role", () => {
    const { unmount } = render(
      <InvitationStatus
        organizationId="org-1"
        invitations={[invitation()]}
        currentRole="viewer"
        onChanged={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Resend/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cancel/i })).not.toBeInTheDocument();
    unmount();
    show([invitation()], null);
    expect(screen.queryByRole("button", { name: /Resend/i })).not.toBeInTheDocument();
  });

  it("resends an invitation and notifies its parent", () => {
    const onChanged = show([invitation()], "admin");
    fireEvent.click(screen.getByRole("button", { name: /Resend/i }));
    expect(resendMock).toHaveBeenCalledWith("org-1", "invite-pending");
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("cancels an invitation and notifies its parent", () => {
    const onChanged = show([invitation()]);
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(cancelMock).toHaveBeenCalledWith("org-1", "invite-pending");
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("shows a store error without reporting a successful change", () => {
    resendMock.mockImplementationOnce(() => {
      throw new Error("Resend service unavailable");
    });
    const onChanged = show([invitation()]);
    fireEvent.click(screen.getByRole("button", { name: /Resend/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Resend service unavailable");
    expect(onChanged).not.toHaveBeenCalled();
  });
});
