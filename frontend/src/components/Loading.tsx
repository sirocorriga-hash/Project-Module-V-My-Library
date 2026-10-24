import { Spinner } from "react-bootstrap";

/** The spinner shown while data is on its way. */
export default function Loading({ className = "py-5" }: { className?: string }) {
  return <div className={`text-center ${className}`}><Spinner animation="border" className="icon-brass" /></div>;
}
