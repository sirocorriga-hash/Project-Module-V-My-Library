import { useState, type FormEvent } from "react";
import { api } from "../../api";
import { useApp } from "../../context";
import { formatDate, formatMinutes, isoDate } from "../../lib/format";
import { LIMITS } from "../../lib/limits";
import type { Book, Reading } from "../../types";
import Stars from "../Stars";
import { invalidClass, type TabProps } from "./shared";

const blankSession = (minutes?: number | null) =>
  ({ read_on: isoDate(), minutes: minutes ? String(minutes) : "", pages: "", finished: false, rating: null as number | null });

interface Props extends TabProps {
  book: Book;
  readings: Reading[];
  initialMinutes?: number | null;     // from the timer
}

/** Log a session, start or re-read, and the list of readings with their sessions. */
export default function ReadingTab({ book, readings, initialMinutes, run, errors }: Props) {
  const { t, lang, notify } = useApp();
  const [session, setSession] = useState(() => blankSession(initialMinutes));
  const invalid = (field: string) => invalidClass(errors, field);
  const open = readings.find(r => !r.finished_on);

  async function addSession(e: FormEvent) {
    e.preventDefault();
    const logged = session;
    if (await run(() => api.addSession(book.id, logged))) {
      setSession(blankSession());
      notify(logged.finished ? t("finishedToast", { title: book.title })
        : t("loggedToast", { time: formatMinutes(Number(logged.minutes)) }));
    }
  }

  const readingBlock = (r: Reading, index: number) => (
    <div key={r.id} className="reading-block">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <strong>{t("readingN", { n: readings.length - index })}</strong>
        <span className="meta">
          {t("startedOn", { date: formatDate(r.started_on, lang) })} ·{" "}
          {r.finished_on ? t("finishedOn", { date: formatDate(r.finished_on, lang) }) : t("inProgress")} ·{" "}
          {formatMinutes(r.minutes)}
        </span>
        {r.finished_on && <Stars value={r.rating} label={t("rating")} onChange={v => run(() => api.updateReading(r.id, { rating: v }))} />}
        <span className="ms-auto d-flex gap-1">
          {r.finished_on
            ? <button className="btn btn-sm btn-link p-0 link-accent" onClick={() => run(() => api.updateReading(r.id, { finished_on: null }))}>{t("reopen")}</button>
            : <button className="btn btn-sm btn-link p-0 link-accent" onClick={() => run(() => api.updateReading(r.id, { finished_on: isoDate() }))}>{t("markFinished")}</button>}
          <button className="btn btn-sm btn-link p-0 ms-2 text-danger" aria-label={t("deleteReading")}
                  onClick={() => window.confirm(t("confirmDeleteReading")) && run(() => api.deleteReading(r.id))}>
            <i className="bi bi-trash" />
          </button>
        </span>
      </div>
      {r.sessions.length > 0 && (
        <table className="table table-sm data-table mt-2 mb-0">
          <thead><tr><th>{t("date")}</th><th className="text-end">{t("time")}</th><th className="text-end">{t("pages")}</th><th /></tr></thead>
          <tbody>
            {r.sessions.map(s => (
              <tr key={s.id}>
                <td>{formatDate(s.read_on, lang)}</td>
                <td className="text-end">{formatMinutes(s.minutes)}</td>
                <td className="text-end">{s.pages ?? "—"}</td>
                <td className="text-end">
                  <button className="btn btn-sm btn-link text-danger p-0" aria-label={t("delete")}
                          onClick={() => run(() => api.deleteSession(s.id))}><i className="bi bi-x-lg" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <>
      {book.session_count > 0 && (
        <p className="meta mb-3">
          {t("summary", { time: formatMinutes(book.minutes_read), n: book.session_count })} ·{" "}
          {book.pages ? t("ofPages", { read: book.pages_read, pages: book.pages }) : t("noPagesHint")}
        </p>
      )}

      <form onSubmit={addSession} noValidate className="inset-form mb-3">
        <div className="row g-2 align-items-start">
          <div className="col-6 col-md-4">
            <label className="form-label small fw-semibold" htmlFor="logDate">{t("date")}</label>
            <input type="date" id="logDate" className={`form-control${invalid("read_on")}`} max={isoDate()}
                   value={session.read_on} onChange={e => setSession(s => ({ ...s, read_on: e.target.value }))} />
            <div className="invalid-feedback">{errors.read_on}</div>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold" htmlFor="logMinutes">{t("minutes")}</label>
            <input type="number" id="logMinutes" min={1} max={LIMITS.MAX_MINUTES} className={`form-control${invalid("minutes")}`}
                   value={session.minutes} onChange={e => setSession(s => ({ ...s, minutes: e.target.value }))} />
            <div className="invalid-feedback">{errors.minutes}</div>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold" htmlFor="logPages">{t("pagesRead")}</label>
            <input type="number" id="logPages" min={0} max={LIMITS.MAX_SESSION_PAGES} placeholder={t("optional")}
                   className={`form-control${invalid("pages")}`}
                   value={session.pages} onChange={e => setSession(s => ({ ...s, pages: e.target.value }))} />
            <div className="invalid-feedback">{errors.pages}</div>
          </div>
          <div className="col-6 col-md-2 d-flex align-items-end form-button-offset">
            <button type="submit" className="btn btn-gold w-100">{t("add")}</button>
          </div>
          <div className="col-12 d-flex flex-wrap align-items-center gap-3">
            <div className="form-check mb-0">
              <input className="form-check-input" type="checkbox" id="logFinished" checked={session.finished}
                     onChange={e => setSession(s => ({ ...s, finished: e.target.checked }))} />
              <label className="form-check-label small" htmlFor="logFinished">{t("finishedCheck")}</label>
            </div>
            {session.finished && <Stars value={session.rating} label={t("rating")}
                                        onChange={v => setSession(s => ({ ...s, rating: v }))} />}
          </div>
        </div>
      </form>

      {!open && (
        <button className="btn btn-sm btn-outline-gold mb-3" onClick={() => run(() => api.startReading(book.id))}>
          <i className="bi bi-arrow-repeat me-1" />{readings.length ? t("readAgain") : t("startReading")}
        </button>
      )}
      {readings.length === 0 ? <p className="meta mb-0">{t("noSessions")}</p> : readings.map(readingBlock)}
    </>
  );
}
