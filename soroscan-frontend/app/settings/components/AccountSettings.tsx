"use client";
import { useEffect, useState } from "react";
import ThemeSelector from "./ThemeSelector";

type DisplayPrefs = {
  rowsPerPage: number;
  fontSize: string;
};

const DEFAULT_DISPLAY: DisplayPrefs = {
  rowsPerPage: 10,
  fontSize: "base",
};

export default function AccountSettings() {
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_DISPLAY.rowsPerPage);
  const [fontSize, setFontSize] = useState(DEFAULT_DISPLAY.fontSize);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const display = localStorage.getItem("displayPrefs");
    if (display) {
      try {
        const parsed = JSON.parse(display) as DisplayPrefs;
        setRowsPerPage(parsed.rowsPerPage ?? DEFAULT_DISPLAY.rowsPerPage);
        setFontSize(parsed.fontSize ?? DEFAULT_DISPLAY.fontSize);
      } catch {
        // ignore malformed stored prefs
      }
    }
  }, []);

  const handleSaveDisplay = () => {
    const payload: DisplayPrefs = { rowsPerPage, fontSize };
    localStorage.setItem("displayPrefs", JSON.stringify(payload));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="border border-green-500/30 rounded-xl p-5 bg-[#08102a]/80">
        <h2 className="text-green-400 text-sm font-mono mb-3">[ ACCOUNT ]</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-green-500/10 bg-[#09132f]/80 p-4">
            <p className="text-green-600 text-xs uppercase tracking-[0.2em] mb-2">Username</p>
            <p className="text-green-300 font-mono text-sm">soroscan_user</p>
          </div>
          <div className="rounded-lg border border-green-500/10 bg-[#09132f]/80 p-4">
            <p className="text-green-600 text-xs uppercase tracking-[0.2em] mb-2">Email</p>
            <p className="text-green-300 font-mono text-sm">user@soroscan.io</p>
          </div>
          <div className="rounded-lg border border-green-500/10 bg-[#09132f]/80 p-4">
            <p className="text-green-600 text-xs uppercase tracking-[0.2em] mb-2">Plan</p>
            <p className="text-green-300 font-mono text-sm">Developer</p>
          </div>
          <div className="rounded-lg border border-green-500/10 bg-[#09132f]/80 p-4">
            <p className="text-green-600 text-xs uppercase tracking-[0.2em] mb-2">Member since</p>
            <p className="text-green-300 font-mono text-sm">Jan 15, 2025</p>
          </div>
        </div>
      </div>

      <ThemeSelector />

      <div className="border border-green-500/30 rounded-xl p-5 bg-[#08102a]/80">
        <h2 className="text-green-400 text-sm font-mono mb-3">[ DISPLAY PREFERENCES ]</h2>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 items-center">
            <span className="text-green-300 text-sm">Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="w-full max-w-xs bg-transparent border border-green-500/30 rounded px-3 py-2 font-mono text-sm text-green-300 focus:outline-none focus:border-green-400"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="bg-[#0a0e27] text-green-300">
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 items-center">
            <span className="text-green-300 text-sm">Font size</span>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="w-full max-w-xs bg-transparent border border-green-500/30 rounded px-3 py-2 font-mono text-sm text-green-300 focus:outline-none focus:border-green-400"
            >
              {['xs', 'sm', 'base', 'lg'].map((size) => (
                <option key={size} value={size} className="bg-[#0a0e27] text-green-300">
                  {size}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSaveDisplay}
            className="w-full inline-flex justify-center items-center rounded-lg border border-green-500/30 px-4 py-2 text-sm font-mono text-green-400 hover:border-green-400 hover:bg-green-400/10 transition-colors"
          >
            {saved ? '✓ SAVED' : 'SAVE DISPLAY SETTINGS'}
          </button>
        </div>
      </div>
    </div>
  );
}
