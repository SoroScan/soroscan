import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Alert } from "./Alert"

const meta: Meta<typeof Alert> = {
  title: "Terminal/Alert",
  component: Alert,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "error"],
    },
    title: { control: "text" },
  },
}
export default meta

type Story = StoryObj<typeof Alert>

export const Info: Story = {
  args: {
    variant: "info",
    title: "New events available",
    children: "1,024 events indexed in the last ledger range.",
  },
}

export const Success: Story = {
  args: {
    variant: "success",
    title: "Contract deployed",
    children: "Contract CXXXXXXXX successfully deployed to TESTNET.",
  },
}

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Rate limit approaching",
    children: "80% of API quota consumed. Upgrade plan to avoid throttling.",
  },
}

export const Error: Story = {
  args: {
    variant: "error",
    title: "Ingestion failed",
    children: "Failed to connect to Soroban RPC. Check SOROBAN_RPC_URL.",
  },
}
