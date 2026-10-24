/* Pure helpers: everything on the catalogue screen is derived from the one list of books. */
import type { Book, ReadStatus } from "../types";

export const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

export type LoanFilter = "" | "available" | "loaned" | "overdue";
export type SortKey = "title" | "author" | "year" | "rating" | "recent";

export interface Filters {
  search: string;
  genre: string;
  loan: LoanFilter;
  readStatus: "" | ReadStatus;
  sortBy: SortKey;
}

export const NO_FILTERS: Filters = { search: "", genre: "", loan: "", readStatus: "", sortBy: "title" };

export const hasFilters = (f: Filters) => Boolean(f.search || f.genre || f.loan || f.readStatus);

export function uniqueGenres(books: Book[]): string[] {
  return [...new Set(books.map(b => b.genre).filter(Boolean))].sort(collator.compare);
}

export function computeStats(books: Book[]) {
  const owned = books.filter(b => !b.wishlist);
  return {
    books: owned.length,
    onLoan: owned.filter(b => b.status === "loaned").length,
    overdue: owned.filter(b => b.overdue).length,
    read: books.filter(b => b.times_read > 0).length,
    wishlist: books.length - owned.length
  };
}

/** Puts null values last, whatever the direction. */
const nullsLast = <T,>(a: T | null, b: T | null, compare: (x: T, y: T) => number) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : compare(a, b);

function compareBy(sortBy: SortKey): (a: Book, b: Book) => number {
  switch (sortBy) {
    case "year": return (a, b) => nullsLast(a.year, b.year, (x, y) => y - x) || collator.compare(a.title, b.title);
    case "rating": return (a, b) => nullsLast(a.rating, b.rating, (x, y) => y - x) || collator.compare(a.title, b.title);
    case "recent": return (a, b) => b.id - a.id;
    default: return (a, b) => collator.compare(a[sortBy] || "", b[sortBy] || "");
  }
}

function matchesLoan(book: Book, loan: LoanFilter): boolean {
  if (loan === "overdue") return book.overdue;
  return !loan || book.status === loan;
}

export function visibleBooks(books: Book[], f: Filters): Book[] {
  const q = f.search.trim().toLowerCase();
  return books
    .filter(b =>
      (!q || [b.title, b.author, b.isbn].some(v => v.toLowerCase().includes(q)))
      && (!f.genre || b.genre === f.genre)
      && matchesLoan(b, f.loan)
      && (!f.readStatus || b.read_status === f.readStatus))
    .sort(compareBy(f.sortBy));
}

/** Progress of the current reading in %, or null when it cannot be computed. */
export function progress(book: Book): number | null {
  if (book.read_status === "read") return 100;
  if (book.read_status !== "reading" || !book.pages) return null;
  return Math.min(100, Math.round((book.pages_read / book.pages) * 100));
}
