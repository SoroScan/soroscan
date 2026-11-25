import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { InviteMemberModal } from "@/components/organization/InviteMemberModal";
import { inviteTeamMember } from "@/lib/organization-store";

jest.mock("@/lib/organization-store", () => ({ inviteTeamMember: jest.fn() }));

const inviteMock = jest.mocked(inviteTeamMember);

function show(open = true) {
  const onClose = jest.fn();
  const onInvited = jest.fn();
  const view = render(
    <InviteMemberModal
      organizationId="org-1"
      open={open}
      onClose={onClose}
      onInvited={onInvited}
    />,
  );
  return { ...view, onClose, onInvited };
}

beforeEach(() => {
  jest.resetAllMocks();
  inviteMock.mockImplementation((_org, email) => ({
    success: true,
    invitationId: `inv-${email}`,
    message: `Invitation sent to ${email}`,
  }));
});

describe("InviteMemberModal", () => {
  it("renders no dialog when closed and opens with the viewer role selected", () => {
    const view = show(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    view.rerender(
      <InviteMemberModal
        organizationId="org-1"
        open
        onClose={view.onClose}
        onInvited={view.onInvited}
      />,
    );
    expect(screen.getByRole("dialog", { name: "INVITE_MEMBER" })).toBeInTheDocument();
    expect(screen.getByLabelText("Role")).toHaveValue("viewer");
  });

  it("rejects a blank submission before calling the invitation store", () => {
    show();
    const form = screen.getByRole("button", { name: /Send invite/i }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(screen.getByRole("alert")).toHaveTextContent("Enter at least one email address.");
    expect(inviteMock).not.toHaveBeenCalled();
  });

  it("submits one invitation and closes on success", () => {
    const { onClose, onInvited } = show();
    fireEvent.change(screen.getByLabelText("Email address(es)"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "admin" } });
    fireEvent.click(screen.getByRole("button", { name: /Send invite/i }));
    expect(inviteMock).toHaveBeenCalledWith("org-1", "alice@example.com", "admin");
    expect(onInvited).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("splits bulk invites on commas and semicolons and keeps the modal open", () => {
    const { onClose, onInvited } = show();
    fireEvent.change(screen.getByLabelText("Email address(es)"), {
      target: { value: "first@example.com, second@example.com; third@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send invite/i }));
    expect(inviteMock).toHaveBeenCalledTimes(3);
    expect(inviteMock).toHaveBeenNthCalledWith(2, "org-1", "second@example.com", "viewer");
    expect(screen.getByRole("status")).toHaveTextContent("Sent 3 invitations.");
    expect(screen.getByLabelText("Email address(es)")).toHaveValue("");
    expect(onInvited).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("displays a rejected invitation, including a malformed email rejected by the store", () => {
    inviteMock.mockImplementationOnce(() => {
      throw new Error("Invalid email address");
    });
    const { onClose, onInvited } = show();
    fireEvent.change(screen.getByLabelText("Email address(es)"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send invite/i }));
    expect(inviteMock).toHaveBeenCalledWith("org-1", "not-an-email", "viewer");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email address");
    expect(onInvited).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("handles other store failures and the cancel action", () => {
    inviteMock.mockImplementationOnce(() => {
      throw new Error("Already invited");
    });
    const { onClose, onInvited } = show();
    fireEvent.change(screen.getByLabelText("Email address(es)"), {
      target: { value: "alice@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send invite/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Already invited");
    expect(onInvited).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clears form values and errors after closing and reopening", () => {
    const view = show();
    fireEvent.submit(screen.getByRole("button", { name: /Send invite/i }).closest("form")!);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    view.rerender(
      <InviteMemberModal organizationId="org-1" open={false} onClose={view.onClose} onInvited={view.onInvited} />,
    );
    view.rerender(
      <InviteMemberModal organizationId="org-1" open onClose={view.onClose} onInvited={view.onInvited} />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email address(es)")).toHaveValue("");
  });
});
