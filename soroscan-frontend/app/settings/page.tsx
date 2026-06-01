"use client";
import { useState } from "react";
import ThemeSelector from "./components/ThemeSelector";
import NotificationPrefs from "./components/NotificationPrefs";
import APIKeyManager from "./components/APIKeyManager";

export default function SettingsPage() {
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    if (typeof window === "undefined") return 10;
    const display = localStorage.getItem("displayPrefs");
    if (display) {
      const { rowsPerPage } = JSON.parse(display);
      return rowsPerPage ?? 10;
    }
    return 10;
  });
  const [fontSize, setFontSize] = useState<string>(() => {
    if (typeof window === "undefined") return "base";
    const display = localStorage.getItem("displayPrefs");
    if (display) {
      const { fontSize } = JSON.parse(display);
      return String(fontSize ?? "base");
    }
    return "base";
  });
  const [saved, setSaved] = useState(false);

  const handleSaveDisplay = () => {
    localStorage.setItem("displayPrefs", JSON.stringify({ rowsPerPage, fontSize }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#0a0e27] text-green-400 p-4 sm:p-6 font-mono">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="border-b border-green-500/30 pb-4">
          <h1 className="text-green-400 text-xl font-bold tracking-widest">
            ◆ SETTINGS
          </h1>
          <p className="text-green-600 text-xs mt-1 max-w-2xl">
            Manage your preferences, notifications, and API keys
          </p>
        </header>

        <section className="rounded-2xl border border-green-500/30 bg-[#081026]/70 p-4">
          <h2 className="text-green-400 font-mono text-sm mb-3">[ ACCOUNT ]</h2>
          <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
            <div className="flex flex-col gap-1">
              <span className="text-green-600 text-sm">Username</span>
              <span className="text-green-300 text-sm">soroscan_user</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-green-600 text-sm">Email</span>
              <span className="text-green-300 text-sm">user@soroscan.io</span>
            </div>
          </div>
        </section>

        <ThemeSelector />

        <section className="rounded-2xl border border-green-500/30 bg-[#081026]/70 p-4">
          <h2 className="text-green-400 font-mono text-sm mb-3">[ DISPLAY ]</h2>
          <div className="grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-green-300 text-sm">Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="w-full max-w-[160px] rounded border border-green-500/30 bg-transparent px-3 py-2 text-sm text-green-400 focus:outline-none focus:border-green-400 sm:w-auto"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n} className="bg-[#0a0e27] text-green-300">
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-green-300 text-sm">Font size</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full max-w-[160px] rounded border border-green-500/30 bg-transparent px-3 py-2 text-sm text-green-400 focus:outline-none focus:border-green-400 sm:w-auto"
              >
                {["xs", "sm", "base", "lg"].map((s) => (
                  <option key={s} value={s} className="bg-[#0a0e27] text-green-300">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSaveDisplay}
              className="w-full rounded-md border border-green-500/30 bg-transparent px-4 py-2 text-sm text-green-400 transition-colors hover:border-green-400 hover:bg-green-400/10"
            >
              {saved ? "✓ SAVED" : "SAVE DISPLAY SETTINGS"}
            </button>
          </div>
        </section>

        <NotificationPrefs />
        <APIKeyManager />
      </div>
    </main>
  );
}
