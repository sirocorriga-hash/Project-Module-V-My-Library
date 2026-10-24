/** A 1–5 star rating. Read-only when `onChange` is missing. */
export default function Stars({ value, onChange, label = "Rating" }:
  { value: number | null; onChange?: (v: number | null) => void; label?: string }) {
  if (!onChange) {
    if (!value) return null;
    return (
      <span className="stars" role="img" aria-label={`${value}/5`}>
        {[1, 2, 3, 4, 5].map(n => <i key={n} className={`bi ${n <= value ? "bi-star-fill" : "bi-star"}`} />)}
      </span>
    );
  }
  // Clicking the selected star again clears the rating.
  return (
    <span className="stars stars-input" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n}/5`}
                onClick={() => onChange(value === n ? null : n)}>
          <i className={`bi ${value && n <= value ? "bi-star-fill" : "bi-star"}`} />
        </button>
      ))}
    </span>
  );
}
