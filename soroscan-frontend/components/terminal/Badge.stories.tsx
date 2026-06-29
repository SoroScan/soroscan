import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import React from "react"
import { Badge } from "./Badge"

const meta: Meta<typeof Badge> = {
  title: "Terminal/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "cyan", "danger", "warning", "muted"],
    },
    pulse: { control: "boolean" },
  },
}
export default meta

type Story = StoryObj<typeof Badge>

export const Online: Story = {
  args: { variant: "default", children: "ONLINE", pulse: true },
}

export const Offline: Story = {
  args: { variant: "danger", children: "OFFLINE" },
}

export const Processing: Story = {
  args: { variant: "warning", children: "PROCESSING", pulse: true },
}

export const Info: Story = {
  args: { variant: "cyan", children: "TESTNET" },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default" pulse>ONLINE</Badge>
      <Badge variant="cyan">TESTNET</Badge>
      <Badge variant="warning" pulse>SYNCING</Badge>
      <Badge variant="danger">FAILED</Badge>
      <Badge variant="muted">ARCHIVED</Badge>
    </div>
  ),
}
