import { makeBook } from "../test-utils";
import { computeStats, NO_FILTERS, progress, uniqueGenres, visibleBooks } from "./books";
import { formatElapsed, formatMinutes } from "./format";

const books = [
  makeBook({ id: 1, title: "Emma", author: "Austen", genre: "Fiction", year: 1815, rating: 4, times_read: 1, read_status: "read" }),
  makeBook({ id: 2, title: "dune", author: "Herbert", genre: "Sci-Fi", year: null, status: "loaned", overdue: true }),
  makeBook({ id: 3, title: "Beloved", author: "Morrison", genre: "Fiction", year: 1987, wishlist: true, read_status: "wishlist" })
];

describe("visibleBooks", () => {
  it("sorts by title ignoring case", () => {
    expect(visibleBooks(books, NO_FILTERS).map(b => b.title)).toEqual(["Beloved", "dune", "Emma"]);
  });
  it("sorts by year newest first, books without a year last", () => {
    expect(visibleBooks(books, { ...NO_FILTERS, sortBy: "year" }).map(b => b.id)).toEqual([3, 1, 2]);
  });
  it("filters overdue loans, reading status and search", () => {
    expect(visibleBooks(books, { ...NO_FILTERS, loan: "overdue" }).map(b => b.id)).toEqual([2]);
    expect(visibleBooks(books, { ...NO_FILTERS, readStatus: "wishlist" }).map(b => b.id)).toEqual([3]);
    expect(visibleBooks(books, { ...NO_FILTERS, search: "MORR" }).map(b => b.id)).toEqual([3]);
  });
  it("sorts by rating with unrated books last", () => {
    expect(visibleBooks(books, { ...NO_FILTERS, sortBy: "rating" })[0].id).toBe(1);
  });
});

describe("helpers", () => {
  it("counts stats without wishlist books on the shelf", () => {
    expect(computeStats(books)).toEqual({ books: 2, onLoan: 1, overdue: 1, read: 1, wishlist: 1 });
  });
  it("lists genres once, sorted", () => {
    expect(uniqueGenres(books)).toEqual(["Fiction", "Sci-Fi"]);
  });
  it("computes reading progress", () => {
    expect(progress(makeBook({ read_status: "reading", pages: 200, pages_read: 50 }))).toBe(25);
    expect(progress(makeBook({ read_status: "reading", pages: null }))).toBeNull();
    expect(progress(makeBook({ read_status: "read" }))).toBe(100);
  });
  it("formats durations", () => {
    expect(formatMinutes(95)).toBe("1 h 35 min");
    expect(formatMinutes(60)).toBe("1 h");
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatElapsed(65_000)).toBe("01:05");
    expect(formatElapsed(3_725_000)).toBe("1:02:05");
  });
});
