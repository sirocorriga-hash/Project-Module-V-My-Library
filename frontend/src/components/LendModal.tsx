import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "react-bootstrap";
import { api, ApiError } from "../api";
import { useApp } from "../context";
import { addDays, isoDate } from "../lib/format";
import type { Book } from "../types";
import Field from "./Field";

const DEFAULT_LOAN_DAYS = 30;

export default function LendModal({ book, onLent, onClose }:
  { book: Book | null; onLent: (b: Book) => void; onClose: () => void }) {
  const { t } = useApp();
  const [borrower, setBorrower] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!book) return;
    setBorrower("");
    setDueOn(addDays(DEFAULT_LOAN_DAYS));
    setErrors({});
    api.borrowers().then(setNames).catch(() => setNames([]));   // suggestions only: failure is harmless
  }, [book]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      onLent(await api.lend(book!.id, borrower.trim(), dueOn || null));
    } catch (err) {
      setErrors((err as ApiError).fields ?? { _form: (err as Error).message });
    }
  }

  return (
    <Modal show={Boolean(book)} onHide={onClose} centered>
      <form onSubmit={submit} noValidate>
        <Modal.Header closeButton>
          <Modal.Title as="h5" className="display-face">{book && t("lendTitle", { title: book.title })}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errors._form && <div className="alert alert-danger py-2">{errors._form}</div>}
          <div className="mb-3">
            <Field id="lendBorrower" label={t("lentTo")} placeholder={t("borrowerPlaceholder")} list="borrowerNames"
                   value={borrower} onChange={e => setBorrower(e.target.value)} autoFocus autoComplete="off" />
            <datalist id="borrowerNames">{names.map(n => <option key={n} value={n} />)}</datalist>
          </div>
          <Field id="lendDue" type="date" label={t("dueDate")} min={isoDate()} value={dueOn}
                 onChange={e => setDueOn(e.target.value)} error={errors.due_on} hint={t("dueHint")} />
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn btn-link text-body-secondary text-decoration-none" onClick={onClose}>{t("cancel")}</button>
          <button type="submit" className="btn btn-gold"><i className="bi bi-box-arrow-right me-1" />{t("lend")}</button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
