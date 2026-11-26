"use client"

import * as React from "react"
import { Plus, Activity, CheckCircle2, AlertTriangle, Copy } from "lucide-react"
import { Button } from "@/components/terminal/Button"
import { Modal } from "@/components/terminal/Modal"
import { WebhookTable } from "./components/WebhookTable"
import { CreateWebhookModal } from "./components/CreateWebhookModal"
import { useToast } from "@/context/ToastContext"
import { authenticatedFetch } from "@/lib/auth"
import { adaptWebhook } from "./[id]/page"
import type { Webhook } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface WebhookApiResponse {
  id: number | string
  target_url?: string
  url?: string
  event_type?: string
  eventTypes?: string[]
  contract_id?: string
  contractFilter?: string
  is_active?: boolean
  status?: string
  created_at?: string
  createdAt?: string
  last_triggered?: string | null
  lastDelivery?: string | null
  last_status_code?: number | null
  lastStatusCode?: number | null
  success_rate?: number | null
  successRate?: number | null
  timeout_seconds?: number | null
  timeoutSeconds?: number | null
  secret?: string
  failure_count?: number
  failureCount?: number
  total_deliveries?: number
  totalDeliveries?: number
}

type CreateWebhookInput = Omit<Webhook, "id" | "createdAt" | "totalDeliveries" | "secret" | "successRate">

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new Error("Webhook API returned invalid JSON.")
  }
}

async function request(input: string, init: RequestInit): Promise<unknown> {
  const response = await authenticatedFetch(input, init)
  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status}).`
    try {
      const body = await readJson(response)
      if (body && typeof body === "object" && "detail" in body && typeof (body as Record<string, unknown>).detail === "string") {
        message = (body as Record<string, unknown>).detail as string
      }
    } catch {
      // ignore parse errors, keep the fallback message
    }
    throw new Error(message)
  }
  return readJson(response)
}

export async function fetchWebhooks(): Promise<Webhook[]> {
  const payload = await request(`${API_BASE}/api/ingest/webhooks/`, { cache: "no-store" })
  const list: unknown[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown[] }).results)
      ? (payload as { results: unknown[] }).results
      : []
  return list.map((item, index) => adaptWebhook(item as WebhookApiResponse, `wh_${index}`))
}

export async function createWebhook(input: CreateWebhookInput): Promise<{ webhook: Webhook; secret?: string }> {
  const eventTypes = input.eventTypes.filter((t) => t !== "ALL")
  const response = await authenticatedFetch(`${API_BASE}/api/ingest/webhooks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_url: input.url,
      event_type: eventTypes.length === 0 ? "" : eventTypes[0],
      is_active: input.isActive,
      timeout_seconds: input.timeoutSeconds,
    }),
  })
  if (!response.ok) {
    let message = `Failed to create webhook (HTTP ${response.status}).`
    try {
      const body = await readJson(response)
      if (body && typeof body === "object" && "detail" in body && typeof (body as Record<string, unknown>).detail === "string") {
        message = (body as Record<string, unknown>).detail as string
      }
    } catch {
      // keep the fallback message
    }
    throw new Error(message)
  }
  const json = (await readJson(response)) as WebhookApiResponse
  return {
    webhook: adaptWebhook(json, `wh_${Date.now()}`),
    secret: typeof json.secret === "string" ? json.secret : undefined,
  }
}

export async function deleteWebhook(id: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE}/api/ingest/webhooks/${encodeURIComponent(id)}/`, {
    method: "DELETE",
  })
  if (!response.ok) {
    throw new Error(`Failed to delete webhook (HTTP ${response.status}).`)
  }
}

export async function testWebhook(id: string): Promise<{ ok: boolean; code: number }> {
  const response = await authenticatedFetch(`${API_BASE}/api/ingest/webhooks/${encodeURIComponent(id)}/test/`, {
    method: "POST",
  })
  return { ok: response.ok, code: response.status }
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
  const [testingId, setTestingId] = React.useState<string | null>(null)
  const [testResult, setTestResult] = React.useState<{ id: string; ok: boolean; code: number } | null>(null)
  const [createdSecret, setCreatedSecret] = React.useState<string | null>(null)
  const { showToast } = useToast()

  // Stats
  const active = webhooks.filter((w) => w.status === "ACTIVE").length
  const failed = webhooks.filter((w) => w.status === "FAILED").length
  const avgRate = webhooks.length
    ? (webhooks.reduce((s, w) => s + w.successRate, 0) / webhooks.length).toFixed(1)
    : "0.0"
  const lastEvent = webhooks
    .map((w) => w.lastDelivery)
    .filter(Boolean)
    .sort()
    .at(-1)

  const loadWebhooks = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setWebhooks(await fetchWebhooks())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhooks.")
      setWebhooks([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadWebhooks()
  }, [loadWebhooks])

  const handleCreate = async (input: CreateWebhookInput) => {
    try {
      const { webhook, secret } = await createWebhook(input)
      setWebhooks((prev) => [webhook, ...prev])
      if (secret) {
        setCreatedSecret(secret)
      }
      showToast("Webhook created.", "success", "WEBHOOK_CREATED")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create webhook.", "error", "WEBHOOK_CREATE_ERROR")
      throw err
    }
  }

  const handleDelete = (id: string) => setDeleteTarget(id)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteWebhook(deleteTarget)
      setWebhooks((prev) => prev.filter((w) => w.id !== deleteTarget))
      showToast("Subscription removed.", "success", "WEBHOOK_DELETED")
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete webhook.", "error", "WEBHOOK_DELETE_ERROR")
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    setTestResult(null)
    try {
      const result = await testWebhook(id)
      setTestResult({ id, ok: result.ok, code: result.code })
      showToast(result.ok ? "Test delivery sent." : "Test delivery failed.", result.ok ? "success" : "error", "WEBHOOK_TEST")
    } catch (err) {
      setTestResult({ id, ok: false, code: 0 })
      showToast(err instanceof Error ? err.message : "Test failed.", "error", "WEBHOOK_TEST_ERROR")
    } finally {
      setTimeout(() => {
        setTestingId(null)
        setTestResult(null)
      }, 4000)
    }
  }

  const deleteWebhookItem = webhooks.find((w) => w.id === deleteTarget)

  if (loading) {
    return (
      <div className="min-h-screen font-terminal-mono flex flex-col items-center justify-center gap-4 text-terminal-green">
        <div className="text-4xl">[ ... ]</div>
        <div>LOADING_WEBHOOKS</div>
        <p className="text-xs text-terminal-gray">Fetching subscriptions from the API…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen font-terminal-mono flex flex-col items-center justify-center gap-4 text-terminal-green">
        <div className="text-4xl">[ ! ]</div>
        <div>{error}</div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" data-testid="retry-webhooks-btn" onClick={() => void loadWebhooks()}>
            RETRY
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl font-terminal-mono selection:bg-terminal-green selection:text-terminal-black">
      {createdSecret && (
        <div className="border border-terminal-cyan/40 bg-terminal-cyan/10 rounded-lg p-4">
          <div className="text-[10px] text-terminal-cyan tracking-widest mb-1">SIGNING_SECRET (SHOW_ONCE)</div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-terminal-mono text-xs text-terminal-green break-all">{createdSecret}</span>
            <Button
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(createdSecret ?? "")
                setCreatedSecret(null)
                showToast("Signing secret copied.", "success")
              }}
            >
              <Copy size={14} /> COPY
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setCreatedSecret(null)}>
              DISMISS
            </Button>
          </div>
          <p className="text-[9px] text-terminal-gray/60 mt-1">
            The signing secret is only shown once. Store it safely.
          </p>
        </div>
      )}
      <main className="space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-terminal-cyan tracking-widest mb-1">[WEBHOOK_MANAGER]</div>
            <h1 className="text-3xl md:text-4xl font-bold text-terminal-green">
              SUBSCRIPTIONS
            </h1>
            <p className="text-terminal-gray text-xs mt-1">
              {webhooks.length} subscription{webhooks.length !== 1 ? "s" : ""} configured
            </p>
          </div>
          <Button
            data-tour="create-webhook"
            data-testid="create-webhook-btn"
            variant="primary"
            size="lg"
            onClick={() => setCreateOpen(true)}
            className="self-start sm:self-auto"
          >
            <Plus size={14} />
            NEW_WEBHOOK
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-terminal-green/20 p-4">
          <div className="text-center">
            <div className="text-terminal-green text-xl font-bold">{webhooks.length}</div>
            <div className="text-[9px] text-terminal-gray tracking-widest mt-0.5">TOTAL</div>
          </div>
          <div className="text-center">
            <div className="text-terminal-green text-xl font-bold flex items-center justify-center gap-1.5">
              <Activity size={14} className="animate-pulse" />
              {active}
            </div>
            <div className="text-[9px] text-terminal-gray tracking-widest mt-0.5">ACTIVE</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold flex items-center justify-center gap-1.5 ${failed > 0 ? "text-terminal-danger" : "text-terminal-green"}`}>
              {failed > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              {failed}
            </div>
            <div className="text-[9px] text-terminal-gray tracking-widest mt-0.5">FAILED</div>
          </div>
          <div className="text-center">
            <div className="text-terminal-cyan text-xl font-bold">{avgRate}%</div>
            <div className="text-[9px] text-terminal-gray tracking-widest mt-0.5">AVG_SUCCESS</div>
          </div>
        </div>

        {/* Last event indicator */}
        {lastEvent && (
          <div className="text-[10px] text-terminal-gray flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
            LAST_EVENT: {new Date(lastEvent).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })}
          </div>
        )}

        {/* Table */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-terminal-green whitespace-nowrap">
              [WEBHOOK_LIST]
            </h2>
            <div className="h-[2px] w-full bg-terminal-green/20" />
          </div>
          <WebhookTable
            webhooks={webhooks}
            onDelete={handleDelete}
            onTest={handleTest}
            onCreate={() => setCreateOpen(true)}
            testingId={testingId}
            testResult={testResult}
          />
        </section>

      </main>

      {/* Background deco */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.03)_1px,transparent_1px)] bg-size-[40px_40px]" />
      </div>

      {/* Create modal */}
      <CreateWebhookModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      {/* Delete confirmation modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="CONFIRM_DELETE">
        <div className="space-y-6">
          <p className="text-sm text-terminal-gray">
            Are you sure you want to delete this webhook subscription?
          </p>
          {deleteWebhookItem && (
            <div className="border border-terminal-danger/30 p-3 text-xs text-terminal-danger/80 space-y-1">
              <div className="text-terminal-danger font-bold">{deleteWebhookItem.url}</div>
              <div>{deleteWebhookItem.totalDeliveries} deliveries will be lost</div>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="danger"
              data-testid="confirm-delete-webhook-btn"
              onClick={confirmDelete}
              className="flex-1"
            >
              DELETE_WEBHOOK
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              data-testid="cancel-delete-webhook-btn"
            >
              CANCEL
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
