"""Messages shown to the user, in Italian and English.

The code raises errors with a key ("title_required"); the text is chosen at the
last moment from the request's Accept-Language header (the React app sends its
current language) or, for emails, from the user's saved language.
"""

from flask import has_request_context, request

from .limits import LANGUAGES

MESSAGES = {
    # Field validation
    "title_required": ("Inserisci il titolo del libro.", "Enter the title of the book."),
    "author_required": ("Inserisci il nome dell'autore.", "Enter the author's name."),
    "genre_required": ("Inserisci un genere, per esempio Narrativa.", "Enter a genre, for example Fiction."),
    "year_range": ("Inserisci un anno tra 0 e 2100.", "Enter a year between 0 and 2100."),
    "pages_range": ("Inserisci un numero di pagine tra 1 e 20000.", "Enter a page count between 1 and 20000."),
    "date_invalid": ("Inserisci una data valida.", "Enter a valid date."),
    "date_future": ("La data non può essere nel futuro.", "The date cannot be in the future."),
    "minutes_range": ("Inserisci i minuti letti (1–1440).", "Enter the minutes read (1–1440)."),
    "session_pages_range": ("Inserisci le pagine lette (0–5000).", "Enter the pages read (0–5000)."),
    "rating_range": ("Il voto va da 1 a 5.", "The rating goes from 1 to 5."),
    "finished_before_start": ("La fine non può precedere l'inizio.", "The end cannot come before the start."),
    "due_before_lent": ("La restituzione non può precedere il prestito.", "The due date cannot come before the loan."),
    "email_invalid": ("Inserisci un indirizzo email valido.", "Enter a valid email address."),
    "email_taken": ("Esiste già un account con questa email.", "An account with this email already exists."),
    "password_short": ("Usa almeno 8 caratteri.", "Use at least 8 characters."),
    "name_required": ("Inserisci il tuo nome.", "Enter your name."),
    "daily_minutes_range": ("Inserisci i minuti al giorno (1–1440).", "Enter the minutes per day (1–1440)."),
    "pace_range": ("Inserisci un ritmo tra 1 e 500 pagine l'ora, o lascia vuoto.",
                   "Enter a pace between 1 and 500 pages per hour, or leave it empty."),
    "goal_range": ("Inserisci un obiettivo tra 1 e 1000 libri, o lascia vuoto.",
                   "Enter a goal between 1 and 1000 books, or leave it empty."),
    "language_invalid": ("Lingua non supportata.", "Unsupported language."),
    "note_required": ("Scrivi il testo della nota.", "Write the text of the note."),
    "note_page": ("Inserisci una pagina valida.", "Enter a valid page."),
    "library_name_required": ("Dai un nome alla libreria.", "Give the library a name."),
    "invite_invalid": ("Codice di invito non valido.", "Invalid invite code."),
    "isbn_invalid": ("Inserisci un ISBN di 10 o 13 cifre.", "Enter a 10 or 13 digit ISBN."),
    # Request errors
    "sign_in": ("Accedi per continuare.", "Please sign in."),
    "bad_credentials": ("Email o password non corrette.", "Email or password is not correct."),
    "invalid_fields": ("Alcuni campi non sono validi.", "Some fields are not valid."),
    "not_found": ("Elemento non trovato.", "Not found."),
    "bad_json": ("Era atteso un oggetto JSON.", "Expected a JSON object."),
    "missing_header": ("Manca l'intestazione X-Requested-With.", "Missing X-Requested-With header."),
    "unknown_mode": ("Modalità sconosciuta.", "Unknown mode."),
    "no_list": ("Il file non contiene un elenco di libri.", "The file does not contain a list of books."),
    "no_books": ("Nel file non c'è nessun libro leggibile.", "No readable book was found in the file."),
    "reading_open": ("Hai già una lettura in corso per questo libro.", "You are already reading this book."),
    "wishlist_no_loan": ("Un libro nella lista desideri non si può prestare.", "A wishlist book cannot be lent."),
    "reset_invalid": ("Il link non è valido o è scaduto.", "The link is not valid or has expired."),
    "isbn_not_found": ("Nessun libro trovato con questo ISBN.", "No book found with this ISBN."),
    "lookup_failed": ("Il servizio di ricerca non risponde. Riprova più tardi.",
                      "The lookup service is not responding. Try again later."),
    "too_many": ("Troppi tentativi. Riprova tra un minuto.", "Too many attempts. Try again in a minute."),
    "library_has_books": ("Per unirti a un'altra libreria la tua deve essere vuota o condivisa.",
                          "To join another library yours must be empty or shared."),
    # Emails
    "reset_subject": ("Reimposta la password di My Library", "Reset your My Library password"),
    "reset_body": ("Ciao {name},\n\nper scegliere una nuova password apri questo link (vale un'ora):\n{link}\n\n"
                   "Se non l'hai chiesto tu, ignora questa email.",
                   "Hi {name},\n\nopen this link to choose a new password (valid for one hour):\n{link}\n\n"
                   "If you did not ask for this, ignore this email."),
    "reminder_subject": ("Libri in prestito da restituire", "Books on loan past their due date"),
    "reminder_intro": ("Ciao {name}, questi libri dovevano già tornare:", "Hi {name}, these books are past their due date:"),
    "reminder_line": ("- «{title}» presso {borrower}, scaduto il {due} ({days} giorni di ritardo)",
                      "- “{title}” with {borrower}, due {due} ({days} days late)"),
}


def current_language():
    if has_request_context():
        return request.accept_languages.best_match(LANGUAGES) or "it"
    return "it"


def t(key, language=None, **values):
    it, en = MESSAGES.get(key, (key, key))
    text = en if (language or current_language()) == "en" else it
    return text.format(**values) if values else text
