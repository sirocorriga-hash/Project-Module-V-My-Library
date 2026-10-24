import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Modal } from "react-bootstrap";
import { api, ApiError } from "../api";
import { useApp } from "../context";
import type { Book, BookFields } from "../types";
import BarcodeScanner, { canScan } from "./BarcodeScanner";
import Field from "./Field";
import { LIMITS } from "../lib/limits";

type Form = Record<Exclude<keyof BookFields, "wishlist">, string> & { wishlist: boolean };

const toForm = (b: Partial<BookFields>): Form => ({
  title: b.title ?? "", author: b.author ?? "", genre: b.genre ?? "", isbn: b.isbn ?? "",
  shelfmark: b.shelfmark ?? "", cover_url: b.cover_url ?? "", wishlist: b.wishlist ?? false,
  year: b.year?.toString() ?? "", pages: b.pages?.toString() ?? ""
});

const toFields = (f: Form): BookFields => ({
  ...f, year: f.year ? Number(f.year) : null, pages: f.pages ? Number(f.pages) : null
});

/* `book`: null = closed, {} = new book, a book = edit it. */
export default function BookModal({ book, genres, onSave, onClose }:
  { book: Partial<Book> | null; genres: string[]; onSave: (id: number | undefined, fields: BookFields) => Promise<void>; onClose: () => void }) {
  const { t, notify } = useApp();
  const [form, setForm] = useState<Form>(() => toForm({}));
  const [validated, setValidated] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"" | "save" | "lookup">("");
  const [scanning, setScanning] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!book) return;
    setForm(toForm(book));
    setValidated(false);
    setErrors({});
  }, [book]);

  const set = (key: keyof Form) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [key]: value }));
    setErrors(errs => ({ ...errs, [key]: "" }));
  };

  /** Fill the form from Open Library. The shelfmark is ours and is kept. */
  const lookup = useCallback(async (isbn: string) => {
    setBusy("lookup");
    try {
      const found = await api.lookupIsbn(isbn);
      setForm(f => ({ ...toForm(found), shelfmark: f.shelfmark, wishlist: f.wishlist }));
      notify(t("found"));
    } catch (err) {
      setErrors(e => ({ ...e, isbn: (err as ApiError).fields?.isbn ?? (err as Error).message }));
    } finally {
      setBusy("");
    }
  }, [notify, t]);

  const onScanned = useCallback((code: string) => {
    setScanning(false);
    setForm(f => ({ ...f, isbn: code }));
    lookup(code);
  }, [lookup]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!e.currentTarget.checkValidity()) return setValidated(true);
    setBusy("save");
    try {
      await onSave(book?.id, toFields(form));
    } catch (err) {
      setErrors((err as ApiError).fields ?? { _form: (err as Error).message });
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <Modal show={Boolean(book) && !scanning} onHide={onClose} size="lg" centered onEntered={() => titleRef.current?.focus()}>
        <form noValidate onSubmit={submit} className={validated ? "was-validated" : ""}>
          <Modal.Header closeButton>
            <Modal.Title as="h5" className="display-face">{book?.id ? t("editBook") : t("newBook")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errors._form && <div className="alert alert-danger py-2">{errors._form}</div>}
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="fieldIsbn">{t("isbn")}</label>
                <div className="input-group has-validation">
                  <input className={`form-control mono${errors.isbn ? " is-invalid" : ""}`} id="fieldIsbn" inputMode="numeric"
                         value={form.isbn} onChange={set("isbn")} placeholder="978…" />
                  <button type="button" className="btn btn-outline-gold" disabled={!form.isbn || busy === "lookup"}
                          onClick={() => lookup(form.isbn)}>
                    <i className="bi bi-search me-1" />{t("find")}
                  </button>
                  {canScan() && (
                    <button type="button" className="btn btn-outline-gold" onClick={() => setScanning(true)}>
                      <i className="bi bi-upc-scan me-1" />{t("scan")}
                    </button>
                  )}
                  {errors.isbn && <div className="invalid-feedback">{errors.isbn}</div>}
                </div>
              </div>
              <div className="col-12 d-flex gap-3">
                {form.cover_url && (
                  <div className="text-center">
                    <img className="cover cover-lg" src={form.cover_url} alt="" />
                    <button type="button" className="btn btn-link btn-sm p-0 d-block mx-auto"
                            onClick={() => setForm(f => ({ ...f, cover_url: "" }))}>{t("removeCover")}</button>
                  </div>
                )}
                <div className="flex-grow-1">
                  <Field ref={titleRef} id="fieldTitle" label={t("title")} value={form.title} onChange={set("title")}
                         required error={errors.title} fallbackError={t("titleRequired")} />
                </div>
              </div>
              <div className="col-md-6">
                <Field id="fieldAuthor" label={t("author")} value={form.author} onChange={set("author")}
                       required error={errors.author} fallbackError={t("authorRequired")} />
              </div>
              <div className="col-md-6">
                <Field id="fieldGenre" label={t("genre")} list="genreOptions" value={form.genre} onChange={set("genre")}
                       required error={errors.genre} fallbackError={t("genreRequired")} />
                <datalist id="genreOptions">{genres.map(g => <option key={g} value={g} />)}</datalist>
              </div>
              <div className="col-6 col-md-4">
                <Field id="fieldYear" type="number" label={t("year")} min={0} max={LIMITS.MAX_YEAR} value={form.year}
                       onChange={set("year")} error={errors.year} fallbackError={t("yearRange")} />
              </div>
              <div className="col-6 col-md-4">
                <Field id="fieldPages" type="number" label={t("pages")} min={1} max={LIMITS.MAX_PAGES} value={form.pages}
                       onChange={set("pages")} error={errors.pages} fallbackError={t("pagesRange")} hint={t("pagesHint")} />
              </div>
              <div className="col-md-4">
                <Field id="fieldShelfmark" className="mono" label={t("shelfmark")} placeholder={t("shelfmarkPlaceholder")}
                       value={form.shelfmark} onChange={set("shelfmark")} />
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="fieldWishlist" checked={form.wishlist}
                         onChange={set("wishlist")} disabled={book?.status === "loaned"} />
                  <label className="form-check-label" htmlFor="fieldWishlist">{t("wishlistLabel")}</label>
                </div>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="btn btn-link text-body-secondary text-decoration-none" onClick={onClose}>{t("cancel")}</button>
            <button type="submit" className="btn btn-gold" disabled={busy === "save"}>{busy === "save" ? t("saving") : t("saveBook")}</button>
          </Modal.Footer>
        </form>
      </Modal>
      <BarcodeScanner show={scanning} onDetected={onScanned} onClose={() => setScanning(false)} />
    </>
  );
}
