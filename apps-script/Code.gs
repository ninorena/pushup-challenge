// Google Apps Script backend for the pushup challenge.
// Paste this into Extensions > Apps Script in the Google Sheet. See README.md.

const SHEET_NAME = "Log";
const HEADERS = ["timestamp", "name", "date", "reps", "exercise"];

function logSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function dateString_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

// GET: every logged entry.
function doGet() {
  const rows = logSheet_().getDataRange().getValues().slice(1);
  const entries = rows
    .filter((r) => r[1] !== "" && r[2] !== "")
    .map((r) => ({ name: String(r[1]), date: dateString_(r[2]), reps: Number(r[3]), exercise: String(r[4] || "pushups") }));
  return json_({ ok: true, entries: entries });
}

// POST: add one entry. The body is JSON sent as text/plain.
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "Body is not JSON." });
  }
  const name = String(data.name || "").trim();
  const date = String(data.date || "");
  const reps = Number(data.reps);
  const exercise = String(data.exercise || "pushups").trim();

  if (!name || name.length > 40) return json_({ ok: false, error: "Name must be 1 to 40 characters." });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json_({ ok: false, error: "Date must look like 2026-10-26." });
  if (!Number.isInteger(reps) || reps < -2000 || reps > 2000 || reps === 0) {
    return json_({ ok: false, error: "Reps must be a whole number between -2000 and 2000, and not 0." });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // The leading apostrophe stores text as text, so a name like "=SUM()"
    // is never run as a formula and the date is never reformatted.
    logSheet_().appendRow([new Date(), "'" + name, "'" + date, reps, "'" + exercise]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}
