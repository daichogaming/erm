/* ───────────────────────────────────────────────────────────
   "Report Question Issue" — adds a Report button to the top-right
   of every test screen and opens a small form.

   HOW IT WORKS
   • Every report is ALWAYS saved on this device (localStorage key
     'sat-reports') so nothing is lost while testing.
   • If REPORT_ENDPOINT is set below, the report is also POSTed there
     as JSON so your team can actually receive it.

   Payload sent:
   { page, module, questionNumber, questionId, message, url, userAgent, createdAt }
   ─────────────────────────────────────────────────────────── */
(function () {
  // Paste your Google Apps Script web-app URL here (see report-backend.gs for the 4-step setup).
  // Leave empty to keep reports on this device only (good for testing).
  var REPORT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxEr1AnFPKWoG-sdiQIyMp6DLCC6oZa4sqgtAnquxDWhL43-CEV8hrZcSxtmC152g/exec';
  var STORE_KEY = 'sat-reports';

  var css = '\
.rq-btn{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-ui,inherit);font-size:12px;font-weight:500;color:var(--gray-dark,#444);background:var(--card,#fff);border:1px solid var(--gray-border,#ddd);border-radius:999px;padding:6px 12px;cursor:pointer;white-space:nowrap;transition:all .15s}\
.rq-btn:hover{border-color:#e5383b;color:#e5383b}\
.rq-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}\
.rq-ov{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;background:rgba(8,14,30,.5);backdrop-filter:blur(4px);padding:1rem}\
.rq-ov.open{display:flex}\
.rq-box{width:100%;max-width:440px;background:var(--card,#fff);color:var(--black,#111);border-radius:20px;padding:1.5rem 1.5rem 1.25rem;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:var(--font-ui,inherit)}\
.rq-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.35rem}\
.rq-title{font-size:18px;font-weight:700;letter-spacing:-.01em}\
.rq-x{background:none;border:none;font-size:22px;line-height:1;color:var(--gray-mid,#777);cursor:pointer}\
.rq-ctx{font-size:12px;color:var(--gray-mid,#777);margin-bottom:1rem;font-family:"DM Mono",monospace}\
.rq-lbl{display:block;font-size:12px;color:var(--gray-mid,#777);margin:.75rem 0 .35rem}\
.rq-box textarea,.rq-box input{width:100%;box-sizing:border-box;border:1px solid var(--gray-border,#ddd);border-radius:12px;padding:10px 12px;font:14px var(--font-ui,inherit);background:var(--white,#fff);color:inherit}\
.rq-box textarea{min-height:100px;resize:vertical}\
.rq-box textarea:focus,.rq-box input:focus{outline:none;border-color:#1c5fd4;box-shadow:0 0 0 4px rgba(28,95,212,.12)}\
.rq-row{display:flex;gap:10px;margin-top:1.1rem}\
.rq-submit{flex:1;border:none;border-radius:999px;padding:11px 0;font:600 14px var(--font-ui,inherit);color:#fff;background:linear-gradient(135deg,#2f7bf0,#123f94);cursor:pointer}\
.rq-submit:disabled{opacity:.45;cursor:default}\
.rq-cancel{border:1px solid var(--gray-border,#ddd);background:none;border-radius:999px;padding:11px 20px;font:500 14px var(--font-ui,inherit);color:var(--gray-dark,#444);cursor:pointer}\
.rq-msg{font-size:13px;margin-top:.9rem;padding:9px 12px;border-radius:10px;display:none}\
.rq-msg.ok{display:block;background:rgba(31,138,76,.12);color:#1f8a4c}\
.rq-msg.err{display:block;background:rgba(209,73,59,.12);color:#d1493b}\
.rq-count{font-size:11px;color:var(--gray-mid,#777);text-align:right;margin-top:.3rem;font-family:"DM Mono",monospace}\
@media(max-width:600px){.rq-box textarea,.rq-box input{font-size:16px}}\
@media(max-width:420px){.rq-btn{padding:6px 8px;gap:0;font-size:0}.rq-btn svg{margin:0}}\
';

  var ICON = '<svg viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></svg>';

  function g(name) { try { return (0, eval)(name); } catch (e) { return undefined; } } // read page-level let/const

  function context(btn) {
    var bar = btn && btn.closest ? btn.closest('.top-bar') : null;
    var modEl = (bar && bar.querySelector('.top-bar-module, .tb-module')) || document.querySelector('.top-bar-module, .tb-module');
    var module = modEl ? modEl.textContent.trim() : document.title;
    var n, id = '';
    var cq = g('currentQ'), cu = g('cur');
    if (typeof cq === 'number') { n = cq + 1; var Q = g('QUESTIONS'); if (Q && Q[cq]) id = Q[cq].id || ''; }
    else if (typeof cu === 'number') { n = cu + 1; var S = g('QS'); if (S && S[cu]) id = S[cu].id || S[cu].num || ''; }
    if (window.SATReportContext) { try { var c = window.SATReportContext(); if ('questionNumber' in c) n = c.questionNumber; if ('questionId' in c) id = c.questionId; module = c.module || module; } catch (e) {} }
    return { page: location.pathname.split('/').pop() || 'index.html', module: module, questionNumber: n || null, questionId: String(id || '') };
  }

  var MAX_LEN = 2000;          // the backend keeps at most 2000 characters
  var SEND_TIMEOUT_MS = 10000;
  var ov, box, ta, ctxEl, msg, submit, count, cur, opener;
  var sending = false, done = false, sendSeq = 0, closeTimer = null;

  function updateSubmit() { submit.disabled = sending || done || !ta.value.trim(); }
  function updateCount() { count.textContent = ta.value.length + '/' + MAX_LEN; }

  function build() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    ov = document.createElement('div'); ov.className = 'rq-ov';
    ov.innerHTML =
      '<div class="rq-box" role="dialog" aria-modal="true" aria-labelledby="rq-t">' +
      '<div class="rq-head"><div class="rq-title" id="rq-t">Report Question Issue</div><button class="rq-x" aria-label="Close">×</button></div>' +
      '<div class="rq-ctx"></div>' +
      '<label class="rq-lbl" for="rq-ta">What is wrong with this question?</label>' +
      '<textarea id="rq-ta" maxlength="' + MAX_LEN + '" placeholder="Describe typos, wrong answers, unclear graphs, or any issues…"></textarea>' +
      '<div class="rq-count" aria-live="polite">0/' + MAX_LEN + '</div>' +
      '<div class="rq-msg"></div>' +
      '<div class="rq-row"><button class="rq-submit" disabled>Submit Report</button><button class="rq-cancel">Cancel</button></div></div>';
    document.body.appendChild(ov);
    box = ov.querySelector('.rq-box'); count = ov.querySelector('.rq-count');
    ta = ov.querySelector('textarea'); ctxEl = ov.querySelector('.rq-ctx');
    msg = ov.querySelector('.rq-msg'); submit = ov.querySelector('.rq-submit');
    ov.querySelector('.rq-x').onclick = ov.querySelector('.rq-cancel').onclick = close;
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) {
      if (!ov.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      // Keep Tab inside the dialog while it is open.
      var f = Array.prototype.filter.call(box.querySelectorAll('button, textarea, input, [href], [tabindex]:not([tabindex="-1"])'), function (el) { return !el.disabled && el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (e.shiftKey && (a === first || !box.contains(a))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (a === last || !box.contains(a))) { e.preventDefault(); first.focus(); }
    });
    ta.addEventListener('input', function () { updateSubmit(); updateCount(); });
    submit.onclick = send;
  }

  function open(btn) {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    sendSeq++;                 // any send still in flight is now stale: its result is ignored
    sending = false; done = false;
    if (!ov.classList.contains('open')) opener = btn || document.activeElement;
    cur = context(btn);
    ctxEl.textContent = cur.module + (cur.questionNumber ? ' · Question ' + cur.questionNumber : '');
    ta.value = ''; updateCount(); updateSubmit(); submit.textContent = 'Submit Report'; msg.className = 'rq-msg';
    ov.classList.add('open'); setTimeout(function () { ta.focus(); }, 30);
  }
  function close() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    if (!ov.classList.contains('open')) return;
    ov.classList.remove('open');
    var o = opener; opener = null;
    if (o && o.focus && document.contains(o)) { try { o.focus(); } catch (e) {} }
  }

  function saveLocal(r) {
    try { var a = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); a.push(r); localStorage.setItem(STORE_KEY, JSON.stringify(a)); return true; }
    catch (e) { return false; }
  }

  async function send() {
    if (sending || done) return;
    var r = {
      page: cur.page, module: cur.module, questionNumber: cur.questionNumber, questionId: cur.questionId,
      message: ta.value.trim().slice(0, MAX_LEN), url: location.href,
      userAgent: navigator.userAgent, createdAt: new Date().toISOString()
    };
    if (!r.message) return;
    var seq = ++sendSeq;
    sending = true; updateSubmit(); submit.textContent = 'Sending…'; msg.className = 'rq-msg';
    var saved = saveLocal(r), sent = false;   // always keep a copy on this device first
    if (REPORT_ENDPOINT) {
      var ctl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, SEND_TIMEOUT_MS);
      try {
        // text/plain avoids a CORS preflight, which Google Apps Script can't answer.
        // Sent once only: retrying could file the same report twice.
        var res = await fetch(REPORT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(r), signal: ctl ? ctl.signal : undefined });
        // The backend answers HTTP 200 with {ok:false} when it fails, so read the body.
        var body = null;
        try { body = await res.json(); } catch (e) { body = null; }
        sent = !!(res.ok && body && body.ok === true);
      } catch (e) { sent = false; }
      finally { clearTimeout(timer); }
    }
    if (seq !== sendSeq) return;   // the dialog was reopened or closed-and-reopened meanwhile
    sending = false;
    if (REPORT_ENDPOINT && !sent) {
      msg.className = 'rq-msg err';
      msg.textContent = saved ? "Couldn't reach the server — your report is saved on this device." : "Couldn't send your report. Please try again.";
      submit.textContent = 'Submit Report'; updateSubmit();
      return;
    }
    done = true; updateSubmit();
    msg.className = 'rq-msg ok';
    msg.textContent = REPORT_ENDPOINT ? 'Thanks — your report was sent.' : 'Thanks — report saved (test mode: stored on this device).';
    submit.textContent = 'Submitted';
    closeTimer = setTimeout(close, 1400);
  }

  // Adds a Report button to every top bar that lacks one. Safe to call again
  // after a page rewrites its top bar (fulltest.html review mode does).
  function addButtons() {
    var bars = document.querySelectorAll('.top-bar-right, .tb-right');
    bars.forEach(function (bar) {
      if (bar.querySelector('.rq-btn')) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rq-btn'; b.innerHTML = ICON + 'Report';
      b.setAttribute('aria-label', 'Report a problem with this question');
      b.title = 'Report a problem with this question';
      b.addEventListener('click', function () { open(b); });
      bar.insertBefore(b, bar.firstChild);
    });
  }

  function inject() {
    build();
    addButtons();
    window.SATReport = { refresh: addButtons, open: function () { open(document.querySelector('.rq-btn')); }, getAll: function () { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch (e) { return []; } }, clear: function () { try { localStorage.removeItem(STORE_KEY); } catch (e) {} } };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();
})();
