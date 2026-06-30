"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HamburgerToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen: boolean;
  onClick: () => void;
  ariaControls?: string;
}

export function HamburgerToggle({
  isOpen,
  onClick,
  ariaControls = "mobile-menu",
  className,
  ...props
}: HamburgerToggleProps) {
  return (
    <button
      className={cn(
        // `touch-target` enforces WCAG 2.5.5 / Apple HIG 44pt tap target.
        // Replaces the old `p-2`-only layout that measured ~36px with a
        // 20px icon — too small for thumbs on real devices.
        "md:hidden touch-target flex items-center justify-center text-terminal-green hover:text-terminal-cyan transition-colors",
        "focus:outline-none focus:ring-1 focus:ring-terminal-green/50 rounded-sm",
        className
      )}
      onClick={onClick}
      aria-label={isOpen ? "Close menu" : "Toggle menu"}
      aria-expanded={isOpen}
      aria-controls={ariaControls}
      aria-haspopup="true"
      {...props}
    >
      {isOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  );
}
