import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "../api";
import { useApp } from "../context";
import type { Language, ThemeChoice, User } from "../types";
import Header from "../components/Header";
import Field from "../components/Field";
import { LIMITS } from "../lib/limits";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel mb-4">
      <h2 className="h5 display-face mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { user, setUser, notify, t, lang, setLang, theme, setTheme } = useApp();
  const [profile, setProfile] = useState({
    name: user.name,
    daily_minutes: String(user.daily_minutes),
    yearly_goal: user.yearly_goal?.toString() ?? ""
  });
  const [libraryName, setLibraryName] = useState(user.library.name);
  useEffect(() => setLibraryName(user.library.name), [user.library.id, user.library.name]);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Run an API call that returns the updated user; show field errors or a toast. */
  async function save(call: () => Promise<User>, message: (u: User) => string = () => t("saved")) {
    try {
      const updated = await call();
      setUser(updated);
      setErrors({});
      notify(message(updated));
      return true;
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.fields ?? {});
      if (!err.fields) notify(err.message);
      return false;
    }
  }

  const submitProfile = (e: FormEvent) => {
    e.preventDefault();
    save(() => api.updateMe(profile));
  };

  const copyCode = () => navigator.clipboard?.writeText(user.library.invite_code).then(() => notify(t("copied")));

  async function join(e: FormEvent) {
    e.preventDefault();
    if (await save(() => api.joinLibrary(code.trim()), u => t("joined", { name: u.library.name }))) setCode("");
  }

  const choice = <T extends string>(name: string, value: T, options: [T, string][], onChange: (v: T) => void) => (
    <div className="segmented" role="radiogroup" aria-label={name}>
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? "active" : ""}
                onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );

  return (
    <>
      <Header eyebrow={user.email} title={t("settings")} />
      <main className="container pb-5 flex-grow-1 settings">
        <div className="row g-4">
          <div className="col-lg-6">
            <Section title={t("profile")}>
              <form onSubmit={submitProfile} noValidate>
                <div className="mb-3">
                  <Field id="setName" label={t("name")} value={profile.name} error={errors.name}
                         onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-sm-6">
                    <Field id="setDaily" type="number" min={1} max={LIMITS.MAX_MINUTES} label={t("dailyMinutes")} value={profile.daily_minutes}
                           error={errors.daily_minutes} onChange={e => setProfile(p => ({ ...p, daily_minutes: e.target.value }))} />
                  </div>
                  <div className="col-sm-6">
                    <Field id="setGoal" type="number" min={1} max={LIMITS.MAX_GOAL} label={t("yearlyGoal")} value={profile.yearly_goal}
                           error={errors.yearly_goal} hint={t("goalHint")}
                           onChange={e => setProfile(p => ({ ...p, yearly_goal: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" className="btn btn-gold">{t("save")}</button>
              </form>
            </Section>

            <Section title={t("appearance")}>
              <div className="mb-3">
                <div className="form-label">{t("language")}</div>
                {choice<Language>(t("language"), lang, [["it", "Italiano"], ["en", "English"]], setLang)}
              </div>
              <div>
                <div className="form-label">{t("theme")}</div>
                {choice<ThemeChoice>(t("theme"), theme, [["auto", t("themeAuto")], ["light", t("themeLight")], ["dark", t("themeDark")]], setTheme)}
              </div>
            </Section>
          </div>

          <div className="col-lg-6">
            <Section title={t("library")}>
              <form className="mb-4" noValidate onSubmit={e => { e.preventDefault(); save(() => api.renameLibrary(libraryName)); }}>
                <label className="form-label" htmlFor="libName">{t("libraryName")}</label>
                <div className="input-group has-validation">
                  <input id="libName" className={`form-control${errors.library_name ? " is-invalid" : ""}`} value={libraryName}
                         onChange={e => setLibraryName(e.target.value)} />
                  <button type="submit" className="btn btn-outline-gold">{t("save")}</button>
                  {errors.library_name && <div className="invalid-feedback">{errors.library_name}</div>}
                </div>
              </form>

              <div className="form-label">{t("members")}</div>
              <ul className="member-list mb-4">
                {user.library.members.map(m => <li key={m.id}><i className="bi bi-person me-2" />{m.name}</li>)}
              </ul>

              <div className="form-label">{t("inviteCode")}</div>
              <div className="d-flex flex-wrap gap-2 align-items-center mb-1">
                <code className="invite-code">{user.library.invite_code}</code>
                <button type="button" className="btn btn-sm btn-outline-gold" onClick={copyCode}><i className="bi bi-clipboard me-1" />{t("copy")}</button>
                <button type="button" className="btn btn-sm btn-link link-accent" onClick={() => save(api.newInviteCode)}>{t("newCode")}</button>
              </div>
              <p className="form-text mb-4">{t("inviteHint")}</p>

              <form onSubmit={join} noValidate className="mb-3">
                <label className="form-label" htmlFor="joinCode">{t("joinTitle")}</label>
                <div className="input-group has-validation">
                  <input id="joinCode" className={`form-control mono${errors.code ? " is-invalid" : ""}`} placeholder={t("codePlaceholder")}
                         value={code} onChange={e => setCode(e.target.value)} />
                  <button type="submit" className="btn btn-outline-gold" disabled={!code.trim()}>{t("join")}</button>
                  {errors.code && <div className="invalid-feedback">{errors.code}</div>}
                </div>
                <div className="form-text">{t("joinHint")}</div>
              </form>

              {user.library.members.length > 1 && (
                <button type="button" className="btn btn-sm btn-outline-danger"
                        onClick={() => window.confirm(t("leaveConfirm")) && save(api.leaveLibrary, () => t("left"))}>
                  <i className="bi bi-box-arrow-left me-1" />{t("leave")}
                </button>
              )}
            </Section>
          </div>
        </div>
      </main>
    </>
  );
}
