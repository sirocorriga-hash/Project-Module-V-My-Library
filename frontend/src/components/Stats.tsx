import { useApp } from "../context";
import type { computeStats } from "../lib/books";

export default function Stats({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const { t } = useApp();
  const tiles = [
    [stats.books, t("statBooks"), null],
    [stats.onLoan, t("statOnLoan"), stats.overdue ? t("overdueLoans", { n: stats.overdue }) : null],
    [stats.read, t("statRead"), null],
    [stats.wishlist, t("statWishlist"), null]
  ] as const;
  return (
    <div className="row g-3 mb-4">
      {tiles.map(([value, label, note]) => (
        <div className="col-6 col-lg-3" key={label}>
          <div className="stat h-100">
            <div className="number">{value}</div>
            <div className="label">{label}</div>
            {note && <div className="stat-note text-danger-emphasis">{note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
