"use client"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import React, { useState } from "react"
import { Modal } from "./Modal"
import { Button } from "./Button"

const meta: Meta<typeof Modal> = {
  title: "Terminal/Modal",
  component: Modal,
  tags: ["autodocs"],
}
export default meta

type Story = StoryObj<typeof Modal>

const ModalDemo = ({ title }: { title?: string }) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-3 text-sm">
          <p>&gt; Confirm contract deployment to TESTNET?</p>
          <p className="text-terminal-cyan">contract_id: CXXXXXXXXXXXXXXXX</p>
          <p className="text-terminal-gray">ledger_cost: 0.01 XLM</p>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => setOpen(false)}>Confirm</Button>
            <Button size="sm" variant="danger" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export const Default: Story = {
  render: () => <ModalDemo title="DEPLOY_CONTRACT" />,
}

export const Confirmation: Story = {
  render: () => <ModalDemo title="CONFIRM_ACTION" />,
}
