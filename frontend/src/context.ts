import { createContext, useContext } from "react";
import type { Translate } from "./i18n";
import type { Language, ThemeChoice, User } from "./types";

export interface Timer { bookId: number; title: string; startedAt: number }
export interface PendingLog { bookId: number; minutes: number }

export interface AppState {
  user: User;
  setUser: (user: User) => void;
  signOut: () => void;
  notify: (message: string) => void;
  t: Translate;
  lang: Language;
  setLang: (lang: Language) => void;
  theme: ThemeChoice;
  effectiveTheme: "light" | "dark";
  setTheme: (theme: ThemeChoice) => void;
  timer: Timer | null;
  startTimer: (bookId: number, title: string) => void;
  stopTimer: () => void;            // stops and leaves a PendingLog for the catalogue to open
  pendingLog: PendingLog | null;
  clearPendingLog: () => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const state = useContext(AppContext);
  if (!state) throw new Error("useApp() outside <AppContext.Provider>");
  return state;
}
