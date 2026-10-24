import { useApp } from "../../context";
import { formatDate } from "../../lib/format";
import type { Loan } from "../../types";

/** Every loan of this copy, most recent first. Read-only: lending happens from the card. */
export default function LoansTab({ loans }: { loans: Loan[] }) {
  const { t, lang } = useApp();
  if (loans.length === 0) return <p className="meta mb-0">{t("neverLent")}</p>;
  return (
    <table className="table table-sm data-table mb-0">
      <thead><tr><th>{t("borrower")}</th><th>{t("from")}</th><th>{t("dueCol")}</th><th>{t("returned")}</th><th className="text-end">{t("days")}</th></tr></thead>
      <tbody>
        {loans.map(l => (
          <tr key={l.id}>
            <td>{l.borrower || "—"}</td>
            <td>{formatDate(l.lent_on, lang)}</td>
            <td className={l.overdue ? "text-danger-emphasis fw-semibold" : ""}>{formatDate(l.due_on, lang)}</td>
            <td>{l.active ? <span className="read-chip read-reading">{t("stillOut")}</span> : formatDate(l.returned_on, lang)}</td>
            <td className="text-end">{l.days}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
