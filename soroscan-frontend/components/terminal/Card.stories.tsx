import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Card } from "./Card"

const meta: Meta<typeof Card> = {
  title: "Terminal/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    showScanline: { control: "boolean" },
  },
}
export default meta

type Story = StoryObj<typeof Card>

export const Default: Story = {
  args: {
    title: "CONTRACT_DATA",
    children: (
      <div className="text-terminal-green font-mono text-sm space-y-1">
        <div>contract_id: CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX</div>
        <div>ledger: 54,321</div>
        <div>status: ACTIVE</div>
      </div>
    ),
  },
}

export const WithoutTitle: Story = {
  args: {
    children: (
      <p className="text-terminal-green/80 text-sm font-mono">
        Soroban smart contract event stream — 1,024 events indexed.
      </p>
    ),
  },
}

export const CyanVariant: Story = {
  args: {
    title: "QUERY_RESULT",
    className: "border-terminal-cyan",
    children: (
      <p className="text-terminal-cyan text-sm font-mono">
        &gt; SELECT * FROM events WHERE contract_id = &#39;CXXX&#39;;
      </p>
    ),
  },
}
