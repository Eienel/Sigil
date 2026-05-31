"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sun, Moon } from "@phosphor-icons/react";

type Theme = "light" | "dark";

// Applies the theme class and persists the choice. The inline script in the
// layout head sets the initial class before paint to avoid a flash.
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem("sigil-theme", theme);
  } catch {
    // storage may be unavailable, ignore
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Light is the default. Dark only if the user explicitly chose it before.
    const stored =
      typeof localStorage !== "undefined"
        ? (localStorage.getItem("sigil-theme") as Theme | null)
        : null;
    setTheme(stored === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  // Avoid hydration mismatch: render a stable placeholder until mounted.
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:text-ink"
    >
      <motion.span
        key={isDark ? "moon" : "sun"}
        initial={{ rotate: -30, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        {theme === null ? (
          <Sun size={16} weight="regular" />
        ) : isDark ? (
          <Moon size={16} weight="regular" />
        ) : (
          <Sun size={16} weight="regular" />
        )}
      </motion.span>
    </button>
  );
}
