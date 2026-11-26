import type { DeliveryLog as DeliveryLogType, EventType, Webhook, WebhookStatus } from "../types"

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

interface DeliveryApiResponse {
  id: number | string
  subscription_id?: number
  timestamp?: string
  created_at?: string
  status_code?: number | null
  statusCode?: number | null
  duration_ms?: number | null
  latency_ms?: number | null
  responseTimeMs?: number | null
  attempt_number?: number | null
  attempt?: number | null
  error?: string | null
  errorMessage?: string | null
  response_body?: string | null
  event_type?: string | null
  eventType?: string | null
  contract_id?: string | null
  contractId?: string | null
  success?: boolean
}

function mapStatus(api: WebhookApiResponse): WebhookStatus {
  const raw = String(api.status ?? "").toUpperCase()
  if (raw === "ACTIVE" || raw === "SUSPENDED" || raw === "FAILED") return raw as WebhookStatus
  if (api.is_active === false) {
    const failures = api.failure_count ?? api.failureCount ?? 0
    return failures > 0 ? "FAILED" : "SUSPENDED"
  }
  return "ACTIVE"
}

function toEventTypes(api: WebhookApiResponse): EventType[] {
  const raw = api.eventTypes ?? (api.event_type ? [api.event_type] : [])
  if (!raw.length) return ["ALL"]
  return raw.map((t) => String(t || "ALL").toUpperCase() as EventType)
}

export function adaptWebhook(api: WebhookApiResponse, fallbackId: string): Webhook {
  const id = String(api.id ?? fallbackId)
  const eventTypes = toEventTypes(api)
  const timeoutSeconds = api.timeoutSeconds ?? api.timeout_seconds ?? 30
  const createdAt = api.createdAt ?? api.created_at ?? new Date(0).toISOString()
  const lastDelivery = api.lastDelivery ?? api.last_triggered ?? undefined
  const totalDeliveries = api.totalDeliveries ?? api.total_deliveries ?? 0
  const failureCount = api.failureCount ?? api.failure_count ?? 0
  return {
    id,
    url: api.url ?? api.target_url ?? "",
    eventTypes,
    contractFilter: api.contractFilter ?? api.contract_id,
    status: mapStatus(api),
    isActive: api.is_active ?? (mapStatus(api) === "ACTIVE"),
    createdAt,
    lastDelivery: lastDelivery ?? undefined,
    lastStatusCode: api.lastStatusCode ?? api.last_status_code ?? undefined,
    successRate: api.successRate ?? api.success_rate ?? 100,
    timeoutSeconds,
    secret: api.secret ?? "whsec_redacted",
    totalDeliveries,
    failureCount,
  }
}

export function adaptDeliveryLog(api: DeliveryApiResponse, webhookId: string): DeliveryLogType {
  const statusCode = api.statusCode ?? api.status_code ?? 0
  const responseTimeMs = api.responseTimeMs ?? api.duration_ms ?? api.latency_ms ?? 0
  const attempt = api.attempt ?? api.attempt_number ?? 1
  const errorMessage = api.errorMessage ?? api.error ?? api.response_body ?? undefined
  const rawEventType = String(api.eventType ?? api.event_type ?? "ALL").toUpperCase()
  return {
    id: String(api.id),
    webhookId,
    timestamp: api.timestamp ?? api.created_at ?? new Date(0).toISOString(),
    statusCode,
    responseTimeMs,
    attempt,
    errorMessage: errorMessage || undefined,
    eventType: (rawEventType || "ALL") as EventType,
    contractId: String(api.contractId ?? api.contract_id ?? ""),
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error("Webhook API returned invalid JSON.")
  }
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    if (Array.isArray(record.results)) return record.results as T[]
    if (Array.isArray(record.deliveries)) return record.deliveries as T[]
    if (Array.isArray(record.logs)) return record.logs as T[]
    if (Array.isArray(record.data)) return record.data as T[]
  }
  return []
}

export async function fetchWebhookDetail(id: string): Promise<Webhook> {
  const response = await fetch(`${API_BASE}/api/webhooks/${encodeURIComponent(id)}/`, {
    cache: "no-store",
  })
  if (response.status === 404) throw new Error("Webhook not found.")
  if (!response.ok) throw new Error(`Failed to load webhook (HTTP ${response.status}).`)
  const payload = (await parseJsonResponse(response)) as WebhookApiResponse
  if (!payload || typeof payload !== "object") throw new Error("Webhook response was empty.")
  return adaptWebhook(payload, id)
}

export async function fetchWebhookDeliveries(webhookId: string): Promise<DeliveryLogType[]> {
  const response = await fetch(
    `${API_BASE}/api/webhooks/${encodeURIComponent(webhookId)}/deliveries/`,
    { cache: "no-store" },
  )
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Failed to load delivery logs (HTTP ${response.status}).`)
  const payload = await parseJsonResponse(response)
  return unwrapList<DeliveryApiResponse>(payload).map((item) => adaptDeliveryLog(item, webhookId))
}
