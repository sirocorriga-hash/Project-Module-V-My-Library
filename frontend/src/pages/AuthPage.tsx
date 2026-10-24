import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api";
import type { Translate } from "../i18n";
import type { Language, User } from "../types";
import Field from "../components/Field";
import BrandHeader from "../components/BrandHeader";

type Mode = "login" | "register" | "forgot";

interface Props { t: Translate; lang: Language; setLang: (l: Language) => void; onSignedIn: (u: User) => void }

export default function AuthPage({ t, lang, setLang, onSignedIn }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const switchTo = (next: Mode) => { setMode(next); setErrors({}); setSent(false); };
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setErrors(errs => {
      const next = { ...errs };
      delete next[key];
      delete next._form;
      return next;
    });
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        await api.forgot(form.email);
        setSent(true);
      } else {
        onSignedIn(mode === "register"
          ? await api.register(form.name, form.email, form.password, lang)
          : await api.login(form.email, form.password));
      }
    } catch (error) {
      const err = error as ApiError;
      setErrors(err.fields ?? { _form: err.message });
    } finally {
      setBusy(false);
    }
  }

  const submitLabel = { login: t("signIn"), register: t("createAccount"), forgot: t("sendLink") }[mode];

  return (
    <>
      <BrandHeader t={t}>
        <div className="btn-group btn-group-sm" role="group" aria-label="Language">
          {(["it", "en"] as const).map(l => (
            <button key={l} type="button" className={`btn ${lang === l ? "btn-light" : "btn-outline-light"}`}
                    onClick={() => setLang(l)}>{l.toUpperCase()}</button>
          ))}
        </div>
      </BrandHeader>
      <main className="container pb-5 flex-grow-1">
        <div className="panel auth-card mx-auto">
          {mode !== "forgot" && (
            <div className="segmented mb-4" role="tablist">
              {(["login", "register"] as const).map(m => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? "active" : ""}
                        onClick={() => switchTo(m)}>
                  {m === "login" ? t("signIn") : t("createAccount")}
                </button>
              ))}
            </div>
          )}
          {mode === "forgot" && <h2 className="h5 mb-3">{t("forgotPassword")}</h2>}

          {sent ? <p className="alert alert-success">{t("linkSent")}</p> : (
            <form onSubmit={submit} noValidate>
              {errors._form && <div className="alert alert-danger py-2">{errors._form}</div>}
              {mode === "register" && (
                <div className="mb-3">
                  <Field id="auth-name" label={t("yourName")} value={form.name} onChange={set("name")}
                         error={errors.name} autoComplete="name" required />
                </div>
              )}
              <div className="mb-3">
                <Field id="auth-email" type="email" label={t("email")} value={form.email} onChange={set("email")}
                       error={errors.email} autoComplete="email" required />
              </div>
              {mode !== "forgot" && (
                <div className="mb-3">
                  <Field id="auth-password" type="password" label={t("password")} value={form.password}
                         onChange={set("password")} error={errors.password} required
                         autoComplete={mode === "register" ? "new-password" : "current-password"}
                         hint={mode === "register" ? t("atLeast8") : undefined} />
                </div>
              )}
              <button type="submit" className="btn btn-gold w-100" disabled={busy}>
                {busy ? t("pleaseWait") : submitLabel}
              </button>
            </form>
          )}

          <div className="text-center mt-3">
            {mode === "login" && <button type="button" className="btn btn-link btn-sm" onClick={() => switchTo("forgot")}>{t("forgotPassword")}</button>}
            {mode === "forgot" && <button type="button" className="btn btn-link btn-sm" onClick={() => switchTo("login")}>{t("backToSignIn")}</button>}
          </div>
        </div>
      </main>
    </>
  );
}
