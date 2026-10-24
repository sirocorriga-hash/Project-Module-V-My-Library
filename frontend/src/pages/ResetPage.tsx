import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import type { Translate } from "../i18n";
import type { User } from "../types";
import Field from "../components/Field";
import BrandHeader from "../components/BrandHeader";

/** Opened from the link in the password-reset email: /reset?token=... */
export default function ResetPage({ t, onSignedIn }: { t: Translate; onSignedIn: (u: User) => void }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await api.reset(params.get("token") ?? "", password);
      navigate("/", { replace: true });
      onSignedIn(user);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BrandHeader t={t} />
      <main className="container pb-5 flex-grow-1">
        <form className="panel auth-card mx-auto" onSubmit={submit} noValidate>
          <h2 className="h5 mb-3">{t("resetTitle")}</h2>
          {error && !error.fields && <div className="alert alert-danger py-2">{error.message}</div>}
          <div className="mb-3">
            <Field id="reset-password" type="password" label={t("newPassword")} value={password}
                   onChange={e => setPassword(e.target.value)} error={error?.fields?.password}
                   autoComplete="new-password" hint={t("atLeast8")} />
          </div>
          <button type="submit" className="btn btn-gold w-100" disabled={busy}>{busy ? t("pleaseWait") : t("setPassword")}</button>
          <div className="text-center mt-3"><Link to="/" className="btn btn-link btn-sm">{t("backToSignIn")}</Link></div>
        </form>
      </main>
    </>
  );
}
