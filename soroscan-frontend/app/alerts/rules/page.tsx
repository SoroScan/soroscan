"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CHANNEL_TYPES,
  createAlertRule,
  deleteAlertRule,
  describeCondition,
  buildCondition,
  fetchAlertExecutions,
  fetchAlertRules,
  fetchContracts,
  setAlertRuleActive,
  type AlertChannel,
  type AlertExecution,
  type AlertRule,
  type ChannelType,
  type ComparisonOp,
  type ContractOption,
} from "@/lib/alert-rules-api";

interface AlertTemplate {
  id: string;
  name: string;
  eventType: string;
  field: string;
  op: ComparisonOp;
  value: string;
}

/** Client-side presets: they only prefill the editor, saving creates a real rule. */
const templates: AlertTemplate[] = [
  { id: "tpl-large-transfer", name: "Large transfer", eventType: "transfer", field: "payload.amount", op: "gte", value: "1000000" },
  { id: "tpl-any-burn", name: "Any burn", eventType: "burn", field: "", op: "eq", value: "" },
  { id: "tpl-admin-change", name: "Admin changed", eventType: "set_admin", field: "", op: "eq", value: "" },
];

const OPS: { value: ComparisonOp; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "!=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "contains", label: "contains" },
];

const inputClass =
  "mt-1 w-full rounded border border-terminal-green/30 bg-terminal-black px-2 py-2 text-terminal-green";

export default function AlertRulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyRuleId, setBusyRuleId] = useState<number | null>(null);

  const [contract, setContract] = useState<number | "">("");
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState("");
  const [field, setField] = useState("");
  const [op, setOp] = useState<ComparisonOp>("gte");
  const [value, setValue] = useState("");
  const [channels, setChannels] = useState<AlertChannel[]>([{ type: "webhook", target: "" }]);

  const [historyRule, setHistoryRule] = useState<AlertRule | null>(null);
  const [executions, setExecutions] = useState<AlertExecution[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [loadedRules, loadedContracts] = await Promise.all([fetchAlertRules(), fetchContracts()]);
      setRules(loadedRules);
      setContracts(loadedContracts);
      setContract((current) => (current === "" && loadedContracts[0] ? loadedContracts[0].id : current));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load alert rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const contractLabel = useMemo(() => {
    const byId = new Map(contracts.map((c) => [c.id, c.name]));
    return (rule: AlertRule) => byId.get(rule.contract) ?? rule.contractId;
  }, [contracts]);

  const preview = useMemo(() => {
    if (!eventType.trim() && !field.trim()) return "Add an event type or a payload condition.";
    return `Trigger when ${describeCondition(buildCondition({ eventType, field, op, value }))}.`;
  }, [eventType, field, op, value]);

  const canSave =
    contract !== "" &&
    name.trim() !== "" &&
    (eventType.trim() !== "" || field.trim() !== "") &&
    channels.some((c) => c.target.trim() !== "");

  const applyTemplate = (template: AlertTemplate) => {
    setName(template.name);
    setEventType(template.eventType);
    setField(template.field);
    setOp(template.op);
    setValue(template.value);
  };

  const updateChannel = (index: number, patch: Partial<AlertChannel>) =>
    setChannels((current) => current.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const saveRule = async () => {
    if (!canSave) return;
    setSaving(true);
    setActionError(null);
    try {
      const created = await createAlertRule({ contract, name, eventType, field, op, value, channels });
      setRules((current) => [created, ...current]);
      setName("");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to create alert rule.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: AlertRule) => {
    setBusyRuleId(rule.id);
    setActionError(null);
    try {
      const updated = await setAlertRuleActive(rule.id, !rule.isActive);
      setRules((current) => current.map((r) => (r.id === rule.id ? updated : r)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update alert rule.");
    } finally {
      setBusyRuleId(null);
    }
  };

  const removeRule = async (rule: AlertRule) => {
    setBusyRuleId(rule.id);
    setActionError(null);
    try {
      await deleteAlertRule(rule.id);
      setRules((current) => current.filter((r) => r.id !== rule.id));
      if (historyRule?.id === rule.id) setHistoryRule(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to delete alert rule.");
    } finally {
      setBusyRuleId(null);
    }
  };

  const showHistory = async (rule: AlertRule) => {
    setHistoryRule(rule);
    setHistoryLoading(true);
    setHistoryError(null);
    setExecutions([]);
    try {
      setExecutions(await fetchAlertExecutions(rule.id));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to load alert history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-terminal-black p-8 font-terminal-mono text-terminal-green">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.2em] text-terminal-gray">[ALERT_RULE_BUILDER]</p>
          <h1 className="text-3xl">Alert Rules</h1>
          <p className="text-sm text-terminal-gray">
            Notify Slack, email or a webhook whenever an indexed event on your contract matches a condition.
          </p>
        </header>

        {loading ? (
          <p role="status" className="text-sm text-terminal-gray">
            Loading alert rules...
          </p>
        ) : loadError ? (
          <div role="alert" className="space-y-2 rounded border border-terminal-danger/40 p-4 text-sm text-terminal-danger">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded border border-terminal-danger/40 px-3 py-1 hover:bg-terminal-danger/10"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {actionError && (
              <p role="alert" className="rounded border border-terminal-danger/40 p-3 text-xs text-terminal-danger">
                {actionError}
              </p>
            )}

            <section className="rounded border border-terminal-green/20 p-4">
              <h2 className="mb-3 text-sm text-terminal-cyan">Templates</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="rounded border border-terminal-cyan/30 bg-black/30 p-3 text-left hover:bg-terminal-cyan/10"
                  >
                    <p className="text-sm text-terminal-cyan">{template.name}</p>
                    <p className="mt-1 text-xs text-terminal-gray">
                      {describeCondition(buildCondition(template))}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <article className="rounded border border-terminal-green/20 p-4">
                <h2 className="mb-3 text-sm text-terminal-gray">Rule Editor</h2>
                {contracts.length === 0 ? (
                  <p className="text-xs text-terminal-gray">Register a contract first to create alert rules for it.</p>
                ) : (
                  <div className="space-y-3 text-xs">
                    <label className="block text-terminal-gray">
                      Contract
                      <select
                        value={contract}
                        onChange={(event) => setContract(Number(event.target.value))}
                        className={inputClass}
                      >
                        {contracts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-terminal-gray">
                      Rule Name
                      <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
                    </label>
                    <label className="block text-terminal-gray">
                      Event Type (blank for any)
                      <input
                        value={eventType}
                        onChange={(event) => setEventType(event.target.value)}
                        placeholder="transfer"
                        className={inputClass}
                      />
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <label className="text-terminal-gray">
                        Payload field (optional)
                        <input
                          value={field}
                          onChange={(event) => setField(event.target.value)}
                          placeholder="payload.amount"
                          className={inputClass}
                        />
                      </label>
                      <label className="text-terminal-gray">
                        Operator
                        <select value={op} onChange={(event) => setOp(event.target.value as ComparisonOp)} className={inputClass}>
                          {OPS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-terminal-gray">
                        Value
                        <input value={value} onChange={(event) => setValue(event.target.value)} className={inputClass} />
                      </label>
                    </div>
                    <fieldset className="space-y-2">
                      <legend className="text-terminal-gray">Notify</legend>
                      {channels.map((channel, index) => (
                        <div key={index} className="flex gap-2">
                          <select
                            aria-label={`Channel ${index + 1} type`}
                            value={channel.type}
                            onChange={(event) => updateChannel(index, { type: event.target.value as ChannelType })}
                            className="rounded border border-terminal-green/30 bg-terminal-black px-2 py-2"
                          >
                            {CHANNEL_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                          <input
                            aria-label={`Channel ${index + 1} target`}
                            value={channel.target}
                            onChange={(event) => updateChannel(index, { target: event.target.value })}
                            placeholder={channel.type === "email" ? "ops@example.com" : "https://..."}
                            className="flex-1 rounded border border-terminal-green/30 bg-terminal-black px-2 py-2"
                          />
                          {channels.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setChannels((current) => current.filter((_, i) => i !== index))}
                              className="rounded border border-terminal-gray/40 px-2 text-terminal-gray"
                            >
                              remove
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setChannels((current) => [...current, { type: "email", target: "" }])}
                        className="text-terminal-cyan hover:underline"
                      >
                        + add channel
                      </button>
                    </fieldset>
                    <p className="rounded border border-terminal-cyan/20 bg-terminal-cyan/5 p-3 text-terminal-cyan">
                      {preview}
                    </p>
                    <button
                      type="button"
                      onClick={() => void saveRule()}
                      disabled={!canSave || saving}
                      className="rounded border border-terminal-green/40 px-3 py-2 text-terminal-green hover:bg-terminal-green/10 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save rule"}
                    </button>
                  </div>
                )}
              </article>

              <article className="rounded border border-terminal-cyan/20 p-4">
                <h2 className="mb-3 text-sm text-terminal-cyan">
                  Delivery History{historyRule ? `: ${historyRule.name}` : ""}
                </h2>
                <div className="space-y-2 text-xs">
                  {!historyRule ? (
                    <p className="text-terminal-gray">Select a rule&apos;s history to see its deliveries.</p>
                  ) : historyLoading ? (
                    <p role="status" className="text-terminal-gray">
                      Loading history...
                    </p>
                  ) : historyError ? (
                    <p role="alert" className="text-terminal-danger">
                      {historyError}
                    </p>
                  ) : executions.length === 0 ? (
                    <p className="text-terminal-gray">This rule has not fired yet.</p>
                  ) : (
                    executions.map((execution) => (
                      <div key={execution.id} className="rounded border border-terminal-cyan/20 bg-black/30 p-2">
                        <p className={execution.status === "sent" ? "text-terminal-green" : "text-terminal-danger"}>
                          {execution.status} via {execution.channel || "default"} - {execution.eventType}
                          {execution.ledger !== null ? ` @ ledger ${execution.ledger}` : ""}
                        </p>
                        <p className="text-terminal-gray">{new Date(execution.createdAt).toLocaleString()}</p>
                        {execution.status === "failed" && execution.response && (
                          <p className="text-terminal-gray">{execution.response}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>

            <section className="rounded border border-terminal-green/20 p-4">
              <h2 className="mb-3 text-sm text-terminal-gray">Rules</h2>
              {rules.length === 0 ? (
                <p className="text-xs text-terminal-gray">No alert rules yet. Create one above or start from a template.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-terminal-green/10 text-terminal-green">
                      <tr>
                        <th className="px-2 py-2">Rule</th>
                        <th className="px-2 py-2">Contract</th>
                        <th className="px-2 py-2">Condition</th>
                        <th className="px-2 py-2">Notify</th>
                        <th className="px-2 py-2">Enabled</th>
                        <th className="px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map((rule) => (
                        <tr key={rule.id} className="border-t border-terminal-green/10">
                          <td className="px-2 py-2">{rule.name}</td>
                          <td className="px-2 py-2">{contractLabel(rule)}</td>
                          <td className="px-2 py-2">{describeCondition(rule.condition)}</td>
                          <td className="px-2 py-2">{rule.channels.map((c) => c.type).join(", ")}</td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              aria-label={`Toggle ${rule.name}`}
                              disabled={busyRuleId === rule.id}
                              onClick={() => void toggleRule(rule)}
                              className={`rounded border px-2 py-1 ${
                                rule.isActive
                                  ? "border-terminal-green/40 text-terminal-green"
                                  : "border-terminal-gray/40 text-terminal-gray"
                              }`}
                            >
                              {rule.isActive ? "on" : "off"}
                            </button>
                          </td>
                          <td className="space-x-2 px-2 py-2">
                            <button
                              type="button"
                              onClick={() => void showHistory(rule)}
                              className="text-terminal-cyan hover:underline"
                            >
                              history
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${rule.name}`}
                              disabled={busyRuleId === rule.id}
                              onClick={() => void removeRule(rule)}
                              className="text-terminal-danger hover:underline"
                            >
                              delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
