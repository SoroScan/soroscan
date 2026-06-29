import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./Button"

const meta: Meta<typeof Button> = {
  title: "Terminal/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "danger"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
}
export default meta

type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: "primary", children: "Execute" },
}

export const Secondary: Story = {
  args: { variant: "secondary", children: "Query" },
}

export const Danger: Story = {
  args: { variant: "danger", children: "Terminate" },
}

export const Small: Story = {
  args: { variant: "primary", size: "sm", children: "Run" },
}

export const Large: Story = {
  args: { variant: "primary", size: "lg", children: "Deploy Contract" },
}

export const Disabled: Story = {
  args: { variant: "primary", children: "Locked", disabled: true },
}
