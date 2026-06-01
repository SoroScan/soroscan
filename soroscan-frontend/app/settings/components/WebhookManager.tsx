"use client";
import { useState } from "react";

type Webhook = {
  id: string;
  url: string;
  active: boolean;
  createdAt: string;
};

const defaultWebhooks: Webhook[] = [];

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>(() => {
    if (typeof window !== "undefined") {
      const savedData = localStorage.getItem("webhooks");
      if (savedData) {
        try {
          return JSON.parse(savedData) as Webhook[];
        } catch {
          return defaultWebhooks;
        }
      }
    }
    return defaultWebhooks;
  });
  const [newUrl, setNewUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; status_code?: number; error?: string } | null>(null);
  const [urlTouched, setUrlTouched] = useState(false);

  const urlValid = isValidUrl(newUrl);
  const urlError = (urlTouched || newUrl.length > 0) && !urlValid ? (newUrl ? "Must be a valid HTTPS URL" : "URL is required") : null;

  const persist = (next: Webhook[]) => {
    setWebhooks(next);
    localStorage.setItem("webhooks", JSON.stringify(next));
  };

  const handleTestConnection = async () => {
    if (!isValidUrl(newUrl)) return;
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation TestWebhookUrl($url: String!, $timeoutSeconds: Int!) {
              testWebhookUrl(url: $url, timeoutSeconds: $timeoutSeconds)
            }
          `,
          variables: { url: newUrl, timeoutSeconds: 10 },
        }),
      });
      const result = await response.json();
      setTestResult(result.data?.testWebhookUrl || { success: false, error: "Unknown error" });
    } catch (_e) {
      setTestResult({ success: false, error: "Failed to test connection" });
    } finally {
      setTesting(false);
    }
  };

  const handleAddWebhook = () => {
    if (!newUrl.trim()) {
      setError("Enter a valid HTTPS URL.");
      return;
    }
    if (!isValidUrl(newUrl)) {
      setError("URL must be HTTPS.");
      return;
    }
    const nextWebhook: Webhook = {
      id: Date.now().toString(),
      url: newUrl.trim(),
      active: true,
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
    persist([nextWebhook, ...webhooks]);
    setNewUrl("");
    setError("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const toggleWebhook = (id: string) => {
    persist(
      webhooks.map((webhook) =>
        webhook.id === id ? { ...webhook, active: !webhook.active } : webhook
      )
    );
  };

  const removeWebhook = (id: string) => {
    persist(webhooks.filter((webhook) => webhook.id !== id));
  };

  return (
    <div className="border border-green-500/30 rounded-xl p-5 bg-[#08102a]/80">
      <h2 className="text-green-400 text-sm font-mono mb-3">[ WEBHOOKS ]</h2>
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-center">
            <input
              value={newUrl}
              onChange={(event) => setNewUrl(event.target.value)}
              onBlur={() => setUrlTouched(true)}
              placeholder="https://hooks.example.com/events"
              className="w-full rounded-lg border border-green-500/30 bg-transparent px-3 py-2 font-mono text-sm text-green-300 focus:outline-none focus:border-green-400"
            />
            <button
              onClick={handleTestConnection}
              disabled={testing || !isValidUrl(newUrl)}
              className="rounded-lg border border-blue-400 px-3 py-2 text-sm font-mono text-blue-400 hover:bg-blue-400/10 transition-colors disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test"}
            </button>
            <button
              onClick={handleAddWebhook}
              className="rounded-lg border border-green-400 px-4 py-2 text-sm font-mono text-green-400 hover:bg-green-400/10 transition-colors"
            >
              + Add Webhook
            </button>
          </div>
          {urlError && <p className="text-red-400 text-sm">{urlError}</p>}
          {testResult && (
            <p className={`text-sm ${testResult.success ? "text-green-400" : "text-red-400"}`}>
              {testResult.success 
                ? testResult.status_code 
                  ? `Connection successful! (HTTP ${testResult.status_code})` 
                  : "Connection successful!"
                : `Connection failed: ${testResult.error || "Unknown error"}`}
            </p>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {webhooks.length === 0 ? (
          <p className="text-green-600 text-sm font-mono">No webhook subscriptions configured yet.</p>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="rounded-xl border border-green-500/20 bg-[#09132f]/80 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-green-300 text-sm break-words">{webhook.url}</p>
                    <p className="text-green-600 text-xs">Created {webhook.createdAt}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleWebhook(webhook.id)}
                      className={`rounded-lg border px-3 py-2 text-xs font-mono transition-colors ${webhook.active ? "border-green-400 text-green-400 hover:bg-green-400/10" : "border-green-500/30 text-green-600 hover:border-green-400"}`}
                    >
                      {webhook.active ? "ACTIVE" : "PAUSED"}
                    </button>
                    <button
                      onClick={() => removeWebhook(webhook.id)}
                      className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-mono text-red-400 hover:border-red-400"
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          disabled={webhooks.length === 0}
          onClick={() => {
            persist(webhooks);
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2000);
          }}
          className="w-full rounded-lg border border-green-500/30 px-4 py-2 text-sm font-mono text-green-400 hover:border-green-400 hover:bg-green-400/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saved ? "✓ SAVED" : "SAVE WEBHOOK SETTINGS"}
        </button>
      </div>
    </div>
  );
}
