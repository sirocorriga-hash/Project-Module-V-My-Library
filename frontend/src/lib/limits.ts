/* Allowed ranges, the same numbers as backend/app/limits.py
   (a backend test checks that the two files agree). The server validates
   everything again: these only make the browser's own checks match it. */
export const LIMITS = {
  MAX_YEAR: 2100,
  MAX_PAGES: 20000,          // pages of a book, and the page of a note
  MAX_MINUTES: 1440,         // one reading session, and the daily reading time
  MAX_SESSION_PAGES: 5000,   // pages read in one session
  MAX_PACE: 500,             // pages per hour
  MAX_GOAL: 1000             // books per year
} as const;
