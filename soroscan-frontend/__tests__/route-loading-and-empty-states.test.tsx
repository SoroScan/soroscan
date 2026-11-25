import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Import all loading components

import RootLoading from "../app/loading";
import DashboardLoading from "../app/dashboard/loading";
import SettingsLoading from "../app/settings/loading";
import DocsLoading from "../app/docs/loading";
import ContractDependenciesLoading from "../app/contract-dependencies/loading";
import CostAnalysisLoading from "../app/cost-analysis/loading";
import ContractsLoading from "../app/contracts/loading";
import ContractDetailsLoading from "../app/contracts/[id]/loading";
import SourceCodeLoading from "../app/contracts/[id]/source/loading";
import TimelineLoading from "../app/contracts/[id]/timeline/loading";
import EventExplorerLoading from "../app/contracts/[id]/events/explorer/loading";
import CorrelationLoading from "../app/contracts/[id]/events/correlation/loading";
import WebhooksLoading from "../app/webhooks/loading";
import WebhookDetailsLoading from "../app/webhooks/[id]/loading";
import WebhookTestingLoading from "../app/webhooks/[id]/testing/loading";
import FilterBuilderLoading from "../app/webhooks/[id]/filter-builder/loading";

describe("Route Loading Skeletons", () => {
  describe("Root Loading (app/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<RootLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<RootLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /page loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should contain animated skeleton element", () => {
      const { container } = render(<RootLoading />);
      const skeleton = container.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("should have accessible loading status text", () => {
      render(<RootLoading />);
      const srText = screen.getByText("Loading page content...");
      expect(srText).toHaveClass("sr-only");
    });

    it("should have minimal content for root loading", () => {
      const { container } = render(<RootLoading />);
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
      expect(skeletons.length).toBeLessThanOrEqual(2);
    });
  });

  describe("Dashboard Loading (app/dashboard/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<DashboardLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<DashboardLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /dashboard loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should contain multiple animated skeleton elements", () => {
      const { container } = render(<DashboardLoading />);
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(5);
    });

    it("should show skeleton for metric cards", () => {
      const { container } = render(<DashboardLoading />);
      const cards = container.querySelectorAll(
        ".rounded.border.border-terminal-green\\/20.bg-black\\/30.p-4"
      );
      expect(cards.length).toBeGreaterThanOrEqual(7);
    });

    it("should have header, metrics, health status, and controls skeletons", () => {
      const { container } = render(<DashboardLoading />);
      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();

      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(4);
    });

    it("should have accessible loading status text", () => {
      render(<DashboardLoading />);
      const srText = screen.getByText("Loading dashboard data...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Settings Loading (app/settings/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<SettingsLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<SettingsLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /settings loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should contain multiple animated skeleton elements", () => {
      const { container } = render(<SettingsLoading />);
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(10);
    });

    it("should show skeleton for form inputs and sections", () => {
      const { container } = render(<SettingsLoading />);
      const sections = container.querySelectorAll(
        ".border.border-green-500\\/30.rounded"
      );
      expect(sections.length).toBeGreaterThanOrEqual(6);
    });

    it("should include sections for account, theme, display, notifications, and api keys", () => {
      const { container } = render(<SettingsLoading />);
      const header = container.querySelector("header");
      expect(header).toBeInTheDocument();

      const sections = container.querySelectorAll(
        ".border.border-green-500\\/30.rounded"
      );
      expect(sections.length).toBeGreaterThanOrEqual(6);
    });

    it("should have accessible loading status text", () => {
      render(<SettingsLoading />);
      const srText = screen.getByText("Loading settings page...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Docs Loading (app/docs/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<DocsLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<DocsLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /documentation loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should contain multiple animated skeleton elements", () => {
      const { container } = render(<DocsLoading />);
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(10);
    });

    it("should show skeleton for documentation content sections", () => {
      const { container } = render(<DocsLoading />);
      const article = container.querySelector("article");
      expect(article).toBeInTheDocument();

      const sections = container.querySelectorAll("section");
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it("should include header, content, code block, and toc skeletons", () => {
      const { container } = render(<DocsLoading />);
      const header = container.querySelector("header");
      const article = container.querySelector("article");
      const aside = container.querySelector("aside");

      expect(header).toBeInTheDocument();
      expect(article).toBeInTheDocument();
      expect(aside).toBeInTheDocument();
    });

    it("should have accessible loading status text", () => {
      render(<DocsLoading />);
      const srText = screen.getByText("Loading documentation content...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Contract Dependencies Loading (app/contract-dependencies/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<ContractDependenciesLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<ContractDependenciesLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /contract dependencies loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should contain multiple animated skeleton elements", () => {
      const { container } = render(<ContractDependenciesLoading />);
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(10);
    });

    it("should show skeleton for graph visualization", () => {
      const { container } = render(<ContractDependenciesLoading />);
      const vizContainer = container.querySelector(
        ".rounded.border.border-terminal-green\\/20.bg-black\\/30.p-6"
      );
      expect(vizContainer).toBeInTheDocument();
    });

    it("should include header, controls, visualization, legend, and details skeletons", () => {
      const { container } = render(<ContractDependenciesLoading />);
      const header = container.querySelector("header");
      const sections = container.querySelectorAll(
        ".rounded.border.border-terminal-green\\/20.bg-black\\/30"
      );

      expect(header).toBeInTheDocument();
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it("should have accessible loading status text", () => {
      render(<ContractDependenciesLoading />);
      const srText = screen.getByText("Loading contract dependencies graph...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Cost Analysis Loading (app/cost-analysis/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<CostAnalysisLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<CostAnalysisLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /cost analysis loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should contain multiple animated skeleton elements", () => {
      const { container } = render(<CostAnalysisLoading />);
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(15);
    });

    it("should show skeleton for summary metric cards", () => {
      const { container } = render(<CostAnalysisLoading />);
      const cards = container.querySelectorAll(
        ".rounded.border.border-terminal-green\\/20.bg-black\\/30.p-4"
      );
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it("should include header, metrics, chart, and table sections", () => {
      const { container } = render(<CostAnalysisLoading />);
      const header = container.querySelector("header");
      const sections = container.querySelectorAll("section");

      expect(header).toBeInTheDocument();
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it("should have table header and rows skeletons", () => {
      const { container } = render(<CostAnalysisLoading />);
      const tableRows = container.querySelectorAll(
        ".mb-3.grid.grid-cols-5.gap-4.border-b"
      );
      expect(tableRows.length).toBeGreaterThan(0);
    });

    it("should have pagination skeleton", () => {
      const { container } = render(<CostAnalysisLoading />);
      const paginationElements = container.querySelectorAll(".h-8.w-8");
      expect(paginationElements.length).toBeGreaterThan(0);
    });

    it("should have accessible loading status text", () => {
      render(<CostAnalysisLoading />);
      const srText = screen.getByText("Loading cost analysis data...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Contracts Loading (app/contracts/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<ContractsLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<ContractsLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /contracts list loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should contain table structure skeleton", () => {
      const { container } = render(<ContractsLoading />);
      const gridCols = container.querySelectorAll(".grid-cols-5");
      expect(gridCols.length).toBeGreaterThan(0);
    });

    it("should have header, filters, table, and pagination skeletons", () => {
      const { container } = render(<ContractsLoading />);
      const header = container.querySelector("header");
      const sections = container.querySelectorAll("section");

      expect(header).toBeInTheDocument();
      expect(sections.length).toBeGreaterThanOrEqual(1);
    });

    it("should have accessible loading status text", () => {
      render(<ContractsLoading />);
      const srText = screen.getByText("Loading contracts list...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Contract Details Loading (app/contracts/[id]/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<ContractDetailsLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<ContractDetailsLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /contract details loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should include header, tabs, and info cards skeletons", () => {
      const { container } = render(<ContractDetailsLoading />);
      const header = container.querySelector("header");
      const sections = container.querySelectorAll("section");

      expect(header).toBeInTheDocument();
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it("should have accessible loading status text", () => {
      render(<ContractDetailsLoading />);
      const srText = screen.getByText("Loading contract details...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Source Code Viewer Loading (app/contracts/[id]/source/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<SourceCodeLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<SourceCodeLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /source code viewer loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should include file tree and code editor skeletons", () => {
      const { container } = render(<SourceCodeLoading />);
      const aside = container.querySelector("aside");
      expect(aside).toBeInTheDocument();
    });

    it("should have accessible loading status text", () => {
      render(<SourceCodeLoading />);
      const srText = screen.getByText("Loading source code viewer...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Timeline Loading (app/contracts/[id]/timeline/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<TimelineLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<TimelineLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /transaction timeline loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should include filters and timeline events skeletons", () => {
      const { container } = render(<TimelineLoading />);
      const sections = container.querySelectorAll("section");
      const articles = container.querySelectorAll("article");

      expect(sections.length).toBeGreaterThanOrEqual(2);
      expect(articles.length).toBeGreaterThan(0);
    });

    it("should have accessible loading status text", () => {
      render(<TimelineLoading />);
      const srText = screen.getByText("Loading transaction timeline...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Event Explorer Loading (app/contracts/[id]/events/explorer/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<EventExplorerLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<EventExplorerLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /event explorer loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should include tabs, filters, and table skeletons", () => {
      const { container } = render(<EventExplorerLoading />);
      const sections = container.querySelectorAll("section");
      const gridCols = container.querySelectorAll(".grid-cols-5");

      expect(sections.length).toBeGreaterThanOrEqual(2);
      expect(gridCols.length).toBeGreaterThan(0);
    });

    it("should have accessible loading status text", () => {
      render(<EventExplorerLoading />);
      const srText = screen.getByText("Loading event explorer...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Correlation Diagram Loading (app/contracts/[id]/events/correlation/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<CorrelationLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<CorrelationLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /event correlation diagram loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should include visualization, legend, and details skeletons", () => {
      const { container } = render(<CorrelationLoading />);
      const sections = container.querySelectorAll("section");

      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it("should have accessible loading status text", () => {
      render(<CorrelationLoading />);
      const srText = screen.getByText("Loading event correlation diagram...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Webhooks List Loading (app/webhooks/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<WebhooksLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<WebhooksLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /webhooks list loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should include table structure skeleton", () => {
      const { container } = render(<WebhooksLoading />);
      const gridCols = container.querySelectorAll(".grid-cols-5");
      expect(gridCols.length).toBeGreaterThan(0);
    });

    it("should have accessible loading status text", () => {
      render(<WebhooksLoading />);
      const srText = screen.getByText("Loading webhooks list...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Webhook Details Loading (app/webhooks/[id]/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<WebhookDetailsLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<WebhookDetailsLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /webhook details loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should include form and info cards skeletons", () => {
      const { container } = render(<WebhookDetailsLoading />);
      const sections = container.querySelectorAll("section");

      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it("should have accessible loading status text", () => {
      render(<WebhookDetailsLoading />);
      const srText = screen.getByText("Loading webhook configuration...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Webhook Testing Interface Loading (app/webhooks/[id]/testing/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<WebhookTestingLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<WebhookTestingLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /webhook testing interface loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should include request form, response viewer, and history skeletons", () => {
      const { container } = render(<WebhookTestingLoading />);
      const sections = container.querySelectorAll("section");

      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it("should have accessible loading status text", () => {
      render(<WebhookTestingLoading />);
      const srText = screen.getByText("Loading webhook testing interface...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Filter Builder Loading (app/webhooks/[id]/filter-builder/loading.tsx)", () => {
    it("should render without errors", () => {
      const { container } = render(<FilterBuilderLoading />);
      expect(container).toBeInTheDocument();
    });

    it("should have loading status role", () => {
      render(<FilterBuilderLoading />);
      const loadingElement = screen.getByRole("status", {
        name: /filter builder loading/i,
      });
      expect(loadingElement).toBeInTheDocument();
    });

    it("should include query editor and template suggestions skeletons", () => {
      const { container } = render(<FilterBuilderLoading />);
      const sections = container.querySelectorAll("section");

      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it("should have accessible loading status text", () => {
      render(<FilterBuilderLoading />);
      const srText = screen.getByText("Loading filter builder...");
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Accessibility Requirements", () => {
    it("all loading components should have role=status", () => {
      const components = [
        <RootLoading />,
        <DashboardLoading />,
        <SettingsLoading />,
        <DocsLoading />,
        <ContractDependenciesLoading />,
        <CostAnalysisLoading />,
        <ContractsLoading />,
        <ContractDetailsLoading />,
        <SourceCodeLoading />,
        <TimelineLoading />,
        <EventExplorerLoading />,
        <CorrelationLoading />,
        <WebhooksLoading />,
        <WebhookDetailsLoading />,
        <WebhookTestingLoading />,
        <FilterBuilderLoading />,
      ];

      components.forEach((component) => {
        const { container } = render(component);
        const statusElement = container.querySelector('[role="status"]');
        expect(statusElement).toBeInTheDocument();
      });
    });

    it("all loading components should have accessible loading text", () => {
      const components = [
        { component: <RootLoading />, text: /loading page content/i },
        { component: <DashboardLoading />, text: /loading dashboard data/i },
        { component: <SettingsLoading />, text: /loading settings page/i },
        {
          component: <DocsLoading />,
          text: /loading documentation content/i,
        },
        {
          component: <ContractDependenciesLoading />,
          text: /loading contract dependencies/i,
        },
        { component: <CostAnalysisLoading />, text: /loading cost analysis/i },
        { component: <ContractsLoading />, text: /loading contracts list/i },
        { component: <ContractDetailsLoading />, text: /loading contract details/i },
        { component: <SourceCodeLoading />, text: /loading source code viewer/i },
        { component: <TimelineLoading />, text: /loading transaction timeline/i },
        { component: <EventExplorerLoading />, text: /loading event explorer/i },
        {
          component: <CorrelationLoading />,
          text: /loading event correlation diagram/i,
        },
        { component: <WebhooksLoading />, text: /loading webhooks list/i },
        {
          component: <WebhookDetailsLoading />,
          text: /loading webhook configuration/i,
        },
        {
          component: <WebhookTestingLoading />,
          text: /loading webhook testing interface/i,
        },
        { component: <FilterBuilderLoading />, text: /loading filter builder/i },
      ];

      components.forEach(({ component, text }) => {
        render(component);
        const srText = screen.getByText(text);
        expect(srText).toHaveClass("sr-only");
      });
    });

    it("skeleton elements should be hidden from screen readers with aria-hidden", () => {
      const components = [
        <ContractsLoading />,
        <ContractDetailsLoading />,
        <TimelineLoading />,
        <WebhooksLoading />,
        <WebhookTestingLoading />,
      ];

      components.forEach((component) => {
        const { container } = render(component);
        const skeletons = container.querySelectorAll(
          "[aria-hidden='true'].animate-pulse"
        );
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Skeleton Animation Styling", () => {
    it("dashboard loading should use animate-pulse class", () => {
      const { container } = render(<DashboardLoading />);
      const animatedElements = container.querySelectorAll(".animate-pulse");
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it("settings loading should use animate-pulse class", () => {
      const { container } = render(<SettingsLoading />);
      const animatedElements = container.querySelectorAll(".animate-pulse");
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it("skeletons should use appropriate background colors", () => {
      const { container: dashboardContainer } = render(<DashboardLoading />);
      const dashboardSkeletons = dashboardContainer.querySelectorAll(
        ".bg-gray-700\\/40"
      );
      expect(dashboardSkeletons.length).toBeGreaterThan(0);

      const { container: settingsContainer } = render(<SettingsLoading />);
      const settingsSkeletons = settingsContainer.querySelectorAll(
        ".bg-green-500\\/20"
      );
      expect(settingsSkeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Layout Structure Validation", () => {
    it("dashboard should maintain grid layout during loading", () => {
      const { container } = render(<DashboardLoading />);
      const gridElements = container.querySelectorAll(".grid");
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it("settings should maintain form layout during loading", () => {
      const { container } = render(<SettingsLoading />);
      const sections = container.querySelectorAll(
        ".border.border-green-500\\/30"
      );
      expect(sections.length).toBeGreaterThanOrEqual(6);
    });

    it("cost analysis should show table structure during loading", () => {
      const { container } = render(<CostAnalysisLoading />);
      const gridCols = container.querySelectorAll(".grid-cols-5");
      expect(gridCols.length).toBeGreaterThan(0);
    });
  });
});
