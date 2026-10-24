export default function Footer() {
  return (
    <footer className="site-footer mt-auto py-3">
      <div className="container d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span className="footer-mark display-face">My Library</span>
        <span className="footer-note">&copy; {new Date().getFullYear()} Siro Corriga</span>
      </div>
    </footer>
  );
}
