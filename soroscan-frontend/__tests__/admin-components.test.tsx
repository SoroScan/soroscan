import React from "react"
import { render, screen } from "@testing-library/react"
import { Activity, Database, HardDrive, Webhook } from "lucide-react"
import { MetricsCard } from "@/app/admin/components/MetricsCard"
import { EventChart } from "@/app/admin/components/EventChart"
import { WebhookStats } from "@/app/admin/components/WebhookStats"
import { ErrorLog } from "@/app/admin/components/ErrorLog"

describe("Admin Dashboard Chart & Metric Components (Root Entry)", () => {
  describe("Metrics Overview Panel", () => {
    it("renders complete set of admin metric cards with distinct metrics", () => {
      render(
        <div>
          <MetricsCard title="Events Today" value={1250} icon={Activity} />
          <MetricsCard title="Total Events" value={54200} icon={HardDrive} color="cyan" />
          <MetricsCard
            title="Webhook Health"
            value="99%"
            subValue="Last 24h Success Rate"
            icon={Webhook}
            color="green"
          />
          <MetricsCard title="Active Contracts" value={18} icon={Database} color="gray" />
        </div>
      )

      expect(screen.getByText("[Events Today]")).toBeInTheDocument()
      expect(screen.getByText("1250")).toBeInTheDocument()

      expect(screen.getByText("[Total Events]")).toBeInTheDocument()
      expect(screen.getByText("54200")).toBeInTheDocument()

      expect(screen.getByText("[Webhook Health]")).toBeInTheDocument()
      expect(screen.getByText("99%")).toBeInTheDocument()
      expect(screen.getByText("Last 24h Success Rate")).toBeInTheDocument()

      expect(screen.getByText("[Active Contracts]")).toBeInTheDocument()
      expect(screen.getByText("18")).toBeInTheDocument()
    })
  })

  describe("Analytics & Ingestion Monitoring", () => {
    it("renders timeline chart with populated data points alongside webhook stats", () => {
      const dataPoints = [
        { label: "1h ago", value: 120 },
        { label: "2h ago", value: 300 },
      ]

      render(
        <div>
          <EventChart title="Ingestion Timeline" data={dataPoints} />
          <WebhookStats successRate={96.5} avgTime={185} />
        </div>
      )

      expect(screen.getByText("[Ingestion Timeline]")).toBeInTheDocument()
      expect(screen.getByText("1h ago")).toBeInTheDocument()
      expect(screen.getByText("2h ago")).toBeInTheDocument()
      expect(screen.getByText("300")).toBeInTheDocument()

      expect(screen.getByText("[WEBHOOK_HEALTH]")).toBeInTheDocument()
      expect(screen.getByText("97%")).toBeInTheDocument()
      expect(screen.getByText("185 ms")).toBeInTheDocument()
    })

    it("renders gracefully under empty data conditions across all chart and metric components", () => {
      render(
        <div>
          <MetricsCard title="Empty Count" value={0} icon={Activity} />
          <EventChart title="Empty Chart" data={[]} />
          <WebhookStats successRate={0} avgTime={0} />
          <ErrorLog errors={[]} />
        </div>
      )

      expect(screen.getByText("[Empty Count]")).toBeInTheDocument()
      expect(screen.getByText("0")).toBeInTheDocument()

      expect(screen.getByText("[Empty Chart]")).toBeInTheDocument()
      expect(screen.getByText("Events/Hour")).toBeInTheDocument()

      expect(screen.getByText("0%")).toBeInTheDocument()
      expect(screen.getByText("0 ms")).toBeInTheDocument()

      expect(screen.getByText("NO_CONTENT_FOUND: system health is optimal.")).toBeInTheDocument()
    })
  })
})
