import { useEffect, useState } from "react";
import type { ThemeChoice } from "./types";

/** The current time, refreshed every `ms` while `active` (for running timers). */
export function useNow(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

/** Resolves "auto" to light/dark following the system setting, and applies it to <html>. */
export function useAppliedTheme(choice: ThemeChoice): "light" | "dark" {
  const query = "(prefers-color-scheme: dark)";
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.(query).matches ?? false);

  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const effective = choice === "auto" ? (systemDark ? "dark" : "light") : choice;
  useEffect(() => {
    document.documentElement.dataset.theme = effective;
    document.documentElement.dataset.bsTheme = effective;     // Bootstrap's own dark mode
  }, [effective]);
  return effective;
}

/** Reads a CSS custom property, so charts follow the active theme. */
export const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
