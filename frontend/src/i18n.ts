/* Interface texts in Italian and English. TypeScript checks that both
   languages define exactly the same keys. Placeholders look like {name}. */
import { load } from "./lib/storage";
import type { Language } from "./types";

const it = {
  // Navigation and common
  catalogue: "Catalogo", reports: "Report", settings: "Impostazioni", signOut: "Esci",
  cancel: "Annulla", save: "Salva", saving: "Salvataggio…", saved: "Salvato.", add: "Aggiungi", delete: "Elimina",
  edit: "Modifica", optional: "facoltativo", tryAgain: "Riprova", all: "Tutti", pleaseWait: "Attendi…",
  tagline: "Catalogo personale",

  // Sign in
  signIn: "Accedi", createAccount: "Crea account", forgotPassword: "Password dimenticata?",
  yourName: "Il tuo nome", email: "Email", password: "Password", atLeast8: "Almeno 8 caratteri.",
  sendLink: "Invia il link", backToSignIn: "Torna all'accesso",
  linkSent: "Se esiste un account con questa email, ti abbiamo inviato un link per reimpostare la password.",
  resetTitle: "Scegli una nuova password", newPassword: "Nuova password", setPassword: "Salva la password",

  // Catalogue
  importJson: "Importa JSON", exportJson: "Esporta JSON", addBook: "Aggiungi libro",
  statBooks: "Libri", statOnLoan: "In prestito", statRead: "Letti da te", statWishlist: "Desiderati",
  search: "Cerca", searchPlaceholder: "Titolo, autore o ISBN", genre: "Genere", loan: "Prestito",
  onShelf: "In libreria", onLoan: "In prestito", overdue: "Scaduti", reading: "Lettura",
  toRead: "Da leggere", readingNow: "In lettura", read: "Letto", wishlist: "Desiderati",
  sortBy: "Ordina per", sortTitle: "Titolo", sortAuthor: "Autore", sortYear: "Anno", sortRating: "Voto",
  sortRecent: "Aggiunti di recente", showing: "{shown} di {total} libri",
  emptyShelf: "La tua libreria è vuota.", noMatch: "Nessun libro corrisponde ai filtri.",
  addFirst: "Aggiungi il primo libro", clearFilters: "Azzera i filtri",

  // Book card
  badgeOnShelf: "In libreria", badgeOnLoan: "In prestito", badgeOverdue: "Scaduto", badgeWishlist: "Desiderato",
  withBorrower: "Presso {name}", dueOn: "entro il {date}", lend: "Presta", giveBack: "Rientrato",
  start: "Inizia", stop: "Stop", details: "Dettagli", timeRead: "{time} di lettura", readTimes: "letto {n} volte",
  pagesShort: "{n} pp.", more: "Altre azioni",

  // Toasts and confirmations
  confirmDelete: "Eliminare «{title}»? Spariscono anche letture, note e prestiti.",
  added: "Aggiunto «{title}».", updated: "Aggiornato «{title}».", removed: "Eliminato «{title}».",
  lentToast: "«{title}» prestato.", backToast: "«{title}» è tornato in libreria.",
  nothingToExport: "Non c'è ancora niente da esportare.", exported: "Esportati {n} libri.",
  invalidJson: "Questo non è un file JSON valido.",
  importAdded: "{n} aggiunti", importUpdated: "{n} aggiornati", importDone: "Importazione completata: {parts}.",
  nothingChanged: "Nessuna modifica.",

  // Import
  importTitle: "Importa libri",
  importSummary: "{file} contiene {total} libri: {matched} già presenti, {fresh} nuovi. Come vuoi applicarli?",
  modeUpdate: "Aggiorna e aggiungi", modeUpdateHint: "Sovrascrive i libri già presenti, aggiunge i nuovi.",
  modeAdd: "Aggiungi solo i nuovi", modeAddHint: "Lascia invariati i libri attuali.",
  modeReplace: "Sostituisci tutto", modeReplaceHint: "Elimina il catalogo attuale.",
  confirmReplace: "Eliminare i {n} libri attualmente in libreria?",

  // Book form
  newBook: "Nuovo libro", editBook: "Modifica libro", title: "Titolo", author: "Autore", year: "Anno",
  isbn: "ISBN", shelfmark: "Collocazione", shelfmarkPlaceholder: "es. A-12", pages: "Pagine",
  pagesHint: "Serve per stimare il tempo di lettura.", find: "Cerca", scan: "Scansiona",
  found: "Dati compilati da Open Library.", removeCover: "Togli copertina",
  wishlistLabel: "Non lo possiedo ancora (lista desideri)", saveBook: "Salva libro",
  titleRequired: "Inserisci il titolo del libro.", authorRequired: "Inserisci il nome dell'autore.",
  genreRequired: "Inserisci un genere, per esempio Narrativa.", yearRange: "Inserisci un anno tra 0 e 2100.",
  pagesRange: "Inserisci un numero di pagine tra 1 e 20000.",

  // Scanner
  scanTitle: "Scansiona il codice a barre", scanHint: "Inquadra il codice a barre sul retro del libro.",
  cameraError: "La fotocamera non è disponibile.",

  // Lend
  lendTitle: "Presta «{title}»", lentTo: "A chi", borrowerPlaceholder: "Nome", dueDate: "Da restituire entro",
  dueHint: "Lascia vuoto se non c'è una scadenza.",

  // Detail window
  tabReading: "Lettura", tabNotes: "Note", tabLoans: "Prestiti",
  summary: "{time} in {n} sessioni", ofPages: "{read} di {pages} pagine",
  noPagesHint: "aggiungi il numero di pagine per vedere i progressi",
  date: "Data", minutes: "Minuti", pagesRead: "Pagine lette", finishedCheck: "Ho finito il libro con questa sessione",
  rating: "Voto", readingN: "Lettura {n}", inProgress: "in corso", startedOn: "iniziata il {date}",
  finishedOn: "finita il {date}", readAgain: "Rileggilo", startReading: "Inizia a leggere",
  markFinished: "Segna come finito", reopen: "Riapri", deleteReading: "Elimina lettura",
  confirmDeleteReading: "Eliminare questa lettura e le sue sessioni?",
  noSessions: "Nessuna sessione. Le pagine sono facoltative, ma servono a misurare il tuo ritmo.",
  sessions: "Sessioni", loggedToast: "Registrati {time}.", finishedToast: "Hai finito «{title}».",
  timerReady: "Cronometro fermato: {time} pronti da registrare.",
  notePlaceholder: "Un pensiero, una citazione…", isQuote: "È una citazione", page: "Pagina", addNote: "Aggiungi nota",
  noNotes: "Nessuna nota.", quote: "Citazione", neverLent: "Mai prestato.", borrower: "A chi", from: "Dal",
  returned: "Rientrato", days: "Giorni", stillOut: "Ancora fuori", dueCol: "Scadenza",

  // Timer
  timerRunning: "Stai leggendo «{title}»",
  confirmTimerSwitch: "C'è già un cronometro per «{title}». Fermarlo senza registrare e iniziarne uno nuovo?",

  // Reports
  reportsEyebrow: "Lettura e prestiti", timeLeft: "Tempo ancora da leggere",
  booksPagesLeft: "{books} libri, {pages} pagine da leggere.",
  atMinutes: "A {minutes} minuti al giorno sono circa {days} giorni", doneBy: "fine il {date}",
  nothingLeft: "Nessun libro da leggere con il numero di pagine.",
  pace: "Ritmo: {pace} pagine/ora ({source})", paceManual: "la tua impostazione",
  paceMeasured: "misurato dalle tue sessioni", paceDefault: "valore predefinito: registra sessioni con le pagine per misurare il tuo",
  paceWhatIf: "simulazione", measured: "misurato: {n}", notCounted: "Esclusi (senza numero di pagine): {list}.",
  perDay: "Tempo di lettura al giorno", pagesPerHour: "Pagine all'ora", auto: "auto",
  paceHint: "Lascia vuoto per usare il ritmo misurato.", saveDefault: "Salva come predefinito",
  paceSaved: "Ritmo salvato.", bookByBook: "Libro per libro", status: "Stato", pagesLeft: "Pagine rimaste",
  time: "Tempo", timeSpent: "Tempo speso a leggere", totalTime: "Tempo totale", nSessions: "{n} sessioni",
  booksFinished: "Libri finiti", avgPerBook: "Media per libro", avgSession: "Sessione media",
  hoursPerMonth: "Ore di lettura al mese", noMonthly: "Nessuna sessione negli ultimi 12 mesi. Usa «Inizia» o «Dettagli» su un libro.",
  finishedBooks: "Libri finiti", noFinished: "Nessun libro finito.", calendarDays: "Giorni", pph: "Pag/h",
  rereadN: "lettura n. {n}", goalTitle: "Obiettivo {year}", goalProgress: "{done} di {goal} libri",
  goalOnTrack: "Sei in linea con l'obiettivo.", goalBehind: "Sei indietro di {n} libri rispetto al ritmo previsto.",
  goalNone: "Nessun obiettivo. Impostalo in Impostazioni.", streak: "Giorni di fila", streakDays: "{n} giorni",
  streakLongest: "record: {n}", readToday: "Oggi hai letto ✓", notToday: "Oggi non hai ancora letto",
  lending: "Prestiti", loansRecorded: "Prestiti registrati", totalDays: "{n} giorni in tutto",
  outNow: "Fuori ora", overdueLoans: "di cui scaduti: {n}", avgDays: "Giorni medi", returnedOnly: "solo prestiti rientrati",
  longest: "Prestito più lungo", outRightNow: "Fuori adesso", allHome: "Tutti i libri sono in libreria.",
  daysByBorrower: "Giorni di prestito per persona", asTable: "Come tabella",
  noLoans: "Nessun prestito registrato.", since: "Dal", with: "Presso", loans: "Prestiti",

  // Settings
  profile: "Profilo", name: "Nome", language: "Lingua", appearance: "Aspetto", theme: "Tema",
  themeAuto: "Automatico", themeLight: "Chiaro", themeDark: "Scuro", readingPrefs: "Lettura",
  dailyMinutes: "Minuti di lettura al giorno", yearlyGoal: "Libri da finire quest'anno", goalHint: "Lascia vuoto per nessun obiettivo.",
  library: "Libreria", libraryName: "Nome della libreria", members: "Membri", inviteCode: "Codice di invito",
  inviteHint: "Chi inserisce questo codice entra nella tua libreria e vede gli stessi libri. Letture e note restano personali.",
  copy: "Copia", copied: "Copiato.", newCode: "Nuovo codice", joinTitle: "Entra in un'altra libreria",
  joinHint: "Possibile solo se la tua libreria è vuota o condivisa.", codePlaceholder: "Codice", join: "Entra",
  joined: "Sei entrato in «{name}».", leave: "Esci dalla libreria",
  leaveConfirm: "Uscire dalla libreria condivisa? I libri restano agli altri membri; tu riparti con una libreria vuota.",
  left: "Hai una nuova libreria vuota."
};

export type MessageKey = keyof typeof it;

const en: Record<MessageKey, string> = {
  catalogue: "Catalogue", reports: "Reports", settings: "Settings", signOut: "Sign out",
  cancel: "Cancel", save: "Save", saving: "Saving…", saved: "Saved.", add: "Add", delete: "Delete",
  edit: "Edit", optional: "optional", tryAgain: "Try again", all: "All", pleaseWait: "Please wait…",
  tagline: "Personal catalogue",

  signIn: "Sign in", createAccount: "Create account", forgotPassword: "Forgot your password?",
  yourName: "Your name", email: "Email", password: "Password", atLeast8: "At least 8 characters.",
  sendLink: "Send the link", backToSignIn: "Back to sign in",
  linkSent: "If an account exists for this email, we sent a link to reset the password.",
  resetTitle: "Choose a new password", newPassword: "New password", setPassword: "Save password",

  importJson: "Import JSON", exportJson: "Export JSON", addBook: "Add book",
  statBooks: "Books", statOnLoan: "On loan", statRead: "Read by you", statWishlist: "Wishlist",
  search: "Search", searchPlaceholder: "Title, author or ISBN", genre: "Genre", loan: "Loan",
  onShelf: "On shelf", onLoan: "On loan", overdue: "Overdue", reading: "Reading",
  toRead: "To read", readingNow: "Reading", read: "Read", wishlist: "Wishlist",
  sortBy: "Sort by", sortTitle: "Title", sortAuthor: "Author", sortYear: "Year", sortRating: "Rating",
  sortRecent: "Recently added", showing: "{shown} of {total} books",
  emptyShelf: "Your bookshelf is empty.", noMatch: "No books match these filters.",
  addFirst: "Add the first book", clearFilters: "Clear filters",

  badgeOnShelf: "On shelf", badgeOnLoan: "On loan", badgeOverdue: "Overdue", badgeWishlist: "Wishlist",
  withBorrower: "With {name}", dueOn: "due {date}", lend: "Lend", giveBack: "Returned",
  start: "Start", stop: "Stop", details: "Details", timeRead: "{time} read", readTimes: "read {n} times",
  pagesShort: "{n} pp.", more: "More actions",

  confirmDelete: "Remove “{title}”? Its readings, notes and loans go too.",
  added: "Added “{title}”.", updated: "Updated “{title}”.", removed: "Removed “{title}”.",
  lentToast: "“{title}” lent.", backToast: "“{title}” is back on the shelf.",
  nothingToExport: "There is nothing to export yet.", exported: "Exported {n} books.",
  invalidJson: "This is not a valid JSON file.",
  importAdded: "{n} added", importUpdated: "{n} updated", importDone: "Import complete: {parts}.",
  nothingChanged: "Nothing changed.",

  importTitle: "Import books",
  importSummary: "{file} contains {total} books: {matched} already on your shelf, {fresh} new. How should they be applied?",
  modeUpdate: "Update and add", modeUpdateHint: "Overwrite the books already on the shelf, add the new ones.",
  modeAdd: "Add new only", modeAddHint: "Leave the current books untouched.",
  modeReplace: "Replace everything", modeReplaceHint: "Discard the current catalogue.",
  confirmReplace: "Discard the {n} books currently on the shelf?",

  newBook: "New book", editBook: "Edit book", title: "Title", author: "Author", year: "Year",
  isbn: "ISBN", shelfmark: "Shelfmark", shelfmarkPlaceholder: "e.g. A-12", pages: "Pages",
  pagesHint: "Needed to estimate reading time.", find: "Find", scan: "Scan",
  found: "Details filled in from Open Library.", removeCover: "Remove cover",
  wishlistLabel: "I don't own it yet (wishlist)", saveBook: "Save book",
  titleRequired: "Enter the title of the book.", authorRequired: "Enter the author's name.",
  genreRequired: "Enter a genre, for example Fiction.", yearRange: "Enter a year between 0 and 2100.",
  pagesRange: "Enter a page count between 1 and 20000.",

  scanTitle: "Scan the barcode", scanHint: "Point the camera at the barcode on the back cover.",
  cameraError: "The camera is not available.",

  lendTitle: "Lend “{title}”", lentTo: "Lent to", borrowerPlaceholder: "Name", dueDate: "Return by",
  dueHint: "Leave empty for no due date.",

  tabReading: "Reading", tabNotes: "Notes", tabLoans: "Loans",
  summary: "{time} over {n} sessions", ofPages: "{read} of {pages} pages",
  noPagesHint: "add the page count to see progress",
  date: "Date", minutes: "Minutes", pagesRead: "Pages read", finishedCheck: "I finished the book with this session",
  rating: "Rating", readingN: "Reading {n}", inProgress: "in progress", startedOn: "started {date}",
  finishedOn: "finished {date}", readAgain: "Read it again", startReading: "Start reading",
  markFinished: "Mark as finished", reopen: "Reopen", deleteReading: "Delete reading",
  confirmDeleteReading: "Delete this reading and its sessions?",
  noSessions: "No sessions yet. Pages are optional, but they let the reports measure your pace.",
  sessions: "Sessions", loggedToast: "Logged {time}.", finishedToast: "Finished “{title}”.",
  timerReady: "Timer stopped: {time} ready to log.",
  notePlaceholder: "A thought, a quote…", isQuote: "It's a quote", page: "Page", addNote: "Add note",
  noNotes: "No notes yet.", quote: "Quote", neverLent: "Never lent.", borrower: "Lent to", from: "From",
  returned: "Returned", days: "Days", stillOut: "Still out", dueCol: "Due",

  timerRunning: "Reading “{title}”",
  confirmTimerSwitch: "A timer is already running for “{title}”. Stop it without logging and start a new one?",

  reportsEyebrow: "Reading & lending", timeLeft: "Time still to read",
  booksPagesLeft: "{books} books, {pages} pages left.",
  atMinutes: "At {minutes} min a day that is about {days} days", doneBy: "done by {date}",
  nothingLeft: "Nothing left on your to-read pile with a page count.",
  pace: "Pace: {pace} pages/hour ({source})", paceManual: "your setting",
  paceMeasured: "measured from your sessions", paceDefault: "a default: log sessions with pages to measure yours",
  paceWhatIf: "what-if", measured: "measured: {n}", notCounted: "Not counted (no page count): {list}.",
  perDay: "Reading time per day", pagesPerHour: "Pages per hour", auto: "auto",
  paceHint: "Leave empty to use the measured pace.", saveDefault: "Save as my default",
  paceSaved: "Reading pace saved.", bookByBook: "Book by book", status: "Status", pagesLeft: "Pages left",
  time: "Time", timeSpent: "Time spent reading", totalTime: "Total reading time", nSessions: "{n} sessions",
  booksFinished: "Books finished", avgPerBook: "Avg per book", avgSession: "Avg session",
  hoursPerMonth: "Hours read per month", noMonthly: "No sessions in the last 12 months. Use “Start” or “Details” on a book.",
  finishedBooks: "Finished books", noFinished: "No finished books yet.", calendarDays: "Days", pph: "Pages/h",
  rereadN: "reading #{n}", goalTitle: "{year} goal", goalProgress: "{done} of {goal} books",
  goalOnTrack: "You are on track.", goalBehind: "{n} books behind schedule.",
  goalNone: "No goal yet. Set one in Settings.", streak: "Reading streak", streakDays: "{n} days",
  streakLongest: "longest: {n}", readToday: "Read today ✓", notToday: "Not read yet today",
  lending: "Lending", loansRecorded: "Loans recorded", totalDays: "{n} days in total",
  outNow: "Out now", overdueLoans: "overdue: {n}", avgDays: "Avg days per loan", returnedOnly: "returned loans only",
  longest: "Longest loan", outRightNow: "Out right now", allHome: "Every book is on the shelf.",
  daysByBorrower: "Days on loan, by borrower", asTable: "As a table",
  noLoans: "No loans recorded yet.", since: "Since", with: "With", loans: "Loans",

  profile: "Profile", name: "Name", language: "Language", appearance: "Appearance", theme: "Theme",
  themeAuto: "Automatic", themeLight: "Light", themeDark: "Dark", readingPrefs: "Reading",
  dailyMinutes: "Reading minutes per day", yearlyGoal: "Books to finish this year", goalHint: "Leave empty for no goal.",
  library: "Library", libraryName: "Library name", members: "Members", inviteCode: "Invite code",
  inviteHint: "Whoever enters this code joins your library and sees the same books. Readings and notes stay personal.",
  copy: "Copy", copied: "Copied.", newCode: "New code", joinTitle: "Join another library",
  joinHint: "Only possible if your library is empty or shared.", codePlaceholder: "Code", join: "Join",
  joined: "You joined “{name}”.", leave: "Leave the library",
  leaveConfirm: "Leave the shared library? The books stay with the other members; you start again with an empty library.",
  left: "You have a new, empty library."
};

const dictionaries: Record<Language, Record<MessageKey, string>> = { it, en };

export type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

export function translator(lang: Language): Translate {
  const dict = dictionaries[lang];
  return (key, values) =>
    dict[key].replace(/\{(\w+)\}/g, (match, name) => (values && name in values ? String(values[name]) : match));
}

export const locale = (lang: Language) => (lang === "it" ? "it-IT" : "en-GB");

export function initialLanguage(): Language {
  const saved = load<string>("language", "");
  if (saved === "it" || saved === "en") return saved;
  return navigator.language?.startsWith("en") ? "en" : "it";
}
