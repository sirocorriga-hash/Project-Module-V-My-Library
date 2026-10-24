import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { AppContext, type AppState } from "./context";
import { translator } from "./i18n";
import type { Book, User } from "./types";

export const testUser: User = {
  id: 1, email: "ada@example.com", name: "Ada", language: "en", pages_per_hour: null, daily_minutes: 30,
  yearly_goal: null, library: { id: 1, name: "Ada's", invite_code: "abc", members: [{ id: 1, name: "Ada" }] }
};

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 1, title: "Dune", author: "Frank Herbert", genre: "Sci-Fi", year: 1965, isbn: "", shelfmark: "A-1",
    pages: 400, cover_url: "", wishlist: false, status: "available", borrower: "", due_on: null, overdue: false,
    read_status: "to_read", times_read: 0, finished_on: null, rating: null, minutes_read: 0, pages_read: 0,
    session_count: 0, ...overrides
  };
}

/** Renders a component inside the app context with a fake signed-in user. */
export function renderWithApp(ui: ReactElement, overrides: Partial<AppState> = {}) {
  const state: AppState = {
    user: testUser, setUser: vi.fn(), signOut: vi.fn(), notify: vi.fn(), t: translator("en"), lang: "en",
    setLang: vi.fn(), theme: "light", effectiveTheme: "light", setTheme: vi.fn(), timer: null,
    startTimer: vi.fn(), stopTimer: vi.fn(), pendingLog: null, clearPendingLog: vi.fn(), ...overrides
  };
  return { state, ...render(<MemoryRouter><AppContext.Provider value={state}>{ui}</AppContext.Provider></MemoryRouter>) };
}
