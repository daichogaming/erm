// coach.js: the "Before you start" screen, stars, Pace Coach, time per question and the Post-Game Analysis.
// Shared by the test pages (test.html, math.html, drill.html). Each page:
//   Coach.setup({ kind, title, detail, count, totalSecs, canPause, canCheck, current, onStart })
//       current() returns the question index on screen (keeps the Pace Coach chip in step);
//       shows the screen; onStart(settings) runs when the student presses Start (start the clock there).
//   Coach.settings            { pause, check, pace } once started (all false before)
//   Coach.tick(i, running)    call every second; i = question on screen, running = clock is counting.
//   Coach.onBudgetEnd = i => { … }   Pace Coach ran out on question i: flag it and move on.
//   Coach.times               seconds spent on each question (counted only while the tab is visible).
//   Coach.analysisHTML(items) items = [{ num, skill, domain, status:'correct'|'incorrect'|'unanswered' }]
//   Coach.record()            { stars, settings, times } to save with the result.
// Stars (like a chess.com bot rating): everyone starts at 3; Stop timer −1, Check answer −1, Pace Coach +1.
(function () {
  'use strict';
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.87l-5.5 2.88 1.05-6.12L3.1 9.3l6.15-.9z"/></svg>';
  var NOTES = {
    4: 'Test conditions plus pacing. The honest way to drill.',
    3: 'Test conditions. Your score means what it says.',
    2: 'A little help. Fine for practice, less for measuring.',
    1: 'Practice mode. Good for learning, not for measuring.'
  };
  var OPTS = [
    { key: 'pause', name: 'Stop timer', desc: 'Lets you pause the clock.', delta: -1 },
    { key: 'check', name: 'Check answer', desc: 'See if each answer is right as you go.', delta: -1 },
    { key: 'pace', name: 'Pace Coach', desc: 'Gives each question a time budget. When it runs out, the question is marked for review and you move on.', delta: +1 }
  ];

  var C = window.Coach = {
    settings: { pause: false, check: false, pace: false },
    started: false,
    times: [],
    budget: 0,
    onBudgetEnd: null
  };
  var cfg = null, paceUsed = [], paceDone = [], chip = null, lastI = -1;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function secs(s) { s = Math.round(s); return s < 60 ? s + 's' : fmt(s); }
  function load(kind) { try { return JSON.parse(localStorage.getItem('sat-coach-' + kind) || 'null'); } catch (e) { return null; } }
  function save(kind, v) { try { localStorage.setItem('sat-coach-' + kind, JSON.stringify(v)); } catch (e) {} }

  C.stars = function (s) {
    s = s || C.settings;
    return 3 - (s.pause ? 1 : 0) - (s.check ? 1 : 0) + (s.pace ? 1 : 0);
  };
  C.starsHTML = function (n, cls) {
    var h = '';
    for (var i = 1; i <= 4; i++) h += '<span class="ch-star' + (i <= n ? ' is-on' : '') + (i === 4 ? ' is-bonus' : '') + '">' + STAR + '</span>';
    return '<span class="ch-stars ' + (cls || '') + '" role="img" aria-label="' + n + ' of 3 stars' + (n > 3 ? ' plus a bonus star' : '') + '">' + h + '</span>';
  };

  // ── Styles (scoped to the exam pages' tokens) ──────────────────
  var css = '' +
    '.ch-ov{position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,14,30,.55);backdrop-filter:blur(6px)}' +
    '.ch-box{width:100%;max-width:520px;max-height:calc(100vh - 32px);overflow:auto;background:var(--ex-pop-bg,#FDFAF4);color:var(--ex-fg,#1d1d1f);border-radius:16px;box-shadow:var(--ex-shadow);padding:28px 28px 24px;font-family:var(--ex-ui)}' +
    '.ch-kicker{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ex-muted)}' +
    '.ch-title{margin:4px 0 2px;font:600 26px/1.2 var(--ex-serif);letter-spacing:-.01em}' +
    '.ch-detail{font-size:14px;color:var(--ex-muted)}' +
    '.ch-rating{display:flex;align-items:center;gap:14px;margin:20px 0 6px;padding:14px 16px;border-radius:12px;background:var(--ex-band,#F0E9DC)}' +
    '.ch-stars{display:inline-flex;gap:3px}.ch-star svg{width:26px;height:26px;fill:none;stroke:var(--ex-muted);stroke-width:1.6;stroke-linejoin:round;transition:fill .2s,stroke .2s,transform .2s}' +
    '.ch-star.is-bonus svg{stroke-dasharray:2.5 2.2}' +
    '.ch-star.is-on svg{fill:#E8A317;stroke:#B97C00;stroke-dasharray:none}' +
    '.ch-stars.sm .ch-star svg{width:18px;height:18px}' +
    '.ch-note{font-size:14px;line-height:1.4}' +
    '.ch-opts{list-style:none;margin:14px 0 0;padding:0}' +
    '.ch-opt{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 14px;align-items:center;padding:12px 2px;border-top:1px solid var(--ex-line)}' +
    '.ch-opt:last-child{border-bottom:1px solid var(--ex-line)}' +
    '.ch-opt-name{font-weight:600;font-size:15px}.ch-opt-desc{grid-column:1;font-size:13px;line-height:1.45;color:var(--ex-muted)}' +
    '.ch-delta{font-size:12px;font-weight:700;margin-left:6px;padding:1px 7px;border-radius:999px;vertical-align:1px}' +
    '.ch-delta.minus{color:var(--ex-incorrect);background:var(--ex-incorrect-soft)}.ch-delta.plus{color:var(--ex-correct);background:var(--ex-correct-soft)}' +
    '.ch-switch{grid-column:2;grid-row:1/span 2;position:relative;width:46px;height:26px;border-radius:999px;border:0;background:var(--ex-line);cursor:pointer;transition:background .15s;padding:0}' +
    '.ch-switch::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .15s}' +
    '.ch-switch[aria-checked="true"]{background:var(--ex-blue)}.ch-switch[aria-checked="true"]::after{transform:translateX(20px)}' +
    '.ch-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px}' +
    '.ch-small{font-size:12.5px;color:var(--ex-muted);line-height:1.4}' +
    '.ch-start{flex-shrink:0;font:600 15px var(--ex-ui);color:#fff;background:var(--ex-blue);border:0;border-radius:999px;padding:11px 28px;cursor:pointer}' +
    '.ch-start:hover{background:var(--ex-blue-hover)}' +
    '.ch-hrow{display:flex;align-items:center;gap:6px}' +
    '.ch-pace{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.5;padding:1px 9px;border-radius:999px;color:var(--ex-blue);background:var(--ex-blue-soft);border:1.5px solid transparent}' +
    '.ch-pace svg{width:12px;height:12px}' +
    '.ch-pace.is-low{color:#8a5200;background:#fdf0da}.ch-pace.is-over{color:var(--ex-muted);background:transparent;border-color:var(--ex-line)}' +
    ':root[data-theme="dark"] .ch-pace.is-low{color:#FFB84D;background:#3A2A10}' +
    '.ch-an{margin:22px 0 4px;text-align:left}' +
    '.ch-an h3{font:600 17px/1.3 var(--ex-serif);margin:18px 0 8px}' +
    '.ch-an-sum{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;font-size:14px;padding:12px 14px;border-radius:10px;background:var(--ex-band)}' +
    '.ch-an-sum b{font-variant-numeric:tabular-nums}' +
    '.ch-slow{list-style:none;margin:0;padding:0}' +
    '.ch-slow li{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:8px 6px;border-bottom:1px solid var(--ex-line);font-size:13.5px;cursor:pointer;border-radius:6px}' +
    '.ch-slow li:hover{background:var(--ex-band)}' +
    '.ch-slow .n{font-weight:700}.ch-slow .sk{color:var(--ex-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.ch-slow .t{font-weight:700;font-variant-numeric:tabular-nums}.ch-slow .t.over{color:var(--ex-incorrect)}' +
    '.ch-res{font-size:12px;font-weight:600}.ch-res.correct{color:var(--ex-correct)}.ch-res.incorrect{color:var(--ex-incorrect)}.ch-res.unanswered{color:var(--ex-muted)}' +
    '.ch-weak{display:grid;gap:8px}' +
    '.ch-weak a{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:center;padding:10px 14px;border:1px solid var(--ex-line);border-radius:10px;color:inherit;text-decoration:none}' +
    '.ch-weak a:hover{border-color:var(--ex-blue)}' +
    '.ch-weak .w-name{font-weight:600;font-size:14px}.ch-weak .w-why{grid-column:1;font-size:12.5px;color:var(--ex-muted)}' +
    '.ch-weak .w-go{grid-column:2;grid-row:1/span 2;font-size:13px;font-weight:600;color:var(--ex-blue)}' +
    '.ch-an-rated{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ex-muted);margin-top:12px}' +
    '.ex-menu [hidden]{display:none!important}' +
    '@media (max-width:560px){.ch-box{padding:22px 18px 18px}.ch-title{font-size:22px}.ch-foot{flex-direction:column;align-items:stretch}.ch-start{width:100%}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ── The "Before you start" screen ──────────────────────────────
  C.setup = function (o) {
    cfg = o;
    C.times = new Array(o.count).fill(0);
    paceUsed = new Array(o.count).fill(0);
    paceDone = new Array(o.count).fill(false);
    C.budget = o.count ? o.totalSecs / o.count : 0;
    var opts = OPTS.filter(function (x) { return (x.key !== 'pause' || o.canPause !== false) && (x.key !== 'check' || o.canCheck !== false); });
    var prev = load(o.kind) || {};
    var choice = {};
    opts.forEach(function (x) { choice[x.key] = !!prev[x.key]; });

    var ov = document.createElement('div');
    ov.className = 'ch-ov'; ov.id = 'coach-setup';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'ch-title');
    ov.innerHTML = '<div class="ch-box">' +
      '<div class="ch-kicker">Before you start</div>' +
      '<h2 class="ch-title" id="ch-title">' + esc(o.title) + '</h2>' +
      '<div class="ch-detail">' + esc(o.detail) + '</div>' +
      '<div class="ch-rating"><span id="ch-stars"></span><span class="ch-note" id="ch-note" aria-live="polite"></span></div>' +
      '<ul class="ch-opts">' + opts.map(function (x) {
        return '<li class="ch-opt"><span class="ch-opt-name" id="ch-l-' + x.key + '">' + x.name +
          '<span class="ch-delta ' + (x.delta < 0 ? 'minus' : 'plus') + '">' + (x.delta < 0 ? '−1' : '+1') + ' ★</span></span>' +
          '<span class="ch-opt-desc">' + (x.key === 'pace' ? 'About ' + secs(C.budget) + ' per question. ' : '') + x.desc + '</span>' +
          '<button type="button" class="ch-switch" role="switch" data-k="' + x.key + '" aria-labelledby="ch-l-' + x.key + '" aria-checked="' + choice[x.key] + '"></button></li>';
      }).join('') + '</ul>' +
      '<div class="ch-foot"><span class="ch-small">Stars are just for you. Everyone starts with 3. Your choices stay fixed once you start.</span>' +
      '<button type="button" class="ch-start" id="ch-start">Start</button></div></div>';
    document.body.appendChild(ov);

    function paint() {
      var n = C.stars(choice);
      ov.querySelector('#ch-stars').innerHTML = C.starsHTML(n);
      ov.querySelector('#ch-note').textContent = NOTES[n] || '';
    }
    ov.querySelectorAll('.ch-switch').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-k'); choice[k] = !choice[k];
        b.setAttribute('aria-checked', String(choice[k])); paint();
      });
    });
    // Keep keyboard focus inside the screen.
    ov.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = ov.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    ov.querySelector('#ch-start').addEventListener('click', function () {
      C.settings = { pause: !!choice.pause, check: !!choice.check, pace: !!choice.pace };
      save(o.kind, C.settings);
      C.started = true;
      ov.remove();
      mountChip();
      if (o.onStart) o.onStart(C.settings);
    });
    paint();
    setTimeout(function () { var s = ov.querySelector('#ch-start'); if (s) s.focus(); }, 0);
  };

  // ── Pace Coach chip, next to the timer's Hide button ───────────
  function mountChip() {
    if (!C.settings.pace) return;
    var center = document.querySelector('.ex-h-center');
    var pill = center && center.querySelector('.ex-pill');
    if (!center) return;
    var row = document.createElement('div'); row.className = 'ch-hrow';
    if (pill) { center.insertBefore(row, pill); row.appendChild(pill); } else center.appendChild(row);
    chip = document.createElement('span'); chip.className = 'ch-pace'; chip.id = 'coach-pace';
    chip.setAttribute('title', 'Pace Coach: time left for this question');
    row.appendChild(chip);
    paintChip(0);
    // Follow the question on screen right away (not only on the next clock tick).
    if (cfg.current) setInterval(function () { var j = cfg.current(); if (j != null && j !== lastI) { lastI = j; paintChip(j); } }, 200);
  }
  function paintChip(i) {
    if (!chip) return;
    var left = C.budget - (paceUsed[i] || 0);
    var over = paceDone[i];
    chip.className = 'ch-pace' + (over ? ' is-over' : left <= 15 ? ' is-low' : '');
    chip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/></svg>' +
      (over ? 'Over time' : fmt(left));
    chip.setAttribute('aria-label', over ? 'Pace Coach: this question is over its time' : 'Pace Coach: ' + fmt(left) + ' left for this question');
  }

  C.tick = function (i, running) {
    if (!C.started || i == null || i < 0 || i >= C.times.length) return;
    if (i !== lastI) { lastI = i; paintChip(i); }
    if (!running) return;
    if (document.visibilityState === 'visible') C.times[i]++;
    if (!C.settings.pace || paceDone[i]) return;
    paceUsed[i]++;
    if (paceUsed[i] >= C.budget) {
      paceDone[i] = true; paintChip(i);
      if (typeof C.onBudgetEnd === 'function') C.onBudgetEnd(i);
      if (cfg.current) { lastI = cfg.current(); paintChip(lastI); }
    } else paintChip(i);
  };
  C.stop = function () { if (chip) chip.parentNode && (chip.hidden = true); };

  C.record = function () {
    return { stars: C.stars(), settings: { pause: C.settings.pause, check: C.settings.check, pace: C.settings.pace }, times: C.times.slice() };
  };

  // ── Post-Game Analysis ─────────────────────────────────────────
  var RW_SLUG = {
    'Central Ideas and Details': 'central-ideas-and-details', 'Command of Evidence': 'command-of-evidence',
    'Inferences': 'inferences', 'Words in Context': 'words-in-context', 'Text Structure and Purpose': 'text-structure-and-purpose',
    'Cross-Text Connections': 'cross-text-connections', 'Rhetorical Synthesis': 'rhetorical-synthesis', 'Transitions': 'transitions',
    'Boundaries': 'boundaries', 'Form, Structure, and Sense': 'form-structure-and-sense'
  };
  function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  C.drillLink = function (skill, isMath) {
    if (!skill) return null;
    if (!isMath && RW_SLUG[skill]) return 'drill.html?' + new URLSearchParams({ topic: RW_SLUG[skill], label: skill, module: '1' });
    if (isMath) return 'math.html?' + new URLSearchParams({ test: 'drill', topic: slugify(skill), label: skill, module: '1' });
    return null;
  };

  // items: [{ num, skill, domain, status }]; opts: { math, goTo(i) name of a global function to jump to question i }
  C.analysisHTML = function (items, opts) {
    opts = opts || {};
    var t = C.times, total = 0, n = 0;
    items.forEach(function (_, i) { if (t[i]) { total += t[i]; n++; } }); // average over the questions you actually spent time on
    if (!n || !total) return '';
    var avg = total / n, target = C.budget;
    var slow = items.map(function (it, i) { return { it: it, i: i, s: t[i] || 0 }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, Math.min(5, Math.max(3, Math.round(n / 5))));
    var by = {};
    items.forEach(function (it, i) {
      var k = it.skill || it.domain; if (!k) return;
      var g = by[k] = by[k] || { skill: it.skill, name: k, wrong: 0, n: 0, s: 0 };
      g.n++; g.s += t[i] || 0; if (it.status !== 'correct') g.wrong++;
    });
    var weak = Object.keys(by).map(function (k) { var g = by[k]; g.avg = g.s / g.n; return g; })
      .filter(function (g) { return g.wrong > 0 || g.avg > target * 1.25; })
      .sort(function (a, b) { return b.wrong - a.wrong || b.avg - a.avg; }).slice(0, 3);
    var go = opts.goTo || 'goToQuestion';
    var close = opts.close || '';
    var verdict = avg > target * 1.1 ? 'slower than test pace' : avg < target * 0.6 ? 'well ahead of test pace' : 'on test pace';

    var h = '<section class="ch-an" aria-label="Post-game analysis">' +
      '<h3>Where your time went</h3>' +
      '<div class="ch-an-sum"><span>Average <b>' + secs(avg) + '</b> per question</span><span>Test pace <b>' + secs(target) + '</b></span><span>You were ' + verdict + '.</span></div>';
    if (slow.length) {
      h += '<h3>Slowest questions</h3><ul class="ch-slow">' + slow.map(function (x) {
        var st = x.it.status || 'unanswered';
        return '<li tabindex="0" role="button" onclick="' + close + go + '(' + x.i + ')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();this.click()}">' +
          '<span class="n">Q' + x.it.num + '</span><span class="sk">' + esc(x.it.skill || x.it.domain || '') + '</span>' +
          '<span class="t' + (x.s > target ? ' over' : '') + '">' + secs(x.s) + '</span>' +
          '<span class="ch-res ' + st + '">' + (st === 'correct' ? 'Correct' : st === 'incorrect' ? 'Incorrect' : 'Skipped') + '</span></li>';
      }).join('') + '</ul>';
    }
    if (weak.length && opts.weak !== false) {
      h += '<h3>Weak spots</h3><div class="ch-weak">' + weak.map(function (g) {
        var url = C.drillLink(g.skill, opts.math);
        var why = (g.wrong ? g.wrong + ' of ' + g.n + ' missed' : 'all right') + ' · ' + secs(g.avg) + ' avg' + (g.avg > target ? ', over pace' : '');
        var inner = '<span class="w-name">' + esc(g.name) + '</span><span class="w-why">' + why + '</span>';
        return url ? '<a href="' + esc(url) + '">' + inner + '<span class="w-go">Drill this skill →</span></a>'
          : '<a href="index.html#drills">' + inner + '<span class="w-go">Topical Drills →</span></a>';
      }).join('') + '</div>';
    }
    h += '<div class="ch-an-rated">' + C.starsHTML(C.stars(), 'sm') + '<span>' + (C.stars()) + '-star run' +
      (C.settings.pace ? ' · Pace Coach on' : '') + (C.settings.pause ? ' · Stop timer on' : '') + (C.settings.check ? ' · Check answer on' : '') + '</span></div>';
    return h + '</section>';
  };
})();
