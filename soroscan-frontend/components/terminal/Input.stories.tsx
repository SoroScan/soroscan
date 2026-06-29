import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Input } from "./Input"

const meta: Meta<typeof Input> = {
  title: "Terminal/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    type: { control: "select", options: ["text", "password", "email", "search"] },
  },
}
export default meta

type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: { placeholder: "Enter contract ID..." },
}

export const WithLabel: Story = {
  args: { label: "CONTRACT_ID", placeholder: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
}

export const Password: Story = {
  args: { label: "API_KEY", type: "password", placeholder: "sk-••••••••" },
}

export const Disabled: Story = {
  args: { label: "STATUS", value: "LOCKED", disabled: true },
}
