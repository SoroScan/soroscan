import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateWebhookModal } from "@/app/webhooks/components/CreateWebhookModal";

describe("CreateWebhookModal timeout accessibility (Issue #1625)", () => {
  const mockClose = jest.fn();
  const mockCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("links timeout error message with input via aria-describedby when invalid", () => {
    render(<CreateWebhookModal isOpen onClose={mockClose} onCreate={mockCreate} />);

    const timeoutInput = screen.getByLabelText("REQUEST_TIMEOUT (seconds)") as HTMLInputElement;

    // Initially valid without aria-describedby
    expect(timeoutInput).toHaveAttribute("aria-invalid", "false");
    expect(timeoutInput).not.toHaveAttribute("aria-describedby");
    expect(document.getElementById("timeout-input-error")).toBeNull();

    // Trigger validation error by entering an out-of-range timeout
    fireEvent.change(timeoutInput, { target: { value: "2" } });
    fireEvent.blur(timeoutInput);

    // Assert aria-invalid is toggled to true
    expect(timeoutInput).toHaveAttribute("aria-invalid", "true");

    // Assert aria-describedby is present and matches the error element id
    expect(timeoutInput).toHaveAttribute("aria-describedby", "timeout-input-error");

    const errorElement = document.getElementById("timeout-input-error");
    expect(errorElement).not.toBeNull();
    expect(errorElement).toHaveTextContent("Timeout must be a whole number between 5 and 60 seconds.");
  });

  it("removes aria-describedby when input becomes valid again", () => {
    render(<CreateWebhookModal isOpen onClose={mockClose} onCreate={mockCreate} />);

    const timeoutInput = screen.getByLabelText("REQUEST_TIMEOUT (seconds)") as HTMLInputElement;

    // Trigger error
    fireEvent.change(timeoutInput, { target: { value: "3" } });
    fireEvent.blur(timeoutInput);
    expect(timeoutInput).toHaveAttribute("aria-describedby", "timeout-input-error");

    // Fix error
    fireEvent.change(timeoutInput, { target: { value: "30" } });
    expect(timeoutInput).toHaveAttribute("aria-invalid", "false");
    expect(timeoutInput).not.toHaveAttribute("aria-describedby");
    expect(document.getElementById("timeout-input-error")).toBeNull();
  });
});
