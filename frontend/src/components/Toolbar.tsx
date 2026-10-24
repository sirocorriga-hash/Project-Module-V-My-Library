import { useApp } from "../context";
import type { Filters } from "../lib/books";

interface Props { filters: Filters; genres: string[]; onChange: (patch: Partial<Filters>) => void }

export default function Toolbar({ filters, genres, onChange }: Props) {
  const { t } = useApp();
  const select = (id: keyof Filters, label: string, options: [string, string][], col = "col-6 col-lg-2") => (
    <div className={col}>
      <label className="form-label small fw-semibold" htmlFor={`filter-${id}`}>{label}</label>
      <select className="form-select" id={`filter-${id}`} value={filters[id]}
              onChange={e => onChange({ [id]: e.target.value } as Partial<Filters>)}>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </div>
  );

  return (
    <div className="toolbar mb-4">
      <div className="row g-2 align-items-end">
        <div className="col-12 col-lg-4">
          <label className="form-label small fw-semibold" htmlFor="filter-search">{t("search")}</label>
          <input type="search" className="form-control" id="filter-search" placeholder={t("searchPlaceholder")}
                 value={filters.search} onChange={e => onChange({ search: e.target.value })} />
        </div>
        {select("genre", t("genre"), [["", t("all")], ...genres.map(g => [g, g] as [string, string])])}
        {select("loan", t("loan"), [["", t("all")], ["available", t("onShelf")], ["loaned", t("onLoan")], ["overdue", t("overdue")]])}
        {select("readStatus", t("reading"), [["", t("all")], ["to_read", t("toRead")], ["reading", t("readingNow")],
          ["read", t("read")], ["wishlist", t("wishlist")]])}
        {select("sortBy", t("sortBy"), [["title", t("sortTitle")], ["author", t("sortAuthor")], ["year", t("sortYear")],
          ["rating", t("sortRating")], ["recent", t("sortRecent")]])}
      </div>
    </div>
  );
}
