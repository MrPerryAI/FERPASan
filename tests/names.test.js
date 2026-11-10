// Regression tests for name detection and replacement. Run: node tests/names.test.js
// No dependencies: loads the same scripts the page does.
const path = require('node:path');
for (const f of ['names-big', 'names-data', 'engine']) require(path.join(__dirname, '..', 'js', f + '.js'));
const E = globalThis.FEngine;

let failed = 0;
function check(label, ok, detail) {
  if (!ok) { failed++; console.log('FAIL  ' + label + (detail ? '\n      ' + detail : '')); }
  else console.log('ok    ' + label);
}

/** Detect, select everything except "maybe", sanitize, and return helpers for assertions. */
function run({ text = [], tables = [], roster = '' }) {
  const found = E.detect({ paragraphs: text, tables }, roster, null, { emails: false, phones: false, ids: false });
  const book = new E.AliasBook();
  const plan = E.buildSanitizePlan(found.people.filter((p) => p.confidence !== 'maybe'), [], book);
  const out = text.map((t) => plan.matcher.replace(t).text);
  return {
    out,
    names: (conf) => found.people.filter((p) => !conf || p.confidence === conf).map((p) => E.displayName(p)),
    leaks: (...words) => words.filter((w) => out.some((o) => new RegExp('\\b' + w + '\\b', 'i').test(o))),
    codeFor: (real) => (plan.keyRows.find((r) => r.real === real) || {}).code,
  };
}
const noLeak = (label, r, ...words) => check(label, r.leaks(...words).length === 0, 'still visible: ' + r.leaks(...words).join(', ') + '  ->  ' + r.out.join(' | '));

// ---- last names ----
let r = run({ text: ['Johnson, Emma - 85% (late)', 'Okonkwo, Chidi\t88\tB+', 'Unfortunately, Emma was absent.'] });
noLeak('gradebook order inside a longer line', r, 'Johnson', 'Emma', 'Okonkwo', 'Chidi');
check('"Unfortunately, Emma" is not a last name', r.out[2].startsWith('Unfortunately, '));

r = run({ text: ['Maria Garcia Lopez finished early. Garcia Lopez was proud. Maria Garcia helped. Lopez left.'] });
noLeak('double surname, and each half on its own', r, 'Maria', 'Garcia', 'Lopez');
check('double surname is one person', r.names().length === 1, r.names().join(' | '));

r = run({ text: ['Emma Rose Johnson presented. Emma Rose did well. Johnson sat down.'] });
noLeak('middle name does not strand the last name', r, 'Emma', 'Johnson');
check('middle name is one person', r.names().length === 1, r.names().join(' | '));

r = run({ text: ['EMMA JOHNSON was here. JOHNSON left. Johnson, Emma  A-'] });
noLeak('ALL CAPS', r, 'Johnson', 'Emma');
check('a lone last name gets the same code as in the full name', new Set(r.out[0].match(/[A-Z]+ \d+/g)).size === 1, r.out[0]);
check('a grade letter is not a middle initial', r.names().join() === 'EMMA JOHNSON', r.names().join(' | '));

for (const [hdr, label] of [[['Last_Name', 'First_Name'], 'Last_Name / First_Name'], [['LName', 'FName'], 'LName / FName'], [['lastName', 'firstName'], 'camelCase'], [['Student Last', 'Student First'], 'Student Last / Student First']]) {
  r = run({ text: ['Ramirez', 'Aiden', 'Ramirez was late'], tables: [[hdr, ['Ramirez', 'Aiden']]] });
  noLeak('column headings: ' + label, r, 'Ramirez', 'Aiden');
}
r = run({ text: ['Ramirez', 'Okafor', 'Ramirez and Okafor were late'], tables: [[['Students', 'Score'], ['Ramirez', '90'], ['Okafor', '80']]] });
noLeak('a "Students" column holding only last names', r, 'Ramirez', 'Okafor');
check('...and they get last-name codes (creature + number)', /\d/.test(r.codeFor('Ramirez') || ''), r.codeFor('Ramirez'));

r = run({ text: ['Ramirez', 'Aiden', 'Nguyen', 'Sofia', 'Kowalski', 'Liam', 'Ramirez was late'], tables: [[['Ramirez', 'Aiden', '90'], ['Nguyen', 'Sofia', '85'], ['Kowalski', 'Liam', '70']]] });
noLeak('a table with no headings at all', r, 'Ramirez', 'Nguyen', 'Kowalski', 'Aiden');

r = run({ text: ['Tran, Bao', 'Bao did well'], tables: [[['Student Name', 'Grade'], ['Tran, Bao', 'B']]] });
check('a first name that is also a surname is listed once', r.names().join() === 'Bao Tran', r.names().join(' | '));
noLeak('...and hidden', r, 'Tran', 'Bao');

r = run({ text: ['Ramirez was late. Talked to Kowalski.'], roster: 'Ramirez\nKowalski' });
noLeak('class list of last names only', r, 'Ramirez', 'Kowalski');

r = run({ text: ['I spoke with Ramirez about the missing work. Then Kowalski left early.'] });
check('a lone last name is offered as a "maybe"', r.names('maybe').includes('Ramirez') && r.names('maybe').includes('Kowalski'), r.names('maybe').join(' | '));

r = run({ text: ['Emma Smith-Jones is new. Smith-Jones sat down. Emma Smith waved. Maria de la Cruz came. Cruz was tired.'] });
noLeak('hyphenated and "de la" surnames, whole or in part', r, 'Emma', 'Smith', 'Jones', 'Maria', 'Cruz');

r = run({ text: ['E. Johnson and Liam were partners.'], roster: 'Emma Johnson\nLiam Okafor' });
noLeak('first initial + last name', r, 'Johnson', 'Liam');
check('"E. Johnson" becomes the full code name', !/\bE\. /.test(r.out[0]), r.out[0]);

r = run({ text: ['Coach Davis runs study hall. Davis Smith and Brooks Walker sit together.'] });
noLeak('surname-style first names', r, 'Davis', 'Smith', 'Brooks', 'Walker');

// ---- things that are not students ----
r = run({ text: [
  'The Civil War began in 1861. President Lincoln led the Union while General Lee commanded the South.',
  'Students read about Martin Luther King Jr. and Rosa Parks at Wilson Elementary in Johnson County.',
  'Emma, Liam, and Noah worked on the Boston Tea Party project. Young children enjoyed it. Long ago, people walked.',
  'In To Kill a Mockingbird, Atticus Finch defends Tom Robinson. We visited New York and Los Angeles.',
] });
const untouched = ['President Lincoln', 'General Lee', 'Martin Luther King', 'Rosa Parks', 'Wilson Elementary', 'Johnson County', 'Boston Tea Party', 'Young children', 'Long ago', 'Mockingbird', 'Atticus Finch', 'New York', 'Los Angeles'];
const changed = untouched.filter((w) => !r.out.some((o) => o.includes(w)));
check('history, places and titles are left alone by default', changed.length === 0, 'changed: ' + changed.join(', '));
noLeak('...while the students in the same text are hidden', r, 'Emma', 'Liam', 'Noah');

// ---- round trip ----
{
  const text = ['Johnson, Emma was paired with Maria Garcia Lopez. Mrs. Johnson emailed.'];
  const found = E.detect({ paragraphs: text, tables: [] }, '', null, { emails: false, phones: false, ids: false });
  const plan = E.buildSanitizePlan(found.people, [], new E.AliasBook());
  const back = E.buildRestoreMatcher(plan.keyRows).replace(plan.matcher.replace(text[0]).text).text;
  check('names go back exactly', back === text[0], back);
}

console.log(failed ? '\n' + failed + ' FAILED' : '\nAll passed');
process.exit(failed ? 1 : 0);
