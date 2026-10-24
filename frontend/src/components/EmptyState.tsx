import { useApp } from "../context";

export default function EmptyState({ filtered, onNew, onClear }: { filtered: boolean; onNew: () => void; onClear: () => void }) {
  const { t } = useApp();
  return (
    <div className="empty-state">
      <i className="bi bi-book display-6 d-block mb-2 icon-brass" />
      <p className="mb-3">{filtered ? t("noMatch") : t("emptyShelf")}</p>
      {filtered
        ? <button className="btn btn-outline-gold" onClick={onClear}><i className="bi bi-x-lg me-1" />{t("clearFilters")}</button>
        : <button className="btn btn-gold" onClick={onNew}><i className="bi bi-plus-lg me-1" />{t("addFirst")}</button>}
    </div>
  );
}
