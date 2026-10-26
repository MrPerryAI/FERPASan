# FERPA Sanitizer

**Swap student names for fun code names before you paste schoolwork into AI. Then put the real names back afterward.**

`Emma Johnson turned in her essay.` → `Fluffy Unicorn 45 turned in her essay.`

- 🔒 **Private.** It runs entirely in your web browser. Your files are never uploaded anywhere, and it works with Wi-Fi off.
- 📄 **Works with your files.** Word (.docx), Excel (.xlsx), PowerPoint (.pptx), and text/CSV. Formatting, tables, formulas and pictures stay as they were.
- 🔑 **Reversible.** You get a private **key** so you can turn the code names in the AI's answer back into real names.
- 🧑‍🏫 **Made for teachers.** Three steps, no install, no account.

---

## For teachers: how to use it

### Get it (one time)

1. Download **[`FERPA-Sanitizer.html`](FERPA-Sanitizer.html)**. On GitHub, open the file and click the **Download raw file** button (⬇).
2. Save it somewhere easy to find, like your Desktop.
3. Double-click it. It opens in your web browser (Chrome, Edge, Firefox or Safari). That's it. You don't need internet.

### Hide names (before AI)

1. **Add files.** Drag your Word, Excel or PowerPoint files onto the page.
   - *Recommended:* open **"Paste your class list"** and paste your roster, one student per line. The tool then catches every name, even unusual ones.
2. **Check names.** The tool shows every name it found, the code name it will use, and a snippet of where it appeared.
   - Uncheck anything that isn't a person.
   - Names that are also everyday words (like *Will*, *Grace*, *May*) are flagged so you can decide.
   - Missed someone? Type their name in **"Missed someone?"**
   - Don't like a code name? Click 🎲 to pick another.
3. **Download.**
   - Download the **-sanitized** files. These are safe to give to AI.
   - Download the **key** and keep it private. **Never upload the key to an AI tool.**

### Put names back (after AI)

1. Click **Put names back** at the top.
2. Add your key (if you just made one, it's already loaded).
3. Paste the AI's answer, or drop in a file it gave you. Real names appear right away. Click **Copy text** or **Download**.

### Reuse the same code names next week

On the first screen, open **"Reuse a key from before"** and choose your old key. Each student keeps the same code name, and everyone in that key is recognized automatically.

---

## How code names are chosen

Each student gets a code name like **Fluffy Unicorn 45**:

| Real | Code name | Why |
|---|---|---|
| Emma Johnson | Fluffy Unicorn 45 | Full name → full code name |
| Emma | Fluffy | First name alone → the silly word |
| Johnson | Unicorn 45 | Last name alone → creature + number |
| Johnson, Emma | Unicorn 45, Fluffy | Gradebook order is kept |
| Mrs. Johnson | Mrs. Unicorn 45 | Family members share the creature, like a real family name |
| emma.johnson@school.org | fluffy.unicorn45@example.com | Emails, phone numbers and student IDs are replaced too |

- **Random.** Code names are picked at random and don't use initials, so they reveal nothing about the student.
- **Consistent.** The same student gets the same code name across every file you process together, and across weeks if you reuse your key.
- **Easy to reverse.** Whimsical words like "Fluffy" or "Zesty" almost never appear in schoolwork, so putting real names back is accurate. Words that already appear in your files are never used as code names.
- **The number keeps students apart**, even when two code names look similar.

## How names are found

1. **Your class list** (most accurate) and any **key** you loaded.
2. **Column headings** in spreadsheets and tables, such as "Student Name", "First Name", "Last Name" or "Parent/Guardian".
3. **Ordinary sentences**, using a built-in list of nearly 1,000 common first names. The tool also picks up the last name that follows, titles like *Mr./Mrs./Dr.*, `Last, First` formats, and new first names next to a known last name.
4. **Contact details:** email addresses, phone numbers, and student ID numbers (6–10 digits). Each can be turned off under **"Also hide…"**.

After making the files, the tool **re-reads the finished files** and lists anything that still looks like a name, so you can go back and add it.

## What it can't do

- It can't read text **inside pictures**, screenshots or scanned pages. The tool warns you when a file has pictures, so you can check them yourself.
- It can't open old **.doc / .xls / .ppt** files or **PDFs**. Save them as .docx / .xlsx / .pptx first. For Google Docs, use *File → Download → Microsoft Word*.
- It isn't perfect. **Always skim the sanitized file before you share it.** This tool helps you follow FERPA, but it is not legal advice.

---

## For developers

No dependencies, no build tools, no server. Just plain HTML, CSS and JavaScript.

```
index.html          The page (loads css/ and js/ separately, handy while editing)
css/styles.css      Styles (light + dark mode, mobile friendly)
js/zip.js           Tiny ZIP reader/writer using the browser's built-in CompressionStream
js/names-data.js    First-name list, everyday-word names, code-name word lists
js/engine.js        Name detection, code names, find/replace matcher, key CSV
js/office.js        Reads and rewrites .docx/.xlsx/.pptx XML, plus text/CSV
js/app.js           The screens and buttons
tools/build.mjs     Bundles everything into FERPA-Sanitizer.html
FERPA-Sanitizer.html  The single file teachers download (generated)
```

**Edit, then rebuild the single file:**

```bash
node tools/build.mjs
```

Open `index.html` directly in a browser while you work. It runs over `file://` with no server, so the scripts are classic (non-module) on purpose.

**Technical notes**

- Word often splits one word across several formatting "runs" (`<w:t>Em</w:t><w:t>ma</w:t>`). Text is matched per paragraph, then the edits are mapped back onto the original runs, so formatting is kept.
- Also covered: headers, footers, footnotes, comments, tracked deletions, text boxes, alt text, document properties, Excel shared strings, sheet names, formulas, comments, chart labels, pivot caches, `mailto:` links, and student IDs stored as numbers.
- Unchanged parts of the ZIP (images and so on) are copied byte-for-byte.
- Code names use `crypto.getRandomValues`.
- The key is a CSV file (`Type, Real name or info, Code name`) that opens in Excel. Lines starting with `#` are comments.

## License

MIT. See [LICENSE](LICENSE).
