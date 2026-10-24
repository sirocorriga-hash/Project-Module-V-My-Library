import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api";
import { useApp } from "../context";
import { cssVar } from "../hooks";
import { formatDate, formatHours, formatMinutes, formatMonth } from "../lib/format";
import { locale } from "../i18n";
import type { Report } from "../types";
import Header from "../components/Header";
import Stars from "../components/Stars";
import Loading from "../components/Loading";
import { LIMITS } from "../lib/limits";

function Tile({ value, label, note }: { value: ReactNode; label: string; note?: ReactNode }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="stat h-100">
        <div className="number">{value}</div>
        <div className="label">{label}</div>
        {note && <div className="stat-note">{note}</div>}
      </div>
    </div>
  );
}

interface TipProps<T> { active?: boolean; payload?: { payload: T }[]; label?: string; format: (row: T) => string }
function ChartTooltip<T>({ active, payload, label, format }: TipProps<T>) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><div className="fw-semibold">{label}</div><div>{format(payload[0].payload)}</div></div>;
}

export default function ReportsPage() {
  const { user, setUser, notify, t, lang, effectiveTheme } = useApp();
  const [daily, setDaily] = useState(user.daily_minutes);
  const [pace, setPace] = useState(user.pages_per_hour?.toString() ?? "");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  // Chart colours come from the theme's CSS variables (single series: one hue).
  const colors = useMemo(() => ({ mark: cssVar("--chart-mark"), grid: cssVar("--chart-grid"), axis: cssVar("--grey") }),
    [effectiveTheme]);   // re-read when the theme changes

  // Recompute on every what-if change (debounced). Values equal to the saved ones are not sent,
  // so the page labels them "your setting" rather than "what-if".
  useEffect(() => {
    const savedPace = user.pages_per_hour?.toString() ?? "";
    const pagesPerHour = pace === savedPace ? undefined : pace === "" ? "auto" as const : Number(pace);
    const dailyMinutes = daily === user.daily_minutes ? undefined : daily;
    const timer = setTimeout(() => {
      api.report({ dailyMinutes, pagesPerHour }).then(r => { setReport(r); setError(""); }).catch(e => setError(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [daily, pace, user]);

  const dirty = daily !== user.daily_minutes || (pace === "" ? null : Number(pace)) !== user.pages_per_hour;

  async function saveDefaults() {
    try {
      setUser(await api.updateMe({ daily_minutes: daily, pages_per_hour: pace === "" ? null : pace }));
      notify(t("paceSaved"));
    } catch (e) {
      notify((e as Error).message);
    }
  }

  const header = <Header eyebrow={t("reportsEyebrow")} title={t("reports")} />;
  if (!report) {
    return (
      <>
        {header}
        <main className="container pb-5 flex-grow-1">
          {error ? <div className="empty-state"><p className="mb-0">{error}</p></div>
            : <Loading />}
        </main>
      </>
    );
  }

  const { estimate: est, reading, lending } = report;
  const { goal, streak } = reading;
  const months = reading.months.map(m => ({ ...m, label: formatMonth(m.month, lang), hours: +(m.minutes / 60).toFixed(1) }));
  const paceSource = { manual: t("paceManual"), measured: t("paceMeasured"), default: t("paceDefault"), "what-if": t("paceWhatIf") }[est.pace_source];
  const axisTick = { fill: colors.axis, fontSize: 12 };

  return (
    <>
      {header}
      <main className="container pb-5 flex-grow-1">

        {/* 1. Time still to read ------------------------------------------------ */}
        <section className="panel mb-4">
          <div className="row g-4 align-items-center">
            <div className="col-lg-7">
              <div className="section-label">{t("timeLeft")}</div>
              <div className="hero-number">{formatHours(est.hours, lang)}</div>
              {est.books ? (
                <p className="mb-1">
                  {t("booksPagesLeft", { books: est.books, pages: est.pages_remaining.toLocaleString(locale(lang)) })}{" "}
                  {t("atMinutes", { minutes: est.daily_minutes, days: est.days })}
                  {est.finish_date && <> — <strong>{t("doneBy", { date: formatDate(est.finish_date, lang) })}</strong></>}.
                </p>
              ) : <p className="mb-1">{t("nothingLeft")}</p>}
              <p className="meta mb-0">
                {t("pace", { pace: est.pace_pages_per_hour, source: paceSource })}
                {est.measured_pages_per_hour && est.pace_source !== "measured" && ` · ${t("measured", { n: est.measured_pages_per_hour })}`}
              </p>
              {est.without_pages.length > 0 && (
                <p className="meta mt-1 mb-0"><i className="bi bi-info-circle me-1" />
                  {t("notCounted", { list: est.without_pages.map(b => b.title).join(", ") })}</p>
              )}
            </div>
            <div className="col-lg-5">
              <div className="inset-form">
                <label className="form-label small fw-semibold" htmlFor="dailyMinutes">
                  {t("perDay")}: <span className="mono">{daily} min</span>
                </label>
                <input type="range" className="form-range" id="dailyMinutes" min={5} max={240} step={5}
                       value={daily} onChange={e => setDaily(Number(e.target.value))} />
                <label className="form-label small fw-semibold mt-2" htmlFor="pace">{t("pagesPerHour")}</label>
                <input type="number" className="form-control" id="pace" min={1} max={LIMITS.MAX_PACE} value={pace}
                       placeholder={est.measured_pages_per_hour ? `${t("auto")} (${est.measured_pages_per_hour})` : t("auto")}
                       onChange={e => setPace(e.target.value)} />
                <div className="form-text">{t("paceHint")}</div>
                <button className="btn btn-sm btn-outline-gold mt-2" disabled={!dirty} onClick={saveDefaults}>{t("saveDefault")}</button>
              </div>
            </div>
          </div>
          {est.queue.length > 0 && (
            <details className="mt-3">
              <summary className="small fw-semibold">{t("bookByBook")}</summary>
              <table className="table table-sm data-table mt-2 mb-0">
                <thead><tr><th>{t("title")}</th><th>{t("status")}</th><th className="text-end">{t("pagesLeft")}</th><th className="text-end">{t("time")}</th></tr></thead>
                <tbody>
                  {est.queue.map(b => (
                    <tr key={b.id}>
                      <td>{b.title}<span className="meta d-block">{b.author}</span></td>
                      <td>{b.read_status === "reading" ? t("readingNow") : t("toRead")}</td>
                      <td className="text-end">{b.pages_remaining}</td>
                      <td className="text-end">{formatHours(b.hours, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </section>

        {/* 2. Goal and streak ------------------------------------------------------ */}
        <div className="row g-3 mb-4">
          <div className="col-lg-8">
            <div className="panel h-100">
              <div className="section-label">{t("goalTitle", { year: goal.year })}</div>
              {goal.goal ? (
                <>
                  <p className="fs-5 fw-semibold mb-2">{t("goalProgress", { done: goal.finished, goal: goal.goal })}</p>
                  <div className="progress-goal" role="progressbar" aria-valuenow={goal.finished} aria-valuemin={0} aria-valuemax={goal.goal}>
                    <div style={{ width: `${Math.min(100, (goal.finished / goal.goal) * 100)}%` }} />
                    {goal.expected_by_now !== null && <span className="expected" style={{ left: `${Math.min(100, (goal.expected_by_now / goal.goal) * 100)}%` }} />}
                  </div>
                  <p className="meta mt-2 mb-0">
                    {goal.on_track ? t("goalOnTrack") : t("goalBehind", { n: Math.ceil((goal.expected_by_now ?? 0) - goal.finished) })}
                  </p>
                </>
              ) : <p className="meta mb-0">{t("goalNone")}</p>}
            </div>
          </div>
          <div className="col-lg-4">
            <div className="panel h-100">
              <div className="section-label">{t("streak")}</div>
              <div className="hero-number hero-sm">{t("streakDays", { n: streak.current })}</div>
              <p className="meta mb-0">{streak.read_today ? t("readToday") : t("notToday")} · {t("streakLongest", { n: streak.longest })}</p>
            </div>
          </div>
        </div>

        {/* 3. Time spent reading ------------------------------------------------ */}
        <h2 className="report-heading">{t("timeSpent")}</h2>
        <div className="row g-3 mb-3">
          <Tile value={formatHours(reading.total_hours, lang)} label={t("totalTime")} note={t("nSessions", { n: reading.sessions })} />
          <Tile value={reading.books_finished} label={t("booksFinished")} />
          <Tile value={formatHours(reading.avg_hours_per_book, lang)} label={t("avgPerBook")} />
          <Tile value={reading.avg_minutes_per_session ? formatMinutes(Math.round(reading.avg_minutes_per_session)) : "—"} label={t("avgSession")} />
        </div>

        <div className="row g-3 mb-4">
          <div className="col-lg-6">
            <div className="panel h-100">
              <div className="section-label">{t("hoursPerMonth")}</div>
              {months.some(m => m.minutes > 0) ? (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer>
                    <BarChart data={months} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={colors.grid} />
                      <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: colors.grid }} tick={axisTick} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
                      <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }}
                               content={<ChartTooltip<typeof months[number]> format={m => `${formatMinutes(m.minutes)}${m.pages ? ` · ${m.pages} pp.` : ""}`} />} />
                      <Bar dataKey="hours" fill={colors.mark} maxBarSize={24} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="meta mb-0">{t("noMonthly")}</p>}
            </div>
          </div>
          <div className="col-lg-6">
            <div className="panel h-100">
              <div className="section-label">{t("finishedBooks")}</div>
              {reading.finished.length ? (
                <div className="table-responsive">
                  <table className="table table-sm data-table mb-0">
                    <thead><tr><th>{t("title")}</th><th className="text-end">{t("time")}</th><th className="text-end">{t("calendarDays")}</th><th className="text-end">{t("pph")}</th></tr></thead>
                    <tbody>
                      {reading.finished.map(b => (
                        <tr key={`${b.book_id}-${b.reading_number}`}>
                          <td>
                            {b.title} <Stars value={b.rating} />
                            <span className="meta d-block">
                              {t("nSessions", { n: b.sessions })} · {t("finishedOn", { date: formatDate(b.finished_on, lang) })}
                              {b.reading_number > 1 && ` · ${t("rereadN", { n: b.reading_number })}`}
                            </span>
                          </td>
                          <td className="text-end">{b.minutes ? formatMinutes(b.minutes) : "—"}</td>
                          <td className="text-end">{b.calendar_days}</td>
                          <td className="text-end">{b.pages_per_hour ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="meta mb-0">{t("noFinished")}</p>}
            </div>
          </div>
        </div>

        {/* 4. Lending ------------------------------------------------------------- */}
        <h2 className="report-heading">{t("lending")}</h2>
        <div className="row g-3 mb-3">
          <Tile value={lending.total_loans} label={t("loansRecorded")} note={t("totalDays", { n: lending.total_days })} />
          <Tile value={lending.active_loans} label={t("outNow")}
                note={lending.overdue_loans ? <span className="text-danger-emphasis">{t("overdueLoans", { n: lending.overdue_loans })}</span> : undefined} />
          <Tile value={lending.avg_days_closed ?? "—"} label={t("avgDays")} note={t("returnedOnly")} />
          <Tile value={lending.longest_days ?? "—"} label={t("longest")} />
        </div>

        <div className="row g-3">
          <div className="col-lg-6">
            <div className="panel h-100">
              <div className="section-label">{t("outRightNow")}</div>
              {lending.active.length ? (
                <div className="table-responsive">
                  <table className="table table-sm data-table mb-0">
                    <thead><tr><th>{t("title")}</th><th>{t("with")}</th><th>{t("dueCol")}</th><th className="text-end">{t("days")}</th></tr></thead>
                    <tbody>
                      {lending.active.map(l => (
                        <tr key={l.book_id} className={l.overdue ? "row-overdue" : ""}>
                          <td>{l.title}</td><td>{l.borrower}</td>
                          <td>{l.overdue && <i className="bi bi-exclamation-triangle-fill me-1" aria-label={t("overdue")} />}{formatDate(l.due_on, lang)}</td>
                          <td className="text-end fw-semibold">{l.days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="meta mb-0">{t("allHome")}</p>}
            </div>
          </div>
          <div className="col-lg-6">
            <div className="panel h-100">
              <div className="section-label">{t("daysByBorrower")}</div>
              {lending.by_borrower.length ? (
                <>
                  <div style={{ height: Math.max(80, lending.by_borrower.length * 40) }}>
                    <ResponsiveContainer>
                      <BarChart data={lending.by_borrower} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid horizontal={false} stroke={colors.grid} />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} />
                        <YAxis type="category" dataKey="borrower" width={90} tickLine={false} axisLine={false} tick={axisTick} />
                        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }}
                                 content={<ChartTooltip<typeof lending.by_borrower[number]> format={r => `${r.days} ${t("days").toLowerCase()} · ${r.loans} ${t("loans").toLowerCase()}`} />} />
                        <Bar dataKey="days" fill={colors.mark} maxBarSize={24} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <details className="mt-2">
                    <summary className="small fw-semibold">{t("asTable")}</summary>
                    <table className="table table-sm data-table mt-2 mb-0">
                      <thead><tr><th>{t("borrower")}</th><th className="text-end">{t("loans")}</th><th className="text-end">{t("days")}</th></tr></thead>
                      <tbody>{lending.by_borrower.map(r => (
                        <tr key={r.borrower}><td>{r.borrower}</td><td className="text-end">{r.loans}</td><td className="text-end">{r.days}</td></tr>
                      ))}</tbody>
                    </table>
                  </details>
                </>
              ) : <p className="meta mb-0">{t("noLoans")}</p>}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
