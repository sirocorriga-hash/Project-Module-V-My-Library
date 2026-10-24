import { locale } from "../i18n";
import type { Language } from "../types";

/** 95 -> "1 h 35 min", 40 -> "40 min" */
export function formatMinutes(total: number): string {
  if (!total) return "0 min";
  const h = Math.floor(total / 60), m = total % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}

export const formatHours = (h: number | null, lang: Language) =>
  h == null ? "—" : `${h.toLocaleString(locale(lang), { maximumFractionDigits: 1 })} h`;

export const formatDate = (iso: string | null, lang: Language) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(locale(lang), { day: "numeric", month: "short", year: "numeric" }) : "—";

export const formatMonth = (yyyyMm: string, lang: Language) =>
  new Date(`${yyyyMm}-01T00:00:00`).toLocaleDateString(locale(lang), { month: "short" });

/** Local date as YYYY-MM-DD (toISOString would use UTC and can be off by one day). */
export function isoDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const addDays = (days: number, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return isoDate(d);
};

/** "12:05" for a running timer. */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
