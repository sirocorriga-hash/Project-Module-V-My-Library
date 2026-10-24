import type { ReactNode } from "react";
import type { Translate } from "../i18n";

/** The plain header used before signing in. */
export default function BrandHeader({ t, children }: { t: Translate; children?: ReactNode }) {
  return (
    <header className="header-bg py-4 mb-4">
      <div className="container d-flex justify-content-between align-items-end gap-3">
        <div>
          <div className="eyebrow mb-1">{t("tagline")}</div>
          <h1>My Library</h1>
        </div>
        {children}
      </div>
    </header>
  );
}
