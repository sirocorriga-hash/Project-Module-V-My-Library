import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toast, ToastContainer } from "react-bootstrap";
import { api, setApiLanguage, setUnauthorizedHandler } from "./api";
import { AppContext, type AppState, type PendingLog, type Timer } from "./context";
import { useAppliedTheme } from "./hooks";
import { initialLanguage, translator } from "./i18n";
import { load, store } from "./lib/storage";
import type { Language, ThemeChoice, User } from "./types";
import AuthPage from "./pages/AuthPage";
import ResetPage from "./pages/ResetPage";
import CataloguePage from "./pages/CataloguePage";
import SettingsPage from "./pages/SettingsPage";
import Footer from "./components/Footer";
import Loading from "./components/Loading";
import { LIMITS } from "./lib/limits";

// The reports page carries the charting library: load it only when opened.
const ReportsPage = lazy(() => import("./pages/ReportsPage"));

const spinner = <Loading className="py-5 flex-grow-1" />;

export default function App() {
  const [user, setUserState] = useState<User | null | undefined>(undefined);  // undefined = still checking
  const [lang, setLangState] = useState<Language>(initialLanguage);
  const [theme, setThemeState] = useState<ThemeChoice>(() => load("theme", "auto"));
  const [timer, setTimer] = useState<Timer | null>(() => load("timer", null));
  const [pendingLog, setPendingLog] = useState<PendingLog | null>(null);
  const [toast, setToast] = useState({ show: false, message: "" });

  const effectiveTheme = useAppliedTheme(theme);
  const t = useMemo(() => translator(lang), [lang]);

  // The interface follows the language saved on the account.
  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) setLangState(u.language);
  }, []);

  useEffect(() => {
    setApiLanguage(lang);
    store("language", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => store("timer", timer), [timer]);

  useEffect(() => {
    setUnauthorizedHandler(() => setUserState(null));   // session expired mid-use: back to sign in
    api.me().then(setUser).catch(() => setUserState(null));
  }, [setUser]);

  const notify = useCallback((message: string) => setToast({ show: true, message }), []);

  const state: AppState | null = user ? {
    user, setUser, notify, t, lang, theme, effectiveTheme, timer, pendingLog,
    signOut: async () => {
      await api.logout().catch(() => {});
      setTimer(null);
      setUserState(null);
    },
    setLang: async next => {
      setLangState(next);
      setApiLanguage(next);
      setUserState(await api.updateMe({ language: next }));
    },
    setTheme: next => { setThemeState(next); store("theme", next); },
    startTimer: (bookId, title) => setTimer({ bookId, title, startedAt: Date.now() }),
    stopTimer: () => {
      if (!timer) return;
      const minutes = Math.min(LIMITS.MAX_MINUTES, Math.max(1, Math.round((Date.now() - timer.startedAt) / 60000)));
      setPendingLog({ bookId: timer.bookId, minutes });
      setTimer(null);
    },
    clearPendingLog: () => setPendingLog(null)
  } : null;

  let routes;
  if (user === undefined) {
    routes = spinner;
  } else if (state === null) {
    routes = (
      <Routes>
        <Route path="/reset" element={<ResetPage t={t} onSignedIn={setUser} />} />
        <Route path="*" element={<AuthPage t={t} lang={lang} setLang={setLangState} onSignedIn={setUser} />} />
      </Routes>
    );
  } else {
    routes = (
      <AppContext.Provider value={state}>
        <Routes>
          <Route path="/" element={<CataloguePage />} />
          <Route path="/reports" element={<Suspense fallback={spinner}><ReportsPage /></Suspense>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppContext.Provider>
    );
  }

  return (
    <BrowserRouter>
      {routes}
      <Footer />
      <ToastContainer position="bottom-end" className="p-3 position-fixed">
        <Toast className="align-items-center border-0 toast-app" show={toast.show} delay={2600} autohide
               onClose={() => setToast(s => ({ ...s, show: false }))}>
          <div className="d-flex">
            <Toast.Body role="status">{toast.message}</Toast.Body>
            <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Close"
                    onClick={() => setToast(s => ({ ...s, show: false }))} />
          </div>
        </Toast>
      </ToastContainer>
    </BrowserRouter>
  );
}
