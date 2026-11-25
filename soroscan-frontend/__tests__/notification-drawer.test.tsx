import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";
import type { NotificationItem as NotificationRecord } from "@/components/notifications/useNotifications";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const record: NotificationRecord = {
  id: 1,
  notificationType: "system",
  title: "System update",
  message: "Your dashboard was updated.",
  link: "",
  isRead: false,
  createdAt: "2026-11-23T11:00:00.000Z",
};

const callbacks = {
  onClose: jest.fn(),
  onMarkRead: jest.fn(),
  onMarkAllRead: jest.fn(),
  onClearAll: jest.fn(),
  onFilterChange: jest.fn(),
};

type DrawerProps = ComponentProps<typeof NotificationDrawer>;
const baseProps: DrawerProps = {
  isOpen: true,
  notifications: [],
  loading: false,
  filter: "all",
  ...callbacks,
};

function show(overrides: Partial<DrawerProps> = {}) {
  return render(<NotificationDrawer {...baseProps} {...overrides} />);
}

describe("NotificationDrawer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders an accessible dialog and an empty state when no notifications exist", () => {
    show();

    expect(screen.getByRole("dialog", { name: "Notification center" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("All clear! No new notifications")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Notification list" })).toHaveAttribute("aria-busy", "false");
  });

  it("renders a loading state instead of the empty state", () => {
    show({ loading: true });

    expect(screen.getByText("LOADING...")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-notification-state")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Notification list" })).toHaveAttribute("aria-busy", "true");
  });

  it("renders notifications and passes a clicked unread item's ID to onMarkRead", () => {
    show({ notifications: [record, { ...record, id: 2, title: "Other notice", isRead: true }] });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(screen.getByRole("listitem", { name: "SYSTEM: System update" }));
    expect(callbacks.onMarkRead).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("listitem", { name: "SYSTEM: Other notice" }));
    expect(callbacks.onMarkRead).toHaveBeenCalledTimes(1);
  });

  it("wires mark-all, clear-all and filter actions to their callbacks", () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear all notifications" }));
    fireEvent.click(screen.getByRole("button", { name: "WEBHOOK" }));

    expect(callbacks.onMarkAllRead).toHaveBeenCalledTimes(1);
    expect(callbacks.onClearAll).toHaveBeenCalledTimes(1);
    expect(callbacks.onFilterChange).toHaveBeenCalledWith("webhook_failure");
  });

  it("marks the selected filter as pressed", () => {
    show({ filter: "alert" });

    expect(screen.getByRole("button", { name: "ALERT" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "ALL" })).toHaveAttribute("aria-pressed", "false");
  });

  it("closes from the header button, Escape key and outside click", () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: "Close notification drawer" }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.mouseDown(document.body);
    expect(callbacks.onClose).toHaveBeenCalledTimes(3);
  });

  it("does not close for clicks inside the drawer", () => {
    show();

    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(callbacks.onClose).not.toHaveBeenCalled();
  });

  it("keeps the closed drawer off-screen and ignores Escape/outside mousedown", () => {
    show({ isOpen: false });

    expect(screen.getByRole("dialog")).toHaveClass("translate-x-full");
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.mouseDown(document.body);
    expect(callbacks.onClose).not.toHaveBeenCalled();
  });

  it("does not crash when a notification has a missing optional message in a partial payload", () => {
    const incomplete = { ...record, message: undefined } as unknown as NotificationRecord;
    show({ notifications: [incomplete] });

    expect(screen.getByRole("listitem", { name: "SYSTEM: System update" })).toBeInTheDocument();
    expect(screen.queryByTestId("empty-notification-state")).not.toBeInTheDocument();
  });

  it("renders a full list of 50 notifications without losing items", () => {
    const many = Array.from({ length: 50 }, (_, index) => ({ ...record, id: index + 1, title: `Notice ${index + 1}` }));
    show({ notifications: many });

    expect(screen.getAllByRole("listitem")).toHaveLength(50);
    expect(screen.getByText("Notice 50")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-notification-state")).not.toBeInTheDocument();
  });
});
