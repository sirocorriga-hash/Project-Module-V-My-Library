import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { api } from "../api";
import { useApp } from "../context";
import { computeStats, hasFilters, NO_FILTERS, uniqueGenres, visibleBooks, type Filters } from "../lib/books";
import type { Book, BookFields, ImportResult } from "../types";
import Header from "../components/Header";
import Stats from "../components/Stats";
import Toolbar from "../components/Toolbar";
import BookCard from "../components/BookCard";
import BookModal from "../components/BookModal";
import BookDetailModal from "../components/BookDetailModal";
import LendModal from "../components/LendModal";
import ImportModal, { type PendingImport } from "../components/ImportModal";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";

export default function CataloguePage() {
  const { t, notify, pendingLog, clearPendingLog } = useApp();
  // The one source of truth for this page: the list returned by the server.
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [editing, setEditing] = useState<Partial<Book> | null>(null);   // {} = new book
  const [detail, setDetail] = useState<{ book: Book; minutes?: number } | null>(null);
  const [lending, setLending] = useState<Book | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      setBooks(await api.list());
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // The timer was stopped (here or from another page): open the log with the minutes filled in.
  useEffect(() => {
    if (!pendingLog || loading) return;
    const book = books.find(b => b.id === pendingLog.bookId);
    if (book) setDetail({ book, minutes: pendingLog.minutes });
    clearPendingLog();
  }, [pendingLog, loading, books, clearPendingLog]);

  // Derived data — recalculated, never stored.
  const genres = useMemo(() => uniqueGenres(books), [books]);
  const stats = useMemo(() => computeStats(books), [books]);
  const visible = useMemo(() => visibleBooks(books, filters), [books, filters]);

  const replaceBook = useCallback((saved: Book) => setBooks(list => list.map(b => (b.id === saved.id ? saved : b))), []);

  /* --- Book actions -------------------------------------------------- */

  async function saveBook(id: number | undefined, fields: BookFields) {
    const saved = id ? await api.update(id, fields) : await api.create(fields);
    if (id) replaceBook(saved); else setBooks(list => [...list, saved]);
    notify(t(id ? "updated" : "added", { title: saved.title }));
    setEditing(null);
  }

  async function act(action: () => Promise<void>) {
    try { await action(); } catch (e) { notify((e as Error).message); }
  }

  const actions = {
    onEdit: (b: Book) => setEditing(b),
    onDetails: (b: Book) => setDetail({ book: b }),
    onLend: (b: Book) => setLending(b),
    onReturn: (b: Book) => act(async () => {
      replaceBook(await api.giveBack(b.id));
      notify(t("backToast", { title: b.title }));
    }),
    onDelete: (b: Book) => window.confirm(t("confirmDelete", { title: b.title })) && act(async () => {
      await api.remove(b.id);
      setBooks(list => list.filter(x => x.id !== b.id));
      notify(t("removed", { title: b.title }));
    })
  };

  /* --- Export / import ----------------------------------------------- */

  function exportBooks() {
    if (!books.length) return notify(t("nothingToExport"));
    window.location.href = api.exportUrl;       // the server answers with Content-Disposition: attachment
    notify(t("exported", { n: books.length }));
  }

  const describe = ({ added, updated }: ImportResult) => {
    const parts = [added && t("importAdded", { n: added }), updated && t("importUpdated", { n: updated })].filter(Boolean);
    return parts.length ? t("importDone", { parts: parts.join(", ") }) : t("nothingChanged");
  };

  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";                         // re-selecting the same file must fire again
    if (!file) return;
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      return notify(t("invalidJson"));
    }
    act(async () => {
      if (!books.length) {                       // empty shelf: nothing to decide
        notify(describe(await api.importBooks(data, "replace")));
        return reload();
      }
      setPendingImport({ fileName: file.name, data, ...(await api.importBooks(data, "preview")) });
    });
  }

  function applyImport(mode: "add" | "update" | "replace") {
    if (mode === "replace" && !window.confirm(t("confirmReplace", { n: books.length }))) return;
    act(async () => {
      const result = await api.importBooks(pendingImport!.data, mode);
      setPendingImport(null);
      await reload();
      notify(describe(result));
    });
  }

  /* --- Render -------------------------------------------------------- */

  let content;
  if (loading) {
    content = <Loading />;
  } else if (loadError) {
    content = (
      <div className="empty-state">
        <i className="bi bi-exclamation-triangle display-6 d-block mb-2 icon-brass" />
        <p className="mb-3">{loadError}</p>
        <button className="btn btn-gold" onClick={() => { setLoading(true); reload(); }}>{t("tryAgain")}</button>
      </div>
    );
  } else {
    content = (
      <>
        {books.length > 0 && <p className="meta mb-3">{t("showing", { shown: visible.length, total: books.length })}</p>}
        <div className="row g-3">
          {visible.map(book => <BookCard key={book.id} book={book} {...actions} />)}
        </div>
        {visible.length === 0 && (
          <EmptyState filtered={hasFilters(filters)} onNew={() => setEditing({})}
                      onClear={() => setFilters(f => ({ ...NO_FILTERS, sortBy: f.sortBy }))} />
        )}
      </>
    );
  }

  const headerActions = (
    <>
      <button className="btn btn-outline-light btn-sm fw-semibold" onClick={() => fileInput.current?.click()}>
        <i className="bi bi-upload me-1" />{t("importJson")}
      </button>
      <button className="btn btn-outline-light btn-sm fw-semibold" onClick={exportBooks}>
        <i className="bi bi-download me-1" />{t("exportJson")}
      </button>
      <button className="btn btn-light fw-semibold" onClick={() => setEditing({})}>
        <i className="bi bi-plus-lg me-1" />{t("addBook")}
      </button>
    </>
  );

  return (
    <>
      <Header eyebrow={t("tagline")} title="My Library" actions={headerActions} />
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onFileChosen} />
      <main className="container pb-5 flex-grow-1">
        <Stats stats={stats} />
        <Toolbar filters={filters} genres={genres} onChange={patch => setFilters(f => ({ ...f, ...patch }))} />
        {content}
      </main>

      <BookModal book={editing} genres={genres} onSave={saveBook} onClose={() => setEditing(null)} />
      <BookDetailModal book={detail?.book ?? null} initialMinutes={detail?.minutes} onBookChange={replaceBook}
                       onClose={() => setDetail(null)} />
      <LendModal book={lending} onClose={() => setLending(null)}
                 onLent={saved => { replaceBook(saved); setLending(null); notify(t("lentToast", { title: saved.title })); }} />
      <ImportModal pending={pendingImport} onApply={applyImport} onClose={() => setPendingImport(null)} />
    </>
  );
}
