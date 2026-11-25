import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import type { NotificationItem as NotificationRecord } from "@/components/notifications/useNotifications";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const notification: NotificationRecord = {
  id: 42,
  notificationType: "contract_paused",
  title: "Contract paused",
  message: "Contract activity was paused.",
  link: "/contracts/42",
  isRead: false,
  createdAt: "2026-11-23T11:58:00.000Z",
};

describe("NotificationItem", () => {
  beforeEach(() => {
    mockPush.mockClear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-11-23T12:00:00.000Z"));
  });

  afterEach(() => jest.useRealTimers());

  it("shows an unread notification with a type label, message and relative time", () => {
    const { container } = render(<NotificationItem notification={notification} onMarkRead={jest.fn()} />);

    expect(screen.getByRole("listitem", { name: "CONTRACT: Contract paused" })).toBeInTheDocument();
    expect(screen.getByText("Contract activity was paused.")).toBeInTheDocument();
    expect(screen.getByText("2m ago")).toBeInTheDocument();
    expect(container.querySelector('span[aria-hidden="true"]')).not.toBeNull();
  });

  it("marks an unread item as read and navigates to its link when clicked", () => {
    const onMarkRead = jest.fn();
    render(<NotificationItem notification={notification} onMarkRead={onMarkRead} />);

    fireEvent.click(screen.getByRole("listitem"));
    expect(onMarkRead).toHaveBeenCalledTimes(1);
    expect(onMarkRead).toHaveBeenCalledWith(42);
    expect(mockPush).toHaveBeenCalledWith("/contracts/42");
  });

  it("does not mark an already-read item again", () => {
    const onMarkRead = jest.fn();
    const { container } = render(
      <NotificationItem notification={{ ...notification, isRead: true }} onMarkRead={onMarkRead} />
    );

    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();
    fireEvent.click(screen.getByRole("listitem"));
    expect(onMarkRead).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/contracts/42");
  });

  it("handles a notification without a link without attempting navigation", () => {
    const onMarkRead = jest.fn();
    render(<NotificationItem notification={{ ...notification, link: "" }} onMarkRead={onMarkRead} />);

    fireEvent.click(screen.getByRole("listitem"));
    expect(onMarkRead).toHaveBeenCalledWith(42);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("uses an uppercase fallback label for unknown types and renders long text", () => {
    const longMessage = "Audit event ".repeat(60);
    render(
      <NotificationItem
        notification={{ ...notification, notificationType: "custom_event", title: "New event", message: longMessage }}
        onMarkRead={jest.fn()}
      />
    );

    expect(screen.getByRole("listitem", { name: "CUSTOM_EVENT: New event" })).toBeInTheDocument();
    expect(screen.getByText(longMessage)).toHaveClass("line-clamp-2");
  });
});
