import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Shown by the browser's own validation when `required`/`min`/`max` fail. */
  fallbackError?: string;
}

/** A labelled Bootstrap input with its error message. */
const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { id, label, error, hint, fallbackError, className = "", ...input }, ref) {
  return (
    <>
      <label className="form-label" htmlFor={id}>{label}</label>
      <input ref={ref} id={id} className={`form-control${error ? " is-invalid" : ""} ${className}`.trim()} {...input} />
      {(error || fallbackError) && <div className="invalid-feedback">{error || fallbackError}</div>}
      {hint && <div className="form-text">{hint}</div>}
    </>
  );
});

export default Field;
