/**
 * Tests for EventTypeIcon component — issue #571
 */
import { render, screen } from "@testing-library/react";
import {
  EventTypeIcon,
  getEventTypeIcon,
} from "@/components/events/EventTypeIcon";

// lucide-react renders SVGs; we just need to verify aria-label and that
// a different icon is rendered for each known type.

describe("getEventTypeIcon()", () => {
  const knownTypes = [
    "transfer",
    "mint",
    "burn",
    "approve",
    "clawback",
    "set_admin",
    "set_authorized",
  ] as const;

  it("returns a distinct component for each known event type", () => {
    const icons = knownTypes.map((t) => getEventTypeIcon(t));
    const unique = new Set(icons);
    expect(unique.size).toBe(knownTypes.length);
  });

  it("returns the fallback icon for an unknown event type", () => {
    const fallback = getEventTypeIcon("unknown_custom_event");
    const knownIcons = knownTypes.map((t) => getEventTypeIcon(t));
    // Fallback should not be any of the known icons
    expect(knownIcons).not.toContain(fallback);
  });

  it("returns the same fallback for any unknown string", () => {
    expect(getEventTypeIcon("foo")).toBe(getEventTypeIcon("bar"));
  });
});

describe("EventTypeIcon component", () => {
  it("renders an icon with the correct aria-label for transfer", () => {
    render(<EventTypeIcon eventType="transfer" />);
    expect(screen.getByRole("img", { name: "transfer event" })).toBeInTheDocument();
  });

  it("renders an icon with the correct aria-label for mint", () => {
    render(<EventTypeIcon eventType="mint" />);
    expect(screen.getByRole("img", { name: "mint event" })).toBeInTheDocument();
  });

  it("renders an icon with the correct aria-label for burn", () => {
    render(<EventTypeIcon eventType="burn" />);
    expect(screen.getByRole("img", { name: "burn event" })).toBeInTheDocument();
  });

  it("renders an icon with the correct aria-label for approve", () => {
    render(<EventTypeIcon eventType="approve" />);
    expect(screen.getByRole("img", { name: "approve event" })).toBeInTheDocument();
  });

  it("renders an icon with the correct aria-label for clawback", () => {
    render(<EventTypeIcon eventType="clawback" />);
    expect(screen.getByRole("img", { name: "clawback event" })).toBeInTheDocument();
  });

  it("renders an icon with the correct aria-label for set_admin", () => {
    render(<EventTypeIcon eventType="set_admin" />);
    expect(screen.getByRole("img", { name: "set_admin event" })).toBeInTheDocument();
  });

  it("renders an icon with the correct aria-label for set_authorized", () => {
    render(<EventTypeIcon eventType="set_authorized" />);
    expect(screen.getByRole("img", { name: "set_authorized event" })).toBeInTheDocument();
  });

  it("renders a fallback icon for an unknown event type", () => {
    render(<EventTypeIcon eventType="custom_unknown_event" />);
    expect(
      screen.getByRole("img", { name: "custom_unknown_event event" })
    ).toBeInTheDocument();
  });

  it("forwards size prop to the icon", () => {
    const { container } = render(<EventTypeIcon eventType="transfer" size={24} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("forwards className prop to the icon", () => {
    const { container } = render(
      <EventTypeIcon eventType="transfer" className="text-terminal-cyan" />
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-terminal-cyan");
  });

  it("renders consistently — same type always produces same icon element", () => {
    const { container: c1 } = render(<EventTypeIcon eventType="mint" />);
    const { container: c2 } = render(<EventTypeIcon eventType="mint" />);
    expect(c1.innerHTML).toBe(c2.innerHTML);
  });
});
