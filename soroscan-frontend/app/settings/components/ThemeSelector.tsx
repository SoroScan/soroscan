"use client";
import { useState, useEffect } from "react";

export default function ThemeSelector() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <div className="rounded-2xl border border-green-500/30 bg-[#081026]/70 p-4 mb-4">
      <h2 className="text-green-400 font-mono text-sm mb-3">[ THEME ]</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        {(["dark", "light"] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleThemeChange(t)}
            className={`w-full rounded-md border px-4 py-3 text-sm font-mono transition-colors sm:w-auto ${
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
