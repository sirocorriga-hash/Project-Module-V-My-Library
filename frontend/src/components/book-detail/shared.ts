/** What every tab of the detail window receives from BookDetailModal. */
export interface TabProps {
  /** Run a change, then reload the history; field errors end up in `errors`. Resolves to true on success. */
  run: (action: () => Promise<unknown>) => Promise<boolean>;
  errors: Record<string, string>;
}

/** " is-invalid" when the server rejected that field, for Bootstrap's red border. */
export const invalidClass = (errors: Record<string, string>, field: string) => (errors[field] ? " is-invalid" : "");
