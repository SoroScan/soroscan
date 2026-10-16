"use client"

import * as React from "react"

// ── Types ──────────────────────────────────────────────────────────────────

export type LogicOp = "AND" | "OR"
export type Operator = "eq" | "neq" | "contains" | "gt" | "lt" | "gte" | "lte"

export interface FilterCondition {
  id: string
  field: string
  operator: Operator
  value: string
}

export interface FilterGroup {
  logic: LogicOp
  conditions: FilterCondition[]
}

export interface SavedTemplate {
  name: string
  group: FilterGroup
}

interface AdvancedFilterBuilderProps {
  fields: string[]
  value?: FilterGroup
  onChange: (group: FilterGroup) => void
  onApply: (group: FilterGroup) => void
  storageKey?: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const OPERATORS: { value: Operator; label: string }[] = [
  { value: "eq",       label: "=" },
  { value: "neq",      label: "≠" },
  { value: "contains", label: "contains" },
  { value: "gt",       label: ">" },
  { value: "lt",       label: "<" },
  { value: "gte",      label: ">=" },
  { value: "lte",      label: "<=" },
]

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function emptyCondition(field: string): FilterCondition {
  return { id: uid(), field, operator: "eq", value: "" }
}

function emptyGroup(field: string): FilterGroup {
  return { logic: "AND", conditions: [emptyCondition(field)] }
}

function buildPreview(group: FilterGroup): string {
  if (group.conditions.length === 0) return "(empty)"
  return group.conditions
    .map((c) => `${c.field} ${c.operator} "${c.value}"`)
    .join(` ${group.logic} `)
}

// ── Component ──────────────────────────────────────────────────────────────

export function AdvancedFilterBuilder({
  fields,
  value,
  onChange,
  onApply,
  storageKey = "soroscan_filter_templates",
}: AdvancedFilterBuilderProps) {
  const defaultField = fields[0] ?? "field"
  const [group, setGroup] = React.useState<FilterGroup>(
    value ?? emptyGroup(defaultField)
  )
  const [templates, setTemplates] = React.useState<SavedTemplate[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? "[]")
    } catch {
      return []
    }
  })
  const [saveName, setSaveName] = React.useState("")
  const [showSave, setShowSave] = React.useState(false)

  // Sync external value
  React.useEffect(() => {
    if (value) setGroup(value)
  }, [value])

  const update = (next: FilterGroup) => {
    setGroup(next)
    onChange(next)
  }

  const setLogic = (logic: LogicOp) => update({ ...group, logic })

  const addCondition = () =>
    update({ ...group, conditions: [...group.conditions, emptyCondition(defaultField)] })

  const removeCondition = (id: string) =>
    update({ ...group, conditions: group.conditions.filter((c) => c.id !== id) })

  const updateCondition = (id: string, patch: Partial<FilterCondition>) =>
    update({
      ...group,
      conditions: group.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })

  const saveTemplate = () => {
    if (!saveName.trim()) return
    const next: SavedTemplate[] = [...templates, { name: saveName.trim(), group }]
    setTemplates(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* noop */ }
    setSaveName("")
    setShowSave(false)
  }

  const loadTemplate = (t: SavedTemplate) => update(t.group)

  const deleteTemplate = (name: string) => {
    const next = templates.filter((t) => t.name !== name)
    setTemplates(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* noop */ }
  }

  return (
    <div className="border border-terminal-green/30 bg-terminal-black font-terminal-mono text-[11px] space-y-0" role="group" aria-label="Advanced filter builder">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-terminal-green/20">
        <span className="text-terminal-green text-[10px] tracking-widest">[FILTER_BUILDER]</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setShowSave((s) => !s)}
            className="text-[9px] px-2 py-0.5 border border-terminal-cyan/40 text-terminal-cyan hover:border-terminal-cyan transition-colors"
          >
            SAVE
          </button>
          <button
            type="button"
            onClick={() => onApply(group)}
            className="text-[9px] px-2 py-0.5 border border-terminal-green/60 text-terminal-green hover:bg-terminal-green/10 transition-colors"
          >
            APPLY
          </button>
        </div>
      </div>

      {/* Logic toggle */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-terminal-green/10">
        <span className="text-terminal-gray">MATCH</span>
        {(["AND", "OR"] as LogicOp[]).map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setLogic(op)}
            aria-pressed={group.logic === op}
            className={`px-3 py-0.5 border text-[10px] transition-colors ${
              group.logic === op
                ? "border-terminal-green bg-terminal-green/20 text-terminal-green"
                : "border-terminal-green/30 text-terminal-gray hover:border-terminal-green"
            }`}
          >
            {op}
          </button>
        ))}
        <span className="text-terminal-gray">conditions</span>
      </div>

      {/* Conditions */}
      <div className="px-4 py-2 space-y-2">
        {group.conditions.map((cond, idx) => (
          <div key={cond.id} className="flex flex-wrap items-center gap-2" data-testid="filter-condition">
            {idx > 0 && (
              <span className="text-[9px] text-terminal-cyan w-6 text-center">{group.logic}</span>
            )}
            {idx === 0 && <span className="text-[9px] text-terminal-gray w-6 text-center">IF</span>}

            {/* Field */}
            <select
              value={cond.field}
              onChange={(e) => updateCondition(cond.id, { field: e.target.value })}
              aria-label="Filter field"
              className="bg-transparent border border-terminal-green/30 text-terminal-green px-2 py-1 focus:outline-none focus:border-terminal-green"
            >
              {fields.map((f) => (
                <option key={f} value={f} className="bg-[#0a0e27]">{f}</option>
              ))}
            </select>

            {/* Operator */}
            <select
              value={cond.operator}
              onChange={(e) => updateCondition(cond.id, { operator: e.target.value as Operator })}
              aria-label="Filter operator"
              className="bg-transparent border border-terminal-green/30 text-terminal-green px-2 py-1 focus:outline-none focus:border-terminal-green"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value} className="bg-[#0a0e27]">{op.label}</option>
              ))}
            </select>

            {/* Value */}
            <input
              type="text"
              value={cond.value}
              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
              placeholder="value"
              aria-label="Filter value"
              className="bg-transparent border border-terminal-green/30 text-terminal-green px-2 py-1 focus:outline-none focus:border-terminal-green min-w-[100px]"
            />

            {/* Remove */}
            {group.conditions.length > 1 && (
              <button
                type="button"
                onClick={() => removeCondition(cond.id)}
                aria-label="Remove condition"
                className="text-terminal-danger hover:text-terminal-danger/80 px-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addCondition}
          className="text-[9px] text-terminal-cyan hover:text-terminal-green transition-colors mt-1"
        >
          + ADD_CONDITION
        </button>
      </div>

      {/* Preview */}
      <div className="px-4 py-2 border-t border-terminal-green/10 bg-terminal-green/5">
        <span className="text-[9px] text-terminal-gray">PREVIEW: </span>
        <span className="text-[9px] text-terminal-cyan break-all" data-testid="filter-preview">
          {buildPreview(group)}
        </span>
      </div>

      {/* Save template */}
      {showSave && (
        <div className="px-4 py-2 border-t border-terminal-green/20 flex gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Template name"
            aria-label="Template name"
            className="flex-1 bg-transparent border border-terminal-green/30 text-terminal-green px-2 py-1 focus:outline-none focus:border-terminal-green"
          />
          <button
            type="button"
            onClick={saveTemplate}
            className="text-[9px] px-3 py-1 border border-terminal-green/60 text-terminal-green hover:bg-terminal-green/10 transition-colors"
          >
            SAVE
          </button>
        </div>
      )}

      {/* Saved templates */}
      {templates.length > 0 && (
        <div className="px-4 py-2 border-t border-terminal-green/20 space-y-1">
          <div className="text-[9px] text-terminal-gray mb-1">SAVED_TEMPLATES</div>
          {templates.map((t) => (
            <div key={t.name} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadTemplate(t)}
                className="text-[10px] text-terminal-cyan hover:text-terminal-green transition-colors flex-1 text-left"
              >
                {t.name}
              </button>
              <button
                type="button"
                onClick={() => deleteTemplate(t.name)}
                aria-label={`Delete template ${t.name}`}
                className="text-[9px] text-terminal-danger hover:text-terminal-danger/80"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
