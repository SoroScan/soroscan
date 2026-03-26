"use client"

import { useEffect, useState } from "react"

type Theme = "light" | "dark"

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "dark"
  const saved = window.localStorage.getItem("theme")
  if (saved === "light" || saved === "dark") return saved
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light"
  return "dark"
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  // apply theme to document
  const apply = (t: Theme) => {
    const el = document.documentElement
    if (t === "dark") el.classList.add("dark")
    else el.classList.remove("dark")
  }

  useEffect(() => {
    // apply theme to document on mount
    apply(theme)

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
    else if (mql && "addListener" in mql) (mql as MediaQueryList & { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(listener)

    return () => {
      if (mql && mql.removeEventListener) mql.removeEventListener("change", listener)
      else if (mql && "removeListener" in mql) (mql as MediaQueryList & { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener(listener)
    }
  }, [theme])

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    try {
      window.localStorage.setItem("theme", next)
    } catch {
      // Ignore localStorage errors (e.g., in private mode)
    }
    apply(next)
  }

  return { theme, toggleTheme }
}
