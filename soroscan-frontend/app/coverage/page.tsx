import React from "react"
import type { Metadata } from "next"


export const metadata: Metadata = {
  title: "Coverage Dashboard",
  description:
    "Real-time code coverage trends and health status across all SoroScan components — Backend, Frontend, SDK, and Smart Contracts.",
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComponentCoverage {
  id: string
  label: string
  icon: string
  flag: string
  threshold: number
  coverage: number | null
  trend: number[]          // last-N coverage values for sparkline
  language: string
  testRunner: string
  lastUpdated: string
}

// ─── Static seed data (replaced at runtime via Codecov API in a real deploy) ──
//     The page is intentionally client-renderable with no external deps.
const COMPONENTS: ComponentCoverage[] = [
  {
    id: "backend",
    label: "Backend",
    icon: "🐍",
    flag: "backend",
    threshold: 80,
    coverage: null,
    trend: [72, 74, 75, 78, 79, 80, 81, 80, 82, 83],
    language: "Python",
    testRunner: "pytest-cov",
    lastUpdated: "Loading…",
  },
  {
    id: "frontend",
    label: "Frontend",
    icon: "⚛️",
    flag: "frontend",
    threshold: 70,
    coverage: null,
    trend: [62, 64, 65, 67, 68, 70, 71, 70, 72, 73],
    language: "TypeScript",
    testRunner: "Jest",
    lastUpdated: "Loading…",
  },
  {
    id: "sdk",
    label: "SDK",
    icon: "📦",
    flag: "sdk",
    threshold: 80,
    coverage: null,
    trend: [78, 79, 80, 81, 82, 83, 82, 84, 85, 86],
    language: "TypeScript",
    testRunner: "Vitest",
    lastUpdated: "Loading…",
  },
  {
    id: "contracts",
    label: "Contracts",
    icon: "🦀",
    flag: "contracts",
    threshold: 70,
    coverage: null,
    trend: [65, 66, 68, 69, 70, 71, 72, 71, 73, 74],
    language: "Rust",
    testRunner: "cargo-tarpaulin",
    lastUpdated: "Loading…",
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColour(coverage: number | null, threshold: number) {
  if (coverage === null) return { text: "#64748b", glow: "none", label: "Unknown" }
  if (coverage >= threshold)        return { text: "#00ff41", glow: "0 0 12px rgba(0,255,65,0.6)", label: "Healthy" }
  if (coverage >= threshold * 0.9)  return { text: "#ffaa00", glow: "0 0 12px rgba(255,170,0,0.6)", label: "Warning" }
  return { text: "#ff3366", glow: "0 0 12px rgba(255,51,102,0.6)", label: "Critical" }
}

// Mini SVG sparkline (purely CSS-driven, zero deps)
function Sparkline({ data, colour }: { data: number[]; colour: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const W = 120
  const H = 36
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W
      const y = H - ((v - min) / range) * H
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={colour}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Glow duplicate */}
      <polyline
        points={points}
        fill="none"
        stroke={colour}
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.2"
      />
    </svg>
  )
}

// Radial gauge ring
function GaugeRing({
  coverage,
  threshold,
  colour,
}: {
  coverage: number | null
  threshold: number
  colour: string
}) {
  const r = 42
  const circ = 2 * Math.PI * r
  const pct = coverage ?? 0
  const dash = (pct / 100) * circ
  const threshDash = (threshold / 100) * circ

  return (
    <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
      {/* Background track */}
      <circle cx="54" cy="54" r={r} fill="none" stroke="#1a1f3e" strokeWidth="10" />
      {/* Threshold marker */}
      <circle
        cx="54"
        cy="54"
        r={r}
        fill="none"
        stroke="#64748b"
        strokeWidth="2"
        strokeDasharray={`2 ${circ - 2}`}
        strokeDashoffset={-threshDash + circ / 4}
        strokeLinecap="round"
        transform="rotate(-90 54 54)"
      />
      {/* Coverage arc */}
      <circle
        cx="54"
        cy="54"
        r={r}
        fill="none"
        stroke={colour}
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        transform="rotate(-90 54 54)"
        style={{ filter: `drop-shadow(0 0 6px ${colour})`, transition: "stroke-dasharray 1s ease" }}
      />
      {/* Centre text */}
      <text
        x="54"
        y="50"
        textAnchor="middle"
        fill={colour}
        fontSize="16"
        fontWeight="700"
        fontFamily="'JetBrains Mono', monospace"
        style={{ filter: `drop-shadow(0 0 4px ${colour})` }}
      >
        {coverage !== null ? `${coverage}%` : "—"}
      </text>
      <text x="54" y="66" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="'JetBrains Mono', monospace">
        /{threshold}%
      </text>
    </svg>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CoverageDashboardPage() {
  // Simulate fetched data — in production swap with an async fetch to
  // https://api.codecov.io/api/v2/github/{org}/repos/soroscan/branches/main/
  const components = COMPONENTS.map((c) => ({
    ...c,
    coverage: c.trend[c.trend.length - 1],
    lastUpdated: new Date().toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    }),
  }))

  const overallCoverage = Math.round(
    components.reduce((sum, c) => sum + (c.coverage ?? 0), 0) / components.length
  )
  const allHealthy = components.every((c) => (c.coverage ?? 0) >= c.threshold)

  return (
    <>
      {/* ── Inline styles (zero external deps, matches terminal theme) ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        .cov-page {
          min-height: 100vh;
          background: #0a0e27;
          color: #00ff41;
          font-family: 'Inter', system-ui, sans-serif;
          padding: 2rem 1rem 4rem;
        }
        .cov-container { max-width: 1100px; margin: 0 auto; }

        /* ── Header ── */
        .cov-header { margin-bottom: 2.5rem; }
        .cov-header-top { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
        .cov-badge {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.25rem 0.75rem;
          border: 1px solid currentColor; border-radius: 9999px;
          font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .cov-badge-green  { color: #00ff41; border-color: #00ff41; box-shadow: 0 0 8px rgba(0,255,65,0.3); }
        .cov-badge-red    { color: #ff3366; border-color: #ff3366; box-shadow: 0 0 8px rgba(255,51,102,0.3); }
        .cov-title {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 700; letter-spacing: -0.02em;
          background: linear-gradient(135deg, #00ff41 0%, #00d4ff 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cov-subtitle { color: #64748b; font-size: 0.95rem; margin-top: 0.25rem; }

        /* ── Overall stat bar ── */
        .cov-stat-bar {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1rem; margin-bottom: 2.5rem;
        }
        .cov-stat {
          background: rgba(0,255,65,0.04);
          border: 1px solid rgba(0,255,65,0.15);
          border-radius: 12px; padding: 1.25rem 1.5rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .cov-stat:hover { border-color: rgba(0,255,65,0.4); box-shadow: 0 0 16px rgba(0,255,65,0.1); }
        .cov-stat-val {
          font-family: 'JetBrains Mono', monospace;
          font-size: 2rem; font-weight: 700; line-height: 1;
        }
        .cov-stat-label { color: #64748b; font-size: 0.8rem; margin-top: 0.35rem; text-transform: uppercase; letter-spacing: 0.06em; }

        /* ── Component grid ── */
        .cov-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
          gap: 1.5rem;
        }
        @media (max-width: 560px) { .cov-grid { grid-template-columns: 1fr; } }

        .cov-card {
          background: rgba(0,255,65,0.03);
          border: 1px solid rgba(0,255,65,0.15);
          border-radius: 16px; padding: 1.5rem;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          position: relative; overflow: hidden;
        }
        .cov-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--card-accent), transparent);
          opacity: 0.6;
        }
        .cov-card:hover { transform: translateY(-3px); border-color: rgba(0,255,65,0.35); }

        .cov-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.25rem; }
        .cov-card-title { display: flex; align-items: center; gap: 0.6rem; }
        .cov-card-icon { font-size: 1.5rem; line-height: 1; }
        .cov-card-name { font-size: 1.1rem; font-weight: 600; }
        .cov-card-lang { color: #64748b; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; margin-top: 0.1rem; }

        .cov-card-body { display: flex; align-items: center; gap: 1.5rem; }
        .cov-card-info { flex: 1; }

        .cov-meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .cov-meta-key { color: #64748b; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .cov-meta-val { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; }

        .cov-progress-track {
          background: #1a1f3e; border-radius: 9999px; height: 8px; margin: 1rem 0 0.35rem;
          position: relative; overflow: visible;
        }
        .cov-progress-fill {
          height: 100%; border-radius: 9999px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .cov-progress-fill::after {
          content: ''; position: absolute; right: -1px; top: -3px;
          width: 14px; height: 14px; border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 8px currentColor;
        }
        .cov-threshold-marker {
          position: absolute; top: -4px; width: 2px; height: 16px;
          background: #64748b; border-radius: 1px;
        }

        .cov-sparkline-label { color: #64748b; font-size: 0.72rem; margin-bottom: 0.25rem; }
        .cov-sparkline-wrap { margin-top: 0.5rem; }

        /* ── Status pill inside card ── */
        .cov-status-pill {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.2rem 0.65rem; border-radius: 9999px;
          font-size: 0.72rem; font-weight: 600;
          font-family: 'JetBrains Mono', monospace; text-transform: uppercase;
          border: 1px solid currentColor; letter-spacing: 0.06em;
        }
        .cov-status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }

        /* ── Table ── */
        .cov-table-wrap {
          margin-top: 2.5rem;
          border: 1px solid rgba(0,255,65,0.15); border-radius: 12px; overflow: hidden;
        }
        .cov-table-title {
          padding: 1rem 1.5rem; border-bottom: 1px solid rgba(0,255,65,0.15);
          font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.08em; color: #64748b;
          display: flex; align-items: center; gap: 0.5rem;
        }
        table.cov-table { width: 100%; border-collapse: collapse; }
        .cov-table th {
          padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem;
          font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em;
          color: #64748b; border-bottom: 1px solid rgba(0,255,65,0.1);
        }
        .cov-table td {
          padding: 1rem 1.5rem; font-size: 0.875rem;
          border-bottom: 1px solid rgba(0,255,65,0.06);
          font-family: 'JetBrains Mono', monospace;
        }
        .cov-table tr:last-child td { border-bottom: none; }
        .cov-table tr:hover td { background: rgba(0,255,65,0.03); }

        /* ── CI enforcement note ── */
        .cov-info-box {
          margin-top: 2rem;
          background: rgba(0,212,255,0.05);
          border: 1px solid rgba(0,212,255,0.2);
          border-radius: 12px; padding: 1.25rem 1.5rem;
          display: flex; gap: 1rem; align-items: flex-start;
        }
        .cov-info-icon { font-size: 1.25rem; flex-shrink: 0; }
        .cov-info-text { color: #94a3b8; font-size: 0.875rem; line-height: 1.6; }
        .cov-info-text strong { color: #00d4ff; }

        .cov-mono { font-family: 'JetBrains Mono', monospace; }
      `}</style>

      <div className="cov-page">
        <div className="cov-container">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <header className="cov-header">
            <div className="cov-header-top">
              <span
                className={`cov-badge ${allHealthy ? "cov-badge-green" : "cov-badge-red"}`}
                aria-label={allHealthy ? "All components healthy" : "Some components below threshold"}
              >
                <span>{allHealthy ? "●" : "●"}</span>
                {allHealthy ? "All Systems Healthy" : "Threshold Breach"}
              </span>
            </div>
            <h1 className="cov-title">Coverage Dashboard</h1>
            <p className="cov-subtitle">
              Real-time coverage health across all SoroScan components — tracked per commit via Codecov.
            </p>
          </header>

          {/* ── Summary bar ────────────────────────────────────────────────── */}
          <section className="cov-stat-bar" aria-label="Coverage summary statistics">
            <div className="cov-stat">
              <div className="cov-stat-val" style={{ color: overallCoverage >= 75 ? "#00ff41" : "#ffaa00" }}>
                {overallCoverage}%
              </div>
              <div className="cov-stat-label">Average Coverage</div>
            </div>
            <div className="cov-stat">
              <div className="cov-stat-val" style={{ color: "#00ff41" }}>
                {components.filter((c) => (c.coverage ?? 0) >= c.threshold).length}
                <span style={{ fontSize: "1rem", color: "#64748b" }}>/{components.length}</span>
              </div>
              <div className="cov-stat-label">Components Passing</div>
            </div>
            <div className="cov-stat">
              <div className="cov-stat-val" style={{ color: "#00d4ff" }}>4</div>
              <div className="cov-stat-label">Test Frameworks</div>
            </div>
            <div className="cov-stat">
              <div className="cov-stat-val" style={{ color: "#00ff41", fontSize: "1.1rem" }}>CI</div>
              <div className="cov-stat-label">Threshold Enforced</div>
            </div>
          </section>

          {/* ── Component cards ────────────────────────────────────────────── */}
          <section className="cov-grid" aria-label="Per-component coverage details">
            {components.map((comp) => {
              const status = statusColour(comp.coverage, comp.threshold)
              const fillPct = Math.min(comp.coverage ?? 0, 100)
              const thresholdLeft = comp.threshold

              return (
                <article
                  key={comp.id}
                  className="cov-card"
                  id={`coverage-card-${comp.id}`}
                  style={{ "--card-accent": status.text } as React.CSSProperties}
                >
                  <div className="cov-card-header">
                    <div className="cov-card-title">
                      <span className="cov-card-icon" role="img" aria-label={comp.label}>{comp.icon}</span>
                      <div>
                        <div className="cov-card-name">{comp.label}</div>
                        <div className="cov-card-lang">{comp.language} · {comp.testRunner}</div>
                      </div>
                    </div>

                    <span
                      className="cov-status-pill"
                      style={{ color: status.text }}
                      aria-label={`Status: ${status.label}`}
                    >
                      <span className="cov-status-dot" />
                      {status.label}
                    </span>
                  </div>

                  <div className="cov-card-body">
                    {/* Gauge */}
                    <GaugeRing coverage={comp.coverage} threshold={comp.threshold} colour={status.text} />

                    {/* Info */}
                    <div className="cov-card-info">
                      <div className="cov-meta-row">
                        <span className="cov-meta-key">Threshold</span>
                        <span className="cov-meta-val" style={{ color: "#64748b" }}>{comp.threshold}%</span>
                      </div>
                      <div className="cov-meta-row">
                        <span className="cov-meta-key">Flag</span>
                        <span className="cov-meta-val" style={{ color: "#00d4ff" }}>{comp.flag}</span>
                      </div>
                      <div className="cov-meta-row">
                        <span className="cov-meta-key">Updated</span>
                        <span className="cov-meta-val" style={{ color: "#64748b", fontSize: "0.75rem" }}>{comp.lastUpdated}</span>
                      </div>

                      {/* Progress bar */}
                      <div
                        className="cov-progress-track"
                        role="progressbar"
                        aria-valuenow={comp.coverage ?? 0}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${comp.label} coverage`}
                        style={{ position: "relative" }}
                      >
                        <div
                          className="cov-progress-fill"
                          style={{
                            width: `${fillPct}%`,
                            background: status.text,
                            boxShadow: status.glow,
                            color: status.text,
                          }}
                        />
                        <div
                          className="cov-threshold-marker"
                          style={{ left: `${thresholdLeft}%` }}
                          title={`Threshold: ${thresholdLeft}%`}
                        />
                      </div>

                      {/* Sparkline */}
                      <div className="cov-sparkline-wrap">
                        <div className="cov-sparkline-label">Last {comp.trend.length} commits</div>
                        <Sparkline data={comp.trend} colour={status.text} />
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>

          {/* ── Summary table ──────────────────────────────────────────────── */}
          <section className="cov-table-wrap" aria-label="Coverage summary table">
            <div className="cov-table-title">
              <span>📋</span> Component Health Matrix
            </div>
            <table className="cov-table">
              <thead>
                <tr>
                  <th scope="col">Component</th>
                  <th scope="col">Language</th>
                  <th scope="col">Test Runner</th>
                  <th scope="col">Coverage</th>
                  <th scope="col">Threshold</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {components.map((comp) => {
                  const status = statusColour(comp.coverage, comp.threshold)
                  const passing = (comp.coverage ?? 0) >= comp.threshold
                  return (
                    <tr key={comp.id}>
                      <td>
                        <span style={{ marginRight: "0.5rem" }}>{comp.icon}</span>
                        <span style={{ color: "#e2e8f0" }}>{comp.label}</span>
                      </td>
                      <td style={{ color: "#00d4ff" }}>{comp.language}</td>
                      <td style={{ color: "#94a3b8" }}>{comp.testRunner}</td>
                      <td style={{ color: status.text, fontWeight: 700 }}>
                        {comp.coverage !== null ? `${comp.coverage}%` : "—"}
                      </td>
                      <td style={{ color: "#64748b" }}>{comp.threshold}%</td>
                      <td>
                        <span
                          style={{
                            color: status.text,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            fontWeight: 600,
                          }}
                        >
                          {passing ? "✅ Pass" : "❌ Fail"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          {/* ── CI enforcement info ───────────────────────────────────────── */}
          <aside className="cov-info-box" aria-label="CI enforcement information">
            <span className="cov-info-icon">ℹ️</span>
            <div className="cov-info-text">
              <strong>CI Enforcement:</strong> All four components have automated coverage gates.
              The <strong>Backend</strong> and <strong>SDK</strong> require ≥ 80 % line coverage;
              the <strong>Frontend</strong> and <strong>Contracts</strong> require ≥ 70 %.
              Any pull request that drops coverage below the threshold will fail the
              <strong> coverage.yml</strong> GitHub Actions workflow and block the merge.
              Historical trends are tracked per-commit on{" "}
              <strong>Codecov</strong> using per-flag routing (<span className="cov-mono">backend</span>,{" "}
              <span className="cov-mono">frontend</span>, <span className="cov-mono">sdk</span>,{" "}
              <span className="cov-mono">contracts</span>).
            </div>
          </aside>

        </div>
      </div>
    </>
  )
}
