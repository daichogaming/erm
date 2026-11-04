/**
 * Receives "Report Question Issue" submissions and stores them as rows in a Google Sheet.
 * Free, no server needed. Setup steps are in the chat / README below.
 *
 * 1. Create a Google Sheet (any name, e.g. "SATLab Question Reports").
 * 2. In the Sheet: Extensions → Apps Script → paste this whole file, replacing what's there → Save.
 * 3. Deploy → New deployment → type "Web app"
 *      Execute as: Me
 *      Who has access: Anyone
 *    Click Deploy and approve the permission prompt.
 * 4. Copy the "Web app URL" (ends in /exec) and paste it into REPORT_ENDPOINT at the top of report.js.
 *
 * After ANY change to this file you must redeploy, or the live URL keeps running the old code:
 *    Deploy → Manage deployments → ✎ (edit) → Version: "New version" → Deploy.  (The /exec URL stays the same.)
 */

var HEADERS = ['Received', 'Status', 'Page', 'Module', 'Question #', 'Question ID', 'Message', 'URL', 'User agent'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Reports') || ss.insertSheet('Reports');
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  // Columns C:I (Page … User agent) are plain text, so ids like 02848335 / 17e49403 and
  // messages like 1/2 are stored as typed instead of being turned into numbers or dates.
  // Cheap to repeat; also fixes sheets created before this line existed.
  // Keep a spare row at the bottom so the next write lands inside the formatted grid.
  if (sh.getLastRow() >= sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 500);
  sh.getRange('C:I').setNumberFormat('@');
  return sh;
}

function doPost(e) {
  try {
    var r = JSON.parse(e.postData.contents);
    // Keep abuse small: cap field lengths.
    var cut = function (s, n) { return String(s == null ? '' : s).slice(0, n); };
    // A cell starting with = + - @ (or a tab/CR) would be run as a formula by Sheets: store it as plain text.
    var safe = function (s, n) { var v = cut(s, n); return /^[=+\-@\t\r]/.test(v) ? "'" + v : v; };
    if (!cut(r.message, 2000).trim()) throw new Error('empty message');
    var row = [
      new Date(), 'New', safe(r.page, 100), safe(r.module, 200), safe(r.questionNumber, 20), safe(r.questionId, 100),
      safe(r.message, 2000), safe(r.url, 500), safe(r.userAgent, 300)
    ];
    // One writer at a time: two first reports at once could both create the sheet/header,
    // and two writes could pick the same "next row".
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);   // throws if it can't get the lock in 10 s → {ok:false}
    try {
      var sh = sheet_();
      // setValues on a plain-text range stores strings exactly (appendRow would re-parse them).
      sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Visiting the URL in a browser shows this, so you can tell the deployment is live.
function doGet() {
  return ContentService.createTextOutput('SATLab report receiver is running.');
}
