"use client";
import { useEffect, useState } from "react";

export default function ThemeSelector() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as "dark" | "light" | null;
      if (stored) return stored;
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className="border border-green-500/30 rounded-xl bg-[#08102a]/80 p-5">
      <h2 className="text-green-400 text-sm font-mono mb-4">[ THEME ]</h2>
      <div className="flex flex-wrap gap-3">
        {(["dark", "light"] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleThemeChange(t)}
            className={`rounded-xl border px-4 py-2 text-sm font-mono transition-colors ${
              theme === t
                ? "border-green-400 bg-green-400/10 text-green-400"
                : "border-green-500/30 text-green-600 hover:border-green-400"
            }`}
          >
            {t === "dark" ? "◆ DARK" : "◇ LIGHT"}
          </button>
        ))}
      </div>
    </div>
  );
}
