import { useState, type FormEvent } from "react";
import { api } from "../../api";
import { useApp } from "../../context";
import { formatDate } from "../../lib/format";
import { LIMITS } from "../../lib/limits";
import type { Note } from "../../types";
import { invalidClass, type TabProps } from "./shared";

const blankNote = () => ({ body: "", is_quote: false, page: "" });

interface Props extends TabProps {
  bookId: number;
  notes: Note[];
}

/** Personal notes and quotes on the book. */
export default function NotesTab({ bookId, notes, run, errors }: Props) {
  const { t, lang } = useApp();
  const [note, setNote] = useState(blankNote);
  const invalid = (field: string) => invalidClass(errors, field);

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api.addNote(bookId, note))) setNote(blankNote());
  }

  return (
    <>
      <form onSubmit={addNote} noValidate className="inset-form mb-3">
        <textarea className={`form-control mb-2${invalid("body")}`} rows={3} placeholder={t("notePlaceholder")}
                  aria-label={t("tabNotes")} value={note.body} onChange={e => setNote(n => ({ ...n, body: e.target.value }))} />
        <div className="invalid-feedback mb-2">{errors.body}</div>
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="form-check mb-0">
            <input className="form-check-input" type="checkbox" id="noteQuote" checked={note.is_quote}
                   onChange={e => setNote(n => ({ ...n, is_quote: e.target.checked }))} />
            <label className="form-check-label small" htmlFor="noteQuote">{t("isQuote")}</label>
          </div>
          <input type="number" min={1} max={LIMITS.MAX_PAGES} className={`form-control form-control-sm page-input${invalid("page")}`}
                 placeholder={t("page")} aria-label={t("page")}
                 value={note.page} onChange={e => setNote(n => ({ ...n, page: e.target.value }))} />
          <button type="submit" className="btn btn-sm btn-gold ms-auto">{t("addNote")}</button>
        </div>
      </form>
      {notes.length === 0 ? <p className="meta mb-0">{t("noNotes")}</p> : notes.map(n => (
        <div key={n.id} className={`note${n.is_quote ? " note-quote" : ""}`}>
          {n.is_quote ? <blockquote className="mb-1">{n.body}</blockquote> : <p className="mb-1">{n.body}</p>}
          <div className="meta d-flex gap-2">
            {n.is_quote && <span>{t("quote")}</span>}
            {n.page && <span>p. {n.page}</span>}
            <span>{formatDate(n.created_at.slice(0, 10), lang)}</span>
            <button className="btn btn-sm btn-link text-danger p-0 ms-auto" aria-label={t("delete")}
                    onClick={() => run(() => api.deleteNote(n.id))}><i className="bi bi-trash" /></button>
          </div>
        </div>
      ))}
    </>
  );
}
