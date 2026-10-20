import React from "react"
import { render, screen } from "@testing-library/react"
import { Database, ShieldCheck, Zap } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"

describe("StatCard (Root Test Suite)", () => {
  it("renders a multi-card dashboard metrics grid", () => {
    render(
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Events"
          value="1,420,000"
          trendValue={12.4}
          icon={<Zap data-testid="zap-icon" />}
        />
        <StatCard
          title="Indexed Contracts"
          value={340}
          trendValue={-2.1}
          icon={<Database data-testid="db-icon" />}
        />
        <StatCard
          title="Network Security"
          value="100%"
          trendValue={0}
          icon={<ShieldCheck data-testid="shield-icon" />}
        />
      </div>
    )

    expect(screen.getByText("Total Events")).toBeInTheDocument()
    expect(screen.getByText("1,420,000")).toBeInTheDocument()
    expect(screen.getByText("12.4%")).toBeInTheDocument()

    expect(screen.getByText("Indexed Contracts")).toBeInTheDocument()
    expect(screen.getByText("340")).toBeInTheDocument()
    expect(screen.getByText("2.1%")).toBeInTheDocument()

    expect(screen.getByText("Network Security")).toBeInTheDocument()
    expect(screen.getByText("100%")).toBeInTheDocument()
    expect(screen.getByText("0%")).toBeInTheDocument()

    expect(screen.getAllByText("vs last month").length).toBe(3)
    expect(screen.getByTestId("zap-icon")).toBeInTheDocument()
    expect(screen.getByTestId("db-icon")).toBeInTheDocument()
    expect(screen.getByTestId("shield-icon")).toBeInTheDocument()
  })
})
