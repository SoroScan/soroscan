import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./Table"

const meta: Meta<typeof Table> = {
  title: "Terminal/Table",
  component: Table,
  tags: ["autodocs"],
}
export default meta

type Story = StoryObj<typeof Table>

const rows = [
  { id: "EVT-001", contract: "CXXXXX", type: "transfer", ledger: 54321, ts: "2026-06-29 10:00" },
  { id: "EVT-002", contract: "CYYYYY", type: "mint", ledger: 54322, ts: "2026-06-29 10:01" },
  { id: "EVT-003", contract: "CZZZZ", type: "burn", ledger: 54323, ts: "2026-06-29 10:02" },
]

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Live event stream — 3 records</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Contract</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Ledger</TableHead>
          <TableHead>Timestamp</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.id}</TableCell>
            <TableCell className="font-mono text-terminal-cyan">{r.contract}</TableCell>
            <TableCell>{r.type}</TableCell>
            <TableCell>{r.ledger.toLocaleString()}</TableCell>
            <TableCell className="text-terminal-gray">{r.ts}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
}
