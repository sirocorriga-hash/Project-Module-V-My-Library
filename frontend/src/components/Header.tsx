import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Dropdown } from "react-bootstrap";
import { useApp } from "../context";
import { useNow } from "../hooks";
import { formatElapsed } from "../lib/format";

/** Page header: navigation, running timer, user menu, then the page title and its actions. */
export default function Header({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: ReactNode }) {
  const { user, signOut, t, timer, stopTimer } = useApp();
  const now = useNow(Boolean(timer));
  const navigate = useNavigate();

  const stop = () => {
    navigate("/");          // the catalogue opens the reading log with the minutes filled in
    stopTimer();
  };

  return (
    <header className="header-bg pt-3 pb-4 mb-4">
      <div className="container">
        <nav className="app-nav d-flex align-items-center justify-content-between gap-2 mb-3">
          <div className="d-flex gap-1">
            <NavLink to="/" end className="nav-tab" aria-label={t("catalogue")}><i className="bi bi-book" /><span>{t("catalogue")}</span></NavLink>
            <NavLink to="/reports" className="nav-tab" aria-label={t("reports")}><i className="bi bi-bar-chart" /><span>{t("reports")}</span></NavLink>
            <NavLink to="/settings" className="nav-tab" aria-label={t("settings")}><i className="bi bi-gear" /><span>{t("settings")}</span></NavLink>
          </div>
          <div className="d-flex align-items-center gap-2">
            {timer && (
              <button type="button" className="timer-pill" onClick={stop} title={t("timerRunning", { title: timer.title })}>
                <i className="bi bi-stopwatch" /> <span className="mono">{formatElapsed(now - timer.startedAt)}</span>
                <span className="timer-stop"><i className="bi bi-stop-fill" />{t("stop")}</span>
              </button>
            )}
            <Dropdown align="end">
              <Dropdown.Toggle variant="link" className="user-toggle text-decoration-none" aria-label={user.name}>
                <i className="bi bi-person-circle me-1" /><span className="user-name">{user.name}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.ItemText className="small text-body-secondary">{user.email}</Dropdown.ItemText>
                <Dropdown.Divider />
                <Dropdown.Item onClick={signOut}><i className="bi bi-box-arrow-right me-2" />{t("signOut")}</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </nav>
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div>
            <div className="eyebrow mb-1">{eyebrow}</div>
            <h1>{title}</h1>
          </div>
          {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
