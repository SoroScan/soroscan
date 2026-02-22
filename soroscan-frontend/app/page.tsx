"use client"

import * as React from "react"
import { Button } from "@/components/terminal/Button"
import { Card } from "@/components/terminal/Card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/terminal/Table"
import { Input } from "@/components/terminal/Input"

export default function Home() {
  return (
    <div className="min-h-screen font-terminal-mono selection:bg-terminal-green selection:text-terminal-black">
      {/* Navigation */}
      <nav className="border-b border-terminal-green/30 px-8 py-4 flex justify-between items-center bg-terminal-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-terminal-green text-xl font-bold tracking-tighter">
            [SOROSCAN_PROJECT]
          </span>
        </div>
        <div className="hidden md:flex gap-8 text-xs text-terminal-gray uppercase tracking-widest">
          <a href="#" className="hover:text-terminal-green transition-colors">Explorer</a>
          <a href="#" className="hover:text-terminal-green transition-colors">API_Docs</a>
          <a href="#" className="hover:text-terminal-green transition-colors">GitHub</a>
          <a href="#" className="hover:text-terminal-green transition-colors">Terminal_Access</a>
        </div>
        <Button size="sm" variant="secondary">CONNECT_WALLET</Button>
      </nav>

      <main className="container mx-auto px-8 py-16 space-y-24">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center space-y-8 py-12">
          <div className="relative">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-terminal-green animate-pulse">
              SOROSCAN
            </h1>
            <div className="absolute -top-4 -right-8 text-xs bg-terminal-cyan text-terminal-black px-1 font-bold">
              v1.0.42_STABLE
            </div>
          </div>
          <div className="max-w-2xl space-y-4">
            <p className="text-xl md:text-2xl text-terminal-cyan border-y border-terminal-cyan/20 py-4">
              &gt; THE_GRAPH_FOR_SOROBAN
            </p>
            <p className="text-terminal-gray max-w-lg mx-auto">
              Index, query, and subscribe to smart contract events on the Stellar blockchain. 
              Reliable event ingestion for high-availability decentralized applications.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" variant="primary">START_INDEXING</Button>
            <Button size="lg" variant="secondary">VIEW_DOCUMENTATION</Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-terminal-green whitespace-nowrap">
              [SYSTEM_CAPABILITIES]
            </h2>
            <div className="h-[2px] w-full bg-terminal-green/20" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="SOROBAN_NATIVE" className="h-full">
              <p className="text-sm leading-relaxed">
                Rust smart contract with admin-controlled indexer whitelist and standardized event emission protocols.
              </p>
            </Card>
            <Card title="DJANGO_BACKEND" className="h-full">
              <p className="text-sm leading-relaxed">
                Production-ready REST API with Django Rest Framework and robust PostgreSQL storage architecture.
              </p>
            </Card>
            <Card title="GRAPHQL_PLAYGROUND" className="h-full">
              <p className="text-sm leading-relaxed">
                Flexible event queries with Strawberry GraphQL. Filter by contract, type, ledger, or time range.
              </p>
            </Card>
            <Card title="WEBHOOK_SUBS" className="h-full">
              <p className="text-sm leading-relaxed">
                Real-time event notifications with HMAC-signed payloads powered by Celery and Redis message brokers.
              </p>
            </Card>
            <Card title="HORIZON_INTEGRATION" className="h-full">
              <p className="text-sm leading-relaxed">
                Seamlessly stream ledger events directly from Stellar's Horizon API using optimized stellar-sdk workers.
              </p>
            </Card>
            <Card title="DEVELOPER_FIRST" className="h-full">
              <p className="text-sm leading-relaxed">
                Built for engineers who need reliable event data without managing complex indexing infrastructure.
              </p>
            </Card>
          </div>
        </section>

        {/* Event Stream Section (Table) */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-terminal-green whitespace-nowrap">
              [LIVE_EVENT_STREAM]
            </h2>
            <div className="h-[2px] w-full bg-terminal-green/20" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TIMESTAMP</TableHead>
                <TableHead>CONTRACT_ID</TableHead>
                <TableHead>EVENT_TYPE</TableHead>
                <TableHead>STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2026-02-22T21:42:01</TableCell>
                <TableCell className="text-terminal-cyan">C...9X4Z</TableCell>
                <TableCell>LIQUIDITY_ADD</TableCell>
                <TableCell className="text-terminal-green">PROCESSED</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2026-02-22T21:41:55</TableCell>
                <TableCell className="text-terminal-cyan">C...2B8Y</TableCell>
                <TableCell>SWAP_COMPLETE</TableCell>
                <TableCell className="text-terminal-green">PROCESSED</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2026-02-22T21:41:48</TableCell>
                <TableCell className="text-terminal-cyan">C...F7K1</TableCell>
                <TableCell>VAULT_DEPOSIT</TableCell>
                <TableCell className="text-terminal-warning">INGESTING</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2026-02-22T21:41:30</TableCell>
                <TableCell className="text-terminal-cyan">C...A9S0</TableCell>
                <TableCell>GOV_PROPOSAL</TableCell>
                <TableCell className="text-terminal-green">PROCESSED</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        {/* Footer/CTA */}
        <section className="border-terminal border-terminal-cyan/30 p-12 text-center space-y-8 relative overflow-hidden">
          {/* Decorative bits */}
          <div className="absolute top-4 left-4 text-[10px] text-terminal-cyan/40">SYSTEM_OVERRIDE_ACTIVE</div>
          <div className="absolute bottom-4 right-4 text-[10px] text-terminal-cyan/40">AUTH_MODE: DEV_ADMIN</div>
          
          <h2 className="text-3xl font-bold text-terminal-cyan tracking-tight">
            READY_TO_UPLINK?
          </h2>
          <p className="text-terminal-gray max-w-md mx-auto">
            Join the decentralized indexing network and fuel your Soroban dApps with high-fidelity event data.
          </p>
          <div className="flex justify-center gap-6">
            <Button variant="primary" size="lg">CREATE_API_KEY</Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-terminal-green/30 p-8 flex flex-col md:flex-row justify-between items-center text-[10px] text-terminal-gray mt-24 gap-4">
        <div className="flex gap-8">
          <span>&copy; 2026 SOROSCAN_INDEXER_SERVICES</span>
          <a href="#" className="hover:text-terminal-green underline underline-offset-4">TERMS_OF_SERVICE</a>
          <a href="#" className="hover:text-terminal-green underline underline-offset-4">PRIVACY_POLICY</a>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
            STELAR_MAINNET_UPLINK: ONLINE
          </span>
          <span className="border border-terminal-gray/30 px-2 py-0.5">
            LATENCY: 42MS
          </span>
        </div>
      </footer>

      {/* Global Background Deco */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-20">
         <div className="absolute top-0 left-0 w-full h-1 bg-terminal-green shadow-glow-green animate-[scan_8s_linear_infinite]" />
         <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
    </div>
  )
}
