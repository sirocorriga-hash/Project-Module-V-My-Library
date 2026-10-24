// Apply the saved theme before the first paint, so dark mode does not flash white.
try {
  var t = JSON.parse(localStorage.getItem("theme")) || "auto";
  if (t === "auto") t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.bsTheme = t;
} catch (e) {}
