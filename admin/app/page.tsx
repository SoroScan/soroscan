'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from './components/Avatar';

// ── Types ──────────────────────────────────────────────────────────────────────

type LogLevel = 'INFO' | 'WARN' | 'EVENT' | 'SYS';

interface LogEntry {
  time: string;
  level: LogLevel;
  message: string;
  detail: string;
}

// ── Static data ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'DASHBOARD', icon: '▦', active: true },
  { label: 'EVENT EXPLORER', icon: '◎', active: false },
  { label: 'BLOCKS', icon: '⬡', active: false },
  { label: 'VALIDATORS', icon: '◈', active: false },
  { label: 'SYSTEM STATS', icon: '▲', active: false },
];

const LOG_ENTRIES: LogEntry[] = [
  { time: '14:32:01', level: 'INFO',  message: 'New block finalized: 48201992', detail: 'node7a · core' },
  { time: '14:31:45', level: 'WARN',  message: 'Node connection timeout',        detail: 'validator-109.2.1.44 · ingress-r1f4e' },
  { time: '14:31:10', level: 'EVENT', message: 'Smart contract deployed',         detail: 'dep · sgt · h1r2' },
  { time: '14:30:56', level: 'INFO',  message: 'Sync complete for batch H179',   detail: 'node4 · sync' },
  { time: '14:30:12', level: 'INFO',  message: 'New block finalized: 48201991',  detail: 'node2 · core' },
  { time: '14:28:44', level: 'SYS',   message: 'Garbage collection cycle run',   detail: 'runtime · gc' },
];

const LEVEL_COLORS: Record<LogLevel, string> = {
  INFO:  '#00ff88',
  WARN:  '#ff9900',
  EVENT: '#00ccff',
  SYS:   '#ffff00',
};

// ── Network health chart data (SVG path) ──────────────────────────────────────

const CHART_POINTS = [
  [0, 180], [40, 175], [80, 160], [120, 140], [160, 155],
  [200, 170], [240, 150], [280, 110], [320, 90], [360, 100],
  [400, 130], [440, 100], [480, 60], [520, 30], [560, 20],
  [600, 40], [640, 55], [680, 45], [720, 30],
] as [number, number][];

function buildPath(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, sub, icon }: {
  label: string; value: string; unit?: string; sub: string; icon: string;
}) {
  return (
    <div className="flex-1 rounded p-5 flex flex-col gap-3" style={{ background: '#0d1a0d', border: '1px solid #1a3a1a' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest" style={{ color: '#4a7a4a' }}>{label}</span>
        <span className="text-base" style={{ color: '#4a7a4a' }}>{icon}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold tracking-tight" style={{ color: '#00ff88', fontFamily: 'monospace' }}>{value}</span>
        {unit && <span className="text-sm mb-1" style={{ color: '#4a7a4a' }}>{unit}</span>}
      </div>
      <span className="text-xs" style={{ color: '#4a7a4a' }}>{sub}</span>
    </div>
  );
}

function SystemLog() {
  return (
    <div className="rounded flex flex-col h-full" style={{ background: '#0d1a0d', border: '1px solid #1a3a1a' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1a3a1a' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#4a7a4a' }}>▣</span>
          <span className="text-xs tracking-widest font-bold" style={{ color: '#00ff88' }}>SYSTEM_LOG</span>
        </div>
        <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#00ff88', display: 'inline-block' }} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {LOG_ENTRIES.map((entry, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-xs shrink-0 mt-0.5" style={{ color: '#4a7a4a', fontFamily: 'monospace' }}>{entry.time}</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs" style={{ color: LEVEL_COLORS[entry.level], fontFamily: 'monospace' }}>
                [{entry.level}] {entry.message}
              </span>
              <span className="text-xs" style={{ color: '#2a4a2a', fontFamily: 'monospace' }}>{entry.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetworkChart({ activeRange, setActiveRange }: {
  activeRange: string;
  setActiveRange: (r: string) => void;
}) {
  const path = buildPath(CHART_POINTS);
  const fillPath = path + ` L720,200 L0,200 Z`;

  return (
    <div className="rounded flex flex-col" style={{ background: '#0d1a0d', border: '1px solid #1a3a1a' }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #1a3a1a' }}>
        <span className="text-xs tracking-widest font-bold" style={{ color: '#00ff88' }}>NETWORK_HEALTH_VIZ</span>
        <div className="flex gap-1">
          {['1M', '24H', '7D'].map((r) => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className="text-xs px-2 py-0.5 rounded transition-colors"
              style={{
                background: activeRange === r ? '#00ff88' : 'transparent',
                color: activeRange === r ? '#0a0f0a' : '#4a7a4a',
                border: '1px solid',
                borderColor: activeRange === r ? '#00ff88' : '#1a3a1a',
                fontFamily: 'monospace',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <svg viewBox="0 0 720 200" className="w-full" style={{ height: 220 }}>
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[50, 100, 150].map((y) => (
            <line key={y} x1="0" y1={y} x2="720" y2={y} stroke="#1a3a1a" strokeWidth="1" />
          ))}
          {/* Fill */}
          <path d={fillPath} fill="url(#chartFill)" />
          {/* Line */}
          <path d={path} fill="none" stroke="#00ff88" strokeWidth="2" strokeLinejoin="round" />
          {/* Chart label */}
          <text x="360" y="115" textAnchor="middle" fill="#1a3a1a" fontSize="11" fontFamily="monospace">
            CHART RENDERING PIPELINE ACTIVE
          </text>
        </svg>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeRange, setActiveRange] = useState('24H');
  const [tps, setTps] = useState(3492);

  // Simulate live TPS updates
  useEffect(() => {
    const id = setInterval(() => {
      setTps((v) => v + Math.floor(Math.random() * 10) - 4);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0f0a', fontFamily: 'monospace' }}>

      {/* ── Sidebar ── */}
      <aside className="w-56 flex flex-col shrink-0" style={{ background: '#080d08', borderRight: '1px solid #1a3a1a' }}>
        {/* User */}
        <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid #1a3a1a' }}>
          <Avatar name="OPERATOR_01" size="md" color="#0d1a0d" />
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wider" style={{ color: '#00ff88' }}>OPERATOR_01</span>
            <span className="text-xs" style={{ color: '#4a7a4a' }}>V2.4.0-STABLE</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
              style={{
                background: item.active ? '#0d1a0d' : 'transparent',
                borderLeft: item.active ? '2px solid #00ff88' : '2px solid transparent',
                color: item.active ? '#00ff88' : '#4a7a4a',
              }}
            >
              <span className="text-xs">{item.icon}</span>
              <span className="text-xs tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Initiate scan */}
        <div className="p-4">
          <button
            className="w-full py-2 text-xs tracking-widest transition-colors"
            style={{ border: '1px solid #00ff88', color: '#00ff88', background: 'transparent' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#00ff8820'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row sm:flex-wrap">
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="/api-explorer"
          >
            ▶ INITIATE SCAN
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: '1px solid #1a3a1a' }}>
          <span className="text-sm font-bold tracking-widest" style={{ color: '#00ff88' }}>SOROSCAN_TERMINAL</span>
          <div className="flex-1 mx-8">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded max-w-xs" style={{ background: '#0d1a0d', border: '1px solid #1a3a1a' }}>
              <span className="text-xs" style={{ color: '#4a7a4a' }}>⌕</span>
              <span className="text-xs" style={{ color: '#2a4a2a' }}>SEARCH HASH / BLOCK / ACCOUNT</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-base cursor-pointer" style={{ color: '#4a7a4a' }}>⚙</span>
            <span className="text-base cursor-pointer" style={{ color: '#4a7a4a' }}>▣</span>
            <Avatar name="OPERATOR_01" size="sm" color="#0d1a0d" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 space-y-5">

          {/* Page title + live sync */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#00ff88' }}>NETWORK_OVERVIEW</h1>
              <p className="text-xs mt-1" style={{ color: '#4a7a4a' }}>Live metrics and system health monitoring.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ border: '1px solid #1a3a1a', background: '#0d1a0d' }}>
              <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#00ff88', display: 'inline-block' }} />
              <span className="text-xs tracking-widest" style={{ color: '#00ff88' }}>LIVE SYNC</span>
            </div>
          </div>

          {/* Stat cards */}
          <div className="flex gap-4">
            <StatCard
              label="CURRENT THROUGHPUT"
              value={tps.toLocaleString()}
              unit="TPS"
              sub="↑ +12.4% vs last hour"
              icon="↻"
            />
            <StatCard
              label="ACTIVE NODES"
              value="1,204"
              sub="99.8% Uptime SLA"
              icon="✦"
            API Explorer
          </Link>
          <Link
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="/webhook-tester"
          >
            <Image
              className="dark:invert"
              src="/file.svg"
              alt="Webhook Tester"
              width={16}
              height={16}
            />
            Webhook Tester
          </Link>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/window.svg"
              alt="Django Admin"
              width={16}
              height={16}
            />
            <StatCard
              label="BLOCK HEIGHT"
              value="48.2M"
              sub="Last block: ~2s ago"
              icon="◈"
            />
          </div>

          {/* Chart + log */}
          <div className="flex gap-4" style={{ minHeight: 340 }}>
            <div className="flex-1">
              <NetworkChart activeRange={activeRange} setActiveRange={setActiveRange} />
            </div>
            <div className="w-72 shrink-0">
              <SystemLog />
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
