import { Modal } from "react-bootstrap";
import { useApp } from "../context";
import type { ImportMode, ImportPreview } from "../types";

export interface PendingImport extends ImportPreview { fileName: string; data: unknown }

export default function ImportModal({ pending, onApply, onClose }:
  { pending: PendingImport | null; onApply: (mode: Exclude<ImportMode, "preview">) => void; onClose: () => void }) {
  const { t } = useApp();
  const modes = [
    ["update", "btn-gold", t("modeUpdate"), t("modeUpdateHint")],
    ["add", "btn-outline-gold", t("modeAdd"), t("modeAddHint")],
    ["replace", "btn-outline-danger", t("modeReplace"), t("modeReplaceHint")]
  ] as const;

  return (
    <Modal show={Boolean(pending)} onHide={onClose} centered>
      <Modal.Header closeButton><Modal.Title as="h5" className="display-face">{t("importTitle")}</Modal.Title></Modal.Header>
      <Modal.Body>
        {pending && <p className="mb-3">{t("importSummary", { file: pending.fileName, total: pending.total, matched: pending.matched, fresh: pending.fresh })}</p>}
        <div className="d-grid gap-2">
          {modes.map(([mode, cls, label, hint]) => (
            <button key={mode} className={`btn ${cls} text-start`} onClick={() => onApply(mode)}>
              {label}<span className="d-block small fw-normal opacity-75">{hint}</span>
            </button>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn-link text-body-secondary text-decoration-none" onClick={onClose}>{t("cancel")}</button>
      </Modal.Footer>
    </Modal>
  );
}
