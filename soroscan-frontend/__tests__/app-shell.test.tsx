import { render, screen, fireEvent } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// The notification center talks to Apollo — stub the data layer so the shell
// can be rendered without a live GraphQL client.
const mockUseNotifications = jest.fn();
jest.mock("@/components/notifications/useNotifications", () => ({
  useNotifications: () => mockUseNotifications(),
}));

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

describe("AppShell mobile navigation", () => {
  beforeEach(() => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: false,
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      clearAll: jest.fn(),
      refetch: jest.fn(),
    });
  });

  it("renders the app header with logo", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(screen.getByText("◆ SoroScan")).toBeInTheDocument();
  });

  it("shows hamburger toggle on mobile layout", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    const toggle = screen.getByRole("button", { name: /toggle menu/i });
    expect(toggle).toHaveAttribute("aria-controls", "app-sidebar");
    expect(toggle).toHaveClass("min-h-[44px]");
  });

  it("opens navigation drawer when hamburger is clicked", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /toggle menu/i }));

    const drawer = screen.getByRole("dialog", { name: /navigation/i });
    expect(drawer).toBeInTheDocument();
    expect(drawer.querySelector('a[href="/dashboard"]')).toBeInTheDocument();
    expect(drawer.querySelector('a[href="/contracts"]')).toBeInTheDocument();
  });

  it("renders child content in main area", () => {
    render(
      <AppShell>
        <div data-testid="page-content">Dashboard content</div>
      </AppShell>,
    );

    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("mounts the notification bell in the header", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(
      screen.getByRole("button", { name: /notifications/i }),
    ).toBeInTheDocument();
  });

  it("shows the unread count badge on the bell", () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 3,
      loading: false,
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      clearAll: jest.fn(),
      refetch: jest.fn(),
    });

    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(
      screen.getByRole("button", { name: /3 unread/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("links to the live event monitor", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(
      screen.getAllByRole("link", { name: /monitor/i }).length,
    ).toBeGreaterThan(0);
  });
});
