import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import React from "react"
import { TerminalWindow } from "./TerminalWindow"

const meta: Meta<typeof TerminalWindow> = {
  title: "Terminal/TerminalWindow",
  component: TerminalWindow,
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    status: {
      control: "select",
      options: ["online", "offline", "processing"],
    },
  },
}
export default meta

type Story = StoryObj<typeof TerminalWindow>

export const Online: Story = {
  args: {
    title: "SOROSCAN_INDEXER",
    status: "online",
    children: (
      <div className="space-y-1 text-sm">
        <div className="text-terminal-gray">[10:00:01] Starting event ingestion...</div>
        <div>[10:00:02] Connected to Soroban RPC at mainnet.stellar.org</div>
        <div>[10:00:03] Ledger range: 54300 – 54323</div>
        <div className="text-terminal-cyan">[10:00:04] Indexed 1,024 events successfully.</div>
        <div className="animate-pulse">█</div>
      </div>
    ),
  },
}

export const Processing: Story = {
  args: {
    title: "BACKFILL_WORKER",
    status: "processing",
    children: (
      <div className="space-y-1 text-sm">
        <div>[BACKFILL] Processing ledgers 40000 – 54323...</div>
        <div className="text-terminal-warning">[PROGRESS] 67% complete — 9,412 ledgers remaining</div>
        <div className="animate-pulse text-terminal-warning">▓▓▓▓▓▓▒▒▒░░░</div>
      </div>
    ),
  },
}

export const Offline: Story = {
  args: {
    title: "WEBHOOK_WORKER",
    status: "offline",
    children: (
      <div className="space-y-1 text-sm text-terminal-danger">
        <div>[ERROR] Redis connection refused.</div>
        <div>[ERROR] Retrying in 30s... (attempt 3/5)</div>
      </div>
    ),
  },
}
