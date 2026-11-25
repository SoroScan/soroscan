import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { OrganizationCreateWizard } from "@/components/organization/OrganizationCreateWizard";
import { createOrganization } from "@/lib/organization-store";
import type { Organization } from "@/lib/organization";

jest.mock("@/lib/organization-store", () => ({ createOrganization: jest.fn() }));

const createMock = jest.mocked(createOrganization);
const created: Organization = {
  id: "org-created",
  name: "Example Labs",
  billingContact: "billing@example.com",
  dataRegion: "eu-west",
  createdAt: "2026-11-01T09:00:00.000Z",
  contractCount: 0,
  webhookLimit: 25,
};

function enterIdentity() {
  fireEvent.change(screen.getByLabelText("Organization name"), {
    target: { value: "Example Labs" },
  });
  fireEvent.change(screen.getByLabelText("Billing contact"), {
    target: { value: "billing@example.com" },
  });
}

function advanceToConfirmation() {
  enterIdentity();
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
  fireEvent.change(screen.getByLabelText("Primary data region"), {
    target: { value: "eu-west" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
}

beforeEach(() => {
  jest.resetAllMocks();
  createMock.mockReturnValue(created);
});

describe("OrganizationCreateWizard", () => {
  it("starts at the identity step and blocks incomplete identity details", () => {
    render(<OrganizationCreateWizard onCreated={jest.fn()} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
    const next = screen.getByRole("button", { name: /Continue/i });
    expect(next).toBeDisabled();
    expect(screen.getByRole("button", { name: /Back/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Billing contact"), {
      target: { value: "billing@example.com" },
    });
    expect(next).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Organization name"), {
      target: { value: "Example Labs" },
    });
    fireEvent.change(screen.getByLabelText("Billing contact"), { target: { value: "bad" } });
    expect(next).toBeDisabled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("navigates forward and backward while preserving identity and region", () => {
    render(<OrganizationCreateWizard onCreated={jest.fn()} />);
    enterIdentity();
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "67");
    expect(screen.getByLabelText("Primary data region")).toHaveValue("us-east");
    fireEvent.change(screen.getByLabelText("Primary data region"), { target: { value: "eu-west" } });
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(screen.getByLabelText("Organization name")).toHaveValue("Example Labs");
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(screen.getByLabelText("Primary data region")).toHaveValue("eu-west");
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("Example Labs")).toBeInTheDocument();
    expect(screen.getByText("billing@example.com")).toBeInTheDocument();
    expect(screen.getByText("EU West (Ireland)")).toBeInTheDocument();
  });

  it("submits the selected details, signals success and prevents a second creation", () => {
    const onCreated = jest.fn();
    render(<OrganizationCreateWizard onCreated={onCreated} />);
    advanceToConfirmation();
    fireEvent.click(screen.getByRole("button", { name: /Create organization/i }));
    expect(createMock).toHaveBeenCalledWith({
      name: "Example Labs",
      billingContact: "billing@example.com",
      dataRegion: "eu-west",
    });
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(screen.getByRole("status")).toHaveTextContent("Organization created");
    expect(screen.getByRole("button", { name: /Create organization/i })).toBeDisabled();
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("shows a creation error without calling onCreated", () => {
    createMock.mockImplementationOnce(() => {
      throw new Error("Organization name already exists");
    });
    const onCreated = jest.fn();
    render(<OrganizationCreateWizard onCreated={onCreated} />);
    advanceToConfirmation();
    fireEvent.click(screen.getByRole("button", { name: /Create organization/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Organization name already exists");
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Create organization/i })).toBeEnabled();
  });
});
