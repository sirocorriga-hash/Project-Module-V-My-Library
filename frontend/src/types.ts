/* Shapes of the data exchanged with the Flask API. */

export type Language = "it" | "en";
export type ThemeChoice = "auto" | "light" | "dark";
export type ReadStatus = "to_read" | "reading" | "read" | "wishlist";

export interface Member { id: number; name: string }

export interface Library { id: number; name: string; invite_code: string; members: Member[] }

export interface User {
  id: number;
  email: string;
  name: string;
  language: Language;
  pages_per_hour: number | null;
  daily_minutes: number;
  yearly_goal: number | null;
  library: Library;
}

/** Catalogue fields, as sent by the book form. */
export interface BookFields {
  title: string;
  author: string;
  genre: string;
  year: number | null;
  isbn: string;
  shelfmark: string;
  pages: number | null;
  cover_url: string;
  wishlist: boolean;
}

/** A book as the signed-in user sees it (catalogue + their own reading state). */
export interface Book extends BookFields {
  id: number;
  status: "available" | "loaned";
  borrower: string;
  due_on: string | null;
  overdue: boolean;
  read_status: ReadStatus;
  times_read: number;
  finished_on: string | null;
  rating: number | null;
  minutes_read: number;
  pages_read: number;
  session_count: number;
}

export interface Session { id: number; read_on: string; minutes: number; pages: number | null }

export interface Reading {
  id: number;
  book_id: number;
  started_on: string;
  finished_on: string | null;
  rating: number | null;
  minutes: number;
  pages_read: number;
  sessions: Session[];
}

export interface Note { id: number; book_id: number; body: string; is_quote: boolean; page: number | null; created_at: string }

export interface Loan {
  id: number;
  borrower: string;
  lent_on: string;
  due_on: string | null;
  returned_on: string | null;
  days: number;
  active: boolean;
  overdue: boolean;
}

export interface BookHistory { book: Book; readings: Reading[]; notes: Note[]; loans: Loan[] }

export type ImportMode = "preview" | "add" | "update" | "replace";
export interface ImportPreview { total: number; matched: number; fresh: number }
export interface ImportResult { added: number; updated: number }

export interface Report {
  generated_on: string;
  estimate: {
    pace_pages_per_hour: number;
    pace_source: "manual" | "measured" | "default" | "what-if";
    measured_pages_per_hour: number | null;
    daily_minutes: number;
    books: number;
    pages_remaining: number;
    hours: number;
    days: number;
    finish_date: string | null;
    queue: { id: number; title: string; author: string; read_status: "reading" | "to_read"; pages: number; pages_remaining: number; hours: number }[];
    without_pages: { id: number; title: string }[];
  };
  reading: {
    total_minutes: number;
    total_hours: number;
    sessions: number;
    books_finished: number;
    avg_hours_per_book: number | null;
    avg_minutes_per_session: number | null;
    finished: {
      book_id: number; title: string; author: string; reading_number: number; minutes: number; sessions: number;
      rating: number | null; started_on: string; finished_on: string; calendar_days: number; pages_per_hour: number | null;
    }[];
    months: { month: string; minutes: number; pages: number }[];
    streak: { current: number; longest: number; read_today: boolean };
    goal: { year: number; goal: number | null; finished: number; expected_by_now: number | null; on_track: boolean | null };
  };
  lending: {
    total_loans: number;
    active_loans: number;
    overdue_loans: number;
    avg_days_closed: number | null;
    longest_days: number | null;
    total_days: number;
    active: { book_id: number; title: string; borrower: string; lent_on: string; due_on: string | null; days: number; overdue: boolean }[];
    by_borrower: { borrower: string; loans: number; days: number; active: number }[];
  };
}

export interface LookupResult {
  isbn: string; title: string; author: string; year: number | null; pages: number | null; genre: string; cover_url: string;
}
