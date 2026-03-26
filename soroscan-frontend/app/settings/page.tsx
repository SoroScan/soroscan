"use client";
import { useState } from "react";
import ThemeSelector from "./components/ThemeSelector";
import NotificationPrefs from "./components/NotificationPrefs";
import APIKeyManager from "./components/APIKeyManager";

const getInitialDisplaySettings = () => {
  if (typeof window === "undefined") return { rowsPerPage: 10, fontSize: "14" };
  const display = localStorage.getItem("displaySettings");
  if (display) {
    try {
      const parsed = JSON.parse(display);
      return {
        rowsPerPage: parsed.rowsPerPage || 10,
        fontSize: String(parsed.fontSize || "14"),
      };
    } catch {
      // ignore malformed prefs
      return { rowsPerPage: 10, fontSize: "14" };
    }
  }
  return { rowsPerPage: 10, fontSize: "14" };
};

export default function SettingsPage() {
  const initial = getInitialDisplaySettings();
  const [rowsPerPage, setRowsPerPage] = useState<number>(initial.rowsPerPage);
  const [fontSize, setFontSize] = useState<string>(initial.fontSize);
  const [saved, setSaved] = useState(false);

  const handleSaveDisplay = () => {
    localStorage.setItem("displayPrefs", JSON.stringify({ rowsPerPage, fontSize }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#0a0e27] text-green-400 p-6 font-mono">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 border-b border-green-500/30 pb-4">
          <h1 className="text-green-400 text-xl font-bold tracking-widest">
            ◆ SETTINGS
          </h1>
          <p className="text-green-600 text-xs mt-1">
            Manage your preferences, notifications, and API keys
          </p>
        </div>

        {/* Account Info */}
        <div className="border border-green-500/30 rounded p-4 mb-4">
          <h2 className="text-green-400 font-mono text-sm mb-3">[ ACCOUNT ]</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-green-600 text-sm">Username</span>
              <span className="text-green-300 text-sm">soroscan_user</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600 text-sm">Email</span>
              <span className="text-green-300 text-sm">user@soroscan.io</span>
            </div>
          </div>
        </div>

        {/* Theme */}
        <ThemeSelector />

        {/* Display Preferences */}
        <div className="border border-green-500/30 rounded p-4 mb-4">
          <h2 className="text-green-400 font-mono text-sm mb-3">[ DISPLAY ]</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-green-300 text-sm">Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="bg-transparent border border-green-500/30 rounded px-2 py-1 font-mono text-sm text-green-400 focus:outline-none focus:border-green-400"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n} className="bg-[#0a0e27]">{n}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-green-300 text-sm">Font size</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="bg-transparent border border-green-500/30 rounded px-2 py-1 font-mono text-sm text-green-400 focus:outline-none focus:border-green-400"
              >
                {['12', '14', '16', '18'].map((s) => (
                  <option key={s} value={s} className="bg-[#0a0e27]">{s}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSaveDisplay}
              className="w-full py-2 border border-green-500/30 rounded font-mono text-sm text-green-400 hover:border-green-400 hover:bg-green-400/10 transition-colors"
            >
              {saved ? "✓ SAVED" : "SAVE DISPLAY SETTINGS"}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <NotificationPrefs />

        {/* API Keys */}
        <APIKeyManager />
      </div>
    </main>
  );
}
