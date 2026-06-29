import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import React from "react"
import { TerminalTabs } from "./Tabs"

const meta: Meta<typeof TerminalTabs> = {
  title: "Terminal/Tabs",
  component: TerminalTabs,
  tags: ["autodocs"],
}
export default meta

type Story = StoryObj<typeof TerminalTabs>

export const Default: Story = {
  render: () => (
    <TerminalTabs
      tabs={[
        { id: "events", label: "Events" },
        { id: "contracts", label: "Contracts" },
        { id: "webhooks", label: "Webhooks" },
      ]}
    >
      <div className="space-y-1 text-sm text-terminal-green">
        <div>&gt; Loading event stream...</div>
        <div>EVT-001 — transfer — ledger 54321</div>
        <div>EVT-002 — mint — ledger 54322</div>
      </div>
    </TerminalTabs>
  ),
}

export const ApiExplorer: Story = {
  render: () => (
    <TerminalTabs
      tabs={[
        { id: "rest", label: "REST API" },
        { id: "graphql", label: "GraphQL" },
        { id: "webhooks", label: "Webhooks" },
      ]}
      activeTab="graphql"
    >
      <div className="text-sm text-terminal-cyan font-mono">
        &gt; POST /graphql — query GetEvents
      </div>
    </TerminalTabs>
  ),
}
