"use client"

import { useEffect, useState } from "react"

type Theme = "light" | "dark"

export function useTheme() {
  const [theme, setTheme] = useState<Theme | null>(null)

  // apply theme to document
  const apply = (t: Theme) => {
    const el = document.documentElement
    if (t === "dark") el.classList.add("dark")
    else el.classList.remove("dark")
  }

  useEffect(() => {
    // read saved preference or system preference
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("theme") : null
    let initial: Theme = "dark"
    if (saved === "light" || saved === "dark") initial = saved
    else if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) initial = "light"

    setTheme(initial)
    apply(initial)

    // enable smooth transitions after initial paint
    // add a class that activates CSS transitions defined in globals.css
    requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-transition")
    })

    // listen for OS preference changes if user hasn't saved a preference
    const mql = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null
    const listener = (e: MediaQueryListEvent) => {
      const savedNow = window.localStorage.getItem("theme")
      if (savedNow) return // user choice overrides
      const newTheme: Theme = e.matches ? "light" : "dark"
      setTheme(newTheme)
      apply(newTheme)
    }
    if (mql && mql.addEventListener) mql.addEventListener("change", listener)
    else if (mql && (mql as any).addListener) (mql as any).addListener(listener)

    return () => {
      if (mql && mql.removeEventListener) mql.removeEventListener("change", listener)
      else if (mql && (mql as any).removeListener) (mql as any).removeListener(listener)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    try {
      window.localStorage.setItem("theme", next)
    } catch (e) {}
    apply(next)
  }

  return { theme, toggleTheme }
}
