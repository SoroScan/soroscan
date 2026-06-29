"use client"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import React, { useState } from "react"
import { Input } from "./Input"

const meta: Meta = {
  title: "Terminal/TerminalInput",
  tags: ["autodocs"],
}
export default meta

type Story = StoryObj

const TerminalPromptDemo = () => {
  const [history, setHistory] = useState<string[]>([
    "> SoroScan v1.0.0 — Soroban Event Indexer",
    "> Connected to mainnet.stellar.org",
    "> Type a command and press Enter",
  ])
  const [cmd, setCmd] = useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && cmd.trim()) {
      setHistory((h) => [...h, `> ${cmd}`, `  [OK] Command executed.`])
      setCmd("")
    }
  }

  return (
    <div className="border border-terminal-green bg-terminal-black p-4 font-terminal-mono text-sm w-full max-w-xl">
      <div className="space-y-1 mb-4 min-h-[100px]">
        {history.map((line, i) => (
          <div key={i} className="text-terminal-green/90">
            {line}
          </div>
        ))}
      </div>
      <Input
        label="COMMAND"
        value={cmd}
        onChange={(e) => setCmd(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="query events --contract CXXX"
        autoFocus
      />
    </div>
  )
}

export const TerminalPrompt: Story = {
  render: () => <TerminalPromptDemo />,
}

export const SimpleInput: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <Input label="CONTRACT_ID" placeholder="CXXXXXXXXXX" />
      <Input label="EVENT_TYPE" placeholder="transfer" />
      <Input label="LEDGER_FROM" type="number" placeholder="54000" />
    </div>
  ),
}
