"use client";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

type APIKey = {
  id: string;
  key: string;
  createdAt: string;
};

function generateKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const random = Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `sk_live_${random}`;
}

export default function APIKeyManager() {
  const [keys, setKeys] = useState<APIKey[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("apiKeys");
    return saved ? JSON.parse(saved) : [];
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Commented out useEffect to avoid localStorage dependency
  // useEffect(() => {
  //   const saved = localStorage.getItem("apiKeys");
  //   if (saved) setKeys(JSON.parse(saved));
  // }, []);

  const saveKeys = (newKeys: APIKey[]) => {
    setKeys(newKeys);
    localStorage.setItem("apiKeys", JSON.stringify(newKeys));
  };

  const handleGenerate = () => {
    const newKey: APIKey = {
      id: Date.now().toString(),
      key: generateKey(),
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
    saveKeys([...keys, newKey]);
  };

  const requestRevoke = (id: string) => setConfirmingKey(id);

  const handleConfirmRevoke = () => {
    if (!confirmingKey) return;
    setIsRevoking(true);
    const nextKeys = keys.filter((k) => k.id !== confirmingKey);
    saveKeys(nextKeys);
    setConfirmingKey(null);
    setIsRevoking(false);
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="border border-green-500/30 rounded p-4 mb-4 bg-[#081026]/70">
      <h2 className="text-green-400 font-mono text-sm mb-3">[ API KEYS ]</h2>
      <button
        onClick={handleGenerate}
        className="mb-4 w-full rounded-md border border-green-400 px-4 py-2 font-mono text-sm text-green-400 transition-colors hover:bg-green-400/10 sm:w-auto"
      >
        + Generate New Key
      </button>
      {keys.length === 0 ? (
        <p className="font-mono text-sm text-green-700">No API keys yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="hidden grid-cols-[1.6fr_1fr_auto] items-center gap-3 font-mono text-xs text-green-600 pb-1 border-b border-green-500/20 sm:grid">
            <span>KEY</span>
            <span>CREATED</span>
            <span className="text-right">ACTIONS</span>
          </div>
          {keys.map((k) => (
            <div
              key={k.id}
              className="grid gap-3 rounded border border-green-500/20 p-3 bg-[#091430]/80 sm:grid-cols-[1.6fr_1fr_auto] sm:items-center"
            >
              <div className="text-green-300 text-sm truncate">{k.key.slice(0, 16)}…</div>
              <div className="text-green-600 text-xs">{k.createdAt}</div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => handleCopy(k.key)}
                  className="min-w-[72px] rounded border border-green-500/30 bg-transparent px-3 py-2 text-xs text-green-400 transition-colors hover:border-green-400 hover:text-green-300"
                >
                  {copied === k.key ? "✓ COPIED" : "COPY"}
                </button>
                <button
                  onClick={() => requestRevoke(k.id)}
                  className="min-w-[72px] rounded border border-red-500/30 bg-transparent px-3 py-2 text-xs text-red-500 transition-colors hover:border-red-400 hover:text-red-400"
                >
                  REVOKE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmationDialog
        open={confirmingKey !== null}
        title="Revoke API key?"
        description="Revoked keys are permanently deleted and cannot be recovered."
        confirmText="Revoke"
        cancelText="Cancel"
        onConfirm={handleConfirmRevoke}
        onCancel={() => setConfirmingKey(null)}
        loading={isRevoking}
      />
    </div>
  );
}
