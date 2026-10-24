import { useCallback, useEffect, useState } from "react";
import { Modal, Tab, Tabs } from "react-bootstrap";
import { api, ApiError } from "../api";
import { useApp } from "../context";
import { formatMinutes } from "../lib/format";
import type { Book, BookHistory } from "../types";
import Loading from "./Loading";
import LoansTab from "./book-detail/LoansTab";
import NotesTab from "./book-detail/NotesTab";
import ReadingTab from "./book-detail/ReadingTab";

type TabKey = "reading" | "notes" | "loans";

interface Props {
  book: Book | null;
  initialMinutes?: number | null;     // from the timer
  onBookChange: (b: Book) => void;
  onClose: () => void;
}

/** Readings with their sessions, notes and loan history of one book. */
export default function BookDetailModal({ book, initialMinutes, onBookChange, onClose }: Props) {
  const { t, notify } = useApp();
  const [tab, setTab] = useState<TabKey>("reading");
  const [history, setHistory] = useState<BookHistory | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const bookId = book?.id;

  // A new book was opened: start from a clean window (the tabs remount, so their forms reset too).
  useEffect(() => {
    if (!bookId) return;
    setHistory(null);
    setTab("reading");
    setErrors({});
    if (initialMinutes) notify(t("timerReady", { time: formatMinutes(initialMinutes) }));
    api.history(bookId).then(setHistory).catch(e => notify(e.message));
  }, [bookId]);   // only when another book is opened, not on every parent render

  /** Run a change, then reload the history (and the card behind the window). */
  const run = useCallback(async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (err) {
      const fields = (err as ApiError).fields;
      setErrors(fields ?? {});
      if (!fields) notify((err as Error).message);
      return false;
    }
    setErrors({});
    try {
      const fresh = await api.history(bookId!);
      setHistory(fresh);
      onBookChange(fresh.book);
    } catch (err) {
      notify((err as Error).message);
    }
    return true;
  }, [bookId, notify, onBookChange]);

  return (
    <Modal show={Boolean(book)} onHide={onClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h5" className="display-face text-truncate">{book?.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!history ? <Loading className="py-4" /> : (
          <Tabs activeKey={tab} onSelect={k => setTab(k as TabKey)} className="mb-3" mountOnEnter>
            <Tab eventKey="reading" title={t("tabReading")}>
              <ReadingTab book={history.book} readings={history.readings} initialMinutes={initialMinutes}
                          run={run} errors={errors} />
            </Tab>
            <Tab eventKey="notes" title={`${t("tabNotes")} (${history.notes.length})`}>
              <NotesTab bookId={history.book.id} notes={history.notes} run={run} errors={errors} />
            </Tab>
            <Tab eventKey="loans" title={t("tabLoans")}>
              <LoansTab loans={history.loans} />
            </Tab>
          </Tabs>
        )}
      </Modal.Body>
    </Modal>
  );
}
