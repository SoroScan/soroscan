import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CodeBlock } from "./CodeBlock"

const meta: Meta<typeof CodeBlock> = {
  title: "Terminal/CodeBlock",
  component: CodeBlock,
  tags: ["autodocs"],
  argTypes: {
    language: { control: "text" },
    filename: { control: "text" },
  },
}
export default meta

type Story = StoryObj<typeof CodeBlock>

export const Rust: Story = {
  args: {
    language: "rust",
    filename: "soroscan_core/src/lib.rs",
    code: `#[contractimpl]
impl SoroScanCore {
    pub fn emit_event(env: Env, data: EventRecord) {
        env.events().publish(
            (Symbol::new(&env, "soroscan"), Symbol::new(&env, "event")),
            data,
        );
    }
}`,
  },
}

export const GraphQL: Story = {
  args: {
    language: "graphql",
    filename: "query.graphql",
    code: `query GetEvents($contractId: String!) {
  events(contractId: $contractId, first: 10) {
    edges {
      node {
        id
        eventType
        ledgerSequence
        createdAt
      }
    }
  }
}`,
  },
}

export const Shell: Story = {
  args: {
    language: "bash",
    code: `# Deploy to testnet
soroban contract deploy \\
  --wasm target/wasm32-unknown-unknown/release/soroscan_core.wasm \\
  --network testnet`,
  },
}
