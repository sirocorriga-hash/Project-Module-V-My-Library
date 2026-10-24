/* Thin wrapper around the Flask API. Every call returns parsed JSON or throws
   an ApiError whose message is ready to show (already in the user's language). */
import type {
  Book, BookFields, BookHistory, ImportMode, ImportPreview, ImportResult, LookupResult, Note, Report, Session, User
} from "./types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields?: Record<string, string>) {
    super(message);
  }
}

let language = "it";
let onUnauthorized = () => {};
export const setApiLanguage = (lang: string) => { language = lang; };
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    "X-Requested-With": "fetch",          // required by the server's CSRF guard
    "Accept-Language": language           // server messages come back in this language
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method, headers, credentials: "same-origin",
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(language === "it" ? "Il server non è raggiungibile." : "The server cannot be reached.", 0);
  }
  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) onUnauthorized();
    throw new ApiError(data?.error ?? `Request failed (${res.status}).`, res.status, data?.fields);
  }
  return data as T;
}

const query = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "") as [string, string][];
  return entries.length ? `?${new URLSearchParams(entries)}` : "";
};

export const api = {
  // Account
  me: () => request<User>("/auth/me"),
  login: (email: string, password: string) => request<User>("/auth/login", "POST", { email, password }),
  register: (name: string, email: string, password: string, lang: string) =>
    request<User>("/auth/register", "POST", { name, email, password, language: lang }),
  logout: () => request<null>("/auth/logout", "POST"),
  updateMe: (settings: Partial<Record<keyof User, unknown>>) => request<User>("/auth/me", "PUT", settings),
  forgot: (email: string) => request<null>("/auth/forgot", "POST", { email }),
  reset: (token: string, password: string) => request<User>("/auth/reset", "POST", { token, password }),

  // Shared library
  renameLibrary: (name: string) => request<User>("/library", "PUT", { name }),
  newInviteCode: () => request<User>("/library/invite", "POST"),
  joinLibrary: (code: string) => request<User>("/library/join", "POST", { code }),
  leaveLibrary: () => request<User>("/library/leave", "POST"),

  // Books
  list: () => request<Book[]>("/books"),
  create: (book: BookFields) => request<Book>("/books", "POST", book),
  update: (id: number, book: BookFields) => request<Book>(`/books/${id}`, "PUT", book),
  remove: (id: number) => request<null>(`/books/${id}`, "DELETE"),
  history: (id: number) => request<BookHistory>(`/books/${id}/history`),
  lookupIsbn: (isbn: string) => request<LookupResult>(`/lookup/isbn/${encodeURIComponent(isbn)}`),

  // Loans
  lend: (id: number, borrower: string, dueOn: string | null) => request<Book>(`/books/${id}/lend`, "POST", { borrower, due_on: dueOn }),
  giveBack: (id: number) => request<Book>(`/books/${id}/return`, "POST"),
  borrowers: () => request<string[]>("/borrowers"),

  // Readings, sessions, notes
  startReading: (id: number) => request<Book>(`/books/${id}/readings`, "POST"),
  updateReading: (id: number, changes: { finished_on?: string | null; rating?: number | null }) =>
    request<Book>(`/readings/${id}`, "PUT", changes),
  deleteReading: (id: number) => request<Book>(`/readings/${id}`, "DELETE"),
  addSession: (id: number, s: { read_on: string; minutes: number | string; pages: number | string; finished: boolean; rating: number | null }) =>
    request<{ session: Session; book: Book }>(`/books/${id}/sessions`, "POST", s),
  deleteSession: (id: number) => request<Book>(`/sessions/${id}`, "DELETE"),
  addNote: (id: number, note: { body: string; is_quote: boolean; page: number | string }) =>
    request<Note>(`/books/${id}/notes`, "POST", note),
  deleteNote: (id: number) => request<null>(`/notes/${id}`, "DELETE"),

  // Import / export
  importBooks: <M extends ImportMode>(books: unknown, mode: M) =>
    request<M extends "preview" ? ImportPreview : ImportResult>("/books/import", "POST", { mode, books }),
  exportUrl: "/api/books/export",

  // Reports, with optional what-if parameters
  report: (p: { dailyMinutes?: number; pagesPerHour?: number | "auto" } = {}) =>
    request<Report>(`/reports${query({ daily_minutes: p.dailyMinutes, pages_per_hour: p.pagesPerHour })}`)
};
