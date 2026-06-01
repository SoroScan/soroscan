"use client";

import { useState } from "react";

interface DisplayPrefs {
  rowsPerPage: number;
  fontSize: string;
}

const DEFAULT_DISPLAY = { rowsPerPage: 10, fontSize: "sm" };

export default function AccountSettings() {
  const [rowsPerPage] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const display = localStorage.getItem("display_prefs");
      if (display) {
        try {
          const parsed = JSON.parse(display) as DisplayPrefs;
          return parsed.rowsPerPage ?? DEFAULT_DISPLAY.rowsPerPage;
        } catch { return DEFAULT_DISPLAY.rowsPerPage; }
      }
    }
    return DEFAULT_DISPLAY.rowsPerPage;
  });

  return (
    <div className="p-4 border border-green-500/20 bg-[#061120]/60 rounded-2xl">
      <h2 className="text-lg font-bold text-green-400 mb-2">Account Preference Profile</h2>
      <p className="text-sm text-green-300">Page sizing configuration limits: {rowsPerPage} rows per view</p>
    </div>
  );
}
