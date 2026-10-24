import { Dropdown } from "react-bootstrap";
import { useApp } from "../context";
import { useNow } from "../hooks";
import { progress } from "../lib/books";
import { formatDate, formatElapsed, formatMinutes } from "../lib/format";
import type { Book } from "../types";
import Stars from "./Stars";

export interface CardActions {
  onLend: (b: Book) => void;
  onReturn: (b: Book) => void;
  onDetails: (b: Book) => void;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
}

const READ_LABEL = { to_read: "toRead", reading: "readingNow", read: "read", wishlist: "wishlist" } as const;

export default function BookCard({ book, onLend, onReturn, onDetails, onEdit, onDelete }: { book: Book } & CardActions) {
  const { t, lang, timer, startTimer, stopTimer } = useApp();
  const timing = timer?.bookId === book.id;
  const now = useNow(timing);
  const isLoaned = book.status === "loaned";
  const pct = progress(book);
  const meta = [book.genre, book.year, book.pages && t("pagesShort", { n: book.pages })].filter(Boolean).join(" · ");

  function toggleTimer() {
    if (timing) return stopTimer();
    if (timer && !window.confirm(t("confirmTimerSwitch", { title: timer.title }))) return;
    startTimer(book.id, book.title);
  }

  let badge = <span className="badge-status badge-available">{t("badgeOnShelf")}</span>;
  if (book.wishlist) badge = <span className="badge-status badge-wishlist">{t("badgeWishlist")}</span>;
  else if (book.overdue) badge = <span className="badge-status badge-overdue">{t("badgeOverdue")}</span>;
  else if (isLoaned) badge = <span className="badge-status badge-loaned">{t("badgeOnLoan")}</span>;

  return (
    <div className="col-12 col-md-6 col-xl-4">
      <article className={`card-book${book.wishlist ? " is-wishlist" : ""}`}>
        <div className="spine"><span className="shelfmark">{book.shelfmark || "—"}</span></div>
        <div className="card-body-custom">
          <div className="d-flex gap-3">
            {book.cover_url && <img className="cover" src={book.cover_url} alt="" loading="lazy" />}
            <div className="flex-grow-1 min-w-0">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <h3 className="book-title">{book.title}</h3>
                {badge}
              </div>
              <p className="author">{book.author}</p>
              <p className="meta">{meta}</p>
              {isLoaned && (
                <p className={`meta${book.overdue ? " text-danger-emphasis fw-semibold" : ""}`}>
                  {t("withBorrower", { name: book.borrower || "—" })}
                  {book.due_on && ` · ${t("dueOn", { date: formatDate(book.due_on, lang) })}`}
                </p>
              )}
              {book.isbn && <p className="meta mono">{book.isbn}</p>}
            </div>
          </div>

          <div className="reading-line">
            <span className={`read-chip read-${book.read_status}`}>{t(READ_LABEL[book.read_status])}</span>
            <Stars value={book.rating} />
            {book.times_read > 1 && <span className="meta">{t("readTimes", { n: book.times_read })}</span>}
            {book.minutes_read > 0 && <span className="meta">{t("timeRead", { time: formatMinutes(book.minutes_read) })}</span>}
          </div>
          {pct !== null && book.read_status === "reading" && (
            <div className="progress-thin" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
                 aria-label={`${pct}%`}><div style={{ width: `${pct}%` }} /></div>
          )}

          <div className="card-actions mt-auto pt-2">
            {!book.wishlist && (isLoaned
              ? <button className="btn btn-sm btn-outline-gold" onClick={() => onReturn(book)}><i className="bi bi-arrow-return-left me-1" />{t("giveBack")}</button>
              : <button className="btn btn-sm btn-outline-gold" onClick={() => onLend(book)}><i className="bi bi-box-arrow-right me-1" />{t("lend")}</button>)}
            {!book.wishlist && (
              <button className={`btn btn-sm ${timing ? "btn-gold" : "btn-outline-gold"}`} onClick={toggleTimer}>
                <i className={`bi ${timing ? "bi-stop-fill" : "bi-stopwatch"} me-1`} />
                {timing ? <span className="mono">{formatElapsed(now - timer!.startedAt)}</span> : t("start")}
              </button>
            )}
            <button className="btn btn-sm btn-link text-decoration-none link-accent" onClick={() => onDetails(book)}>{t("details")}</button>
            <Dropdown className="ms-auto" align="end">
              <Dropdown.Toggle variant="link" size="sm" className="no-caret text-body-secondary" aria-label={t("more")}>
                <i className="bi bi-three-dots" />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => onEdit(book)}><i className="bi bi-pencil me-2" />{t("edit")}</Dropdown.Item>
                <Dropdown.Item className="text-danger" onClick={() => onDelete(book)}><i className="bi bi-trash me-2" />{t("delete")}</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
      </article>
    </div>
  );
}
