"use client";
import { useState } from "react";

type Prefs = {
  email: boolean;
  inApp: boolean;
  webhook: boolean;
  webhookUrl: string;
};

export default function NotificationPrefs() {
  const [prefs, setPrefs] = useState<Prefs>({
    email: true,
    inApp: true,
    webhook: false,
    webhookUrl: "",
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof Omit<Prefs, "webhookUrl">) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem("notificationPrefs", JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-green-500/30 bg-[#081026]/70 p-4 mb-4">
      <h2 className="text-green-400 font-mono text-sm mb-3">[ NOTIFICATIONS ]</h2>
      <div className="space-y-3">
        {([
          { key: "email", label: "Email Notifications" },
          { key: "inApp", label: "In-App Notifications" },
          { key: "webhook", label: "Webhook" },
        ] as const).map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-mono text-sm text-green-300">{label}</span>
            <button
              aria-pressed={prefs[key]}
              onClick={() => toggle(key)}
              className={`min-w-[72px] rounded-full border px-3 py-2 text-xs font-mono transition-colors ${
                prefs[key]
                  ? "border-green-400 bg-green-400/20 text-green-400"
                  : "border-green-500/30 text-green-700 hover:border-green-400"
              }`}
            >
              {prefs[key] ? "ON" : "OFF"}
            </button>
          </div>
        ))}
        {prefs.webhook && (
          <input
            type="text"
            placeholder="https://your-webhook-url.com"
            value={prefs.webhookUrl}
            onChange={(e) => setPrefs((p) => ({ ...p, webhookUrl: e.target.value }))}
            className="w-full rounded border border-green-500/30 bg-transparent px-3 py-2 text-sm text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
          />
        )}
        <button
          onClick={handleSave}
          className="w-full rounded-md border border-green-500/30 bg-transparent px-4 py-2 text-sm text-green-400 transition-colors hover:border-green-400 hover:bg-green-400/10"
        >
          {saved ? "✓ SAVED" : "SAVE PREFERENCES"}
        </button>
      </div>
    </div>
  );
}
