// math_render.js — shows a Math question as text (from math_text.js) instead of its image, used by math.html and
// fulltest.html. Math is LaTeX in \( \) / \[ \], typeset with KaTeX (loaded here, asynchronously, from katex/ on this site).
// A question falls back to its image (math_img/<page>.jpg) when it has no MATH_TEXT entry, while KaTeX is still
// loading, if KaTeX could not load, or if its text fails to typeset — so a student never sees raw LaTeX.
(function () {
  'use strict';
  var CDN = 'katex/'; // KaTeX 0.16.9, served from this site (katex/)
  var state = 'loading';          // 'loading' | 'ready' | 'failed'
  var subs = [], bad = {};        // bad[page]: text didn't typeset or a figure didn't load -> use the image

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function notify(page) { subs.forEach(function (fn) { try { fn(page); } catch (e) { console.warn('[math_render]', e); } }); }

  // ── KaTeX: stylesheet + script + auto-render, without blocking the page ──
  (function load() {
    var need = 3, failed = false;
    function done() { if (failed) return; if (--need === 0) { state = typeof window.renderMathInElement === 'function' ? 'ready' : 'failed'; notify(null); } }
    function fail() { if (failed) return; failed = true; state = 'failed'; notify(null); }
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = CDN + 'katex.min.css'; css.crossOrigin = 'anonymous';
    css.onload = done; css.onerror = fail;
    document.head.appendChild(css);
    ['katex.min.js', 'contrib/auto-render.min.js'].forEach(function (f) {
      var s = document.createElement('script');
      s.src = CDN + f; s.async = false; s.crossOrigin = 'anonymous'; // async=false: run in order, still never blocks parsing
      s.onload = done; s.onerror = fail;
      document.head.appendChild(s);
    });
  })();

  // ── Shared styles ──
  var style = document.createElement('style');
  style.textContent = [
    '.mt-stem{font-family:var(--ex-serif);font-size:17px;line-height:1.6;color:var(--ex-fg);margin:0 0 1.25rem;overflow-wrap:break-word}',
    '.mt-nw{white-space:nowrap}',
    '.mt-stem p{margin:0 0 .85em}.mt-stem p:last-child{margin-bottom:0}',
    '.mt-stem .katex,.mt-ch .katex{font-size:1.1em}',
    '.mt-stem .katex-display{margin:.55em 0;overflow-x:auto;overflow-y:hidden;padding:2px 0}',
    '.mt-fig{margin:1rem 0;text-align:center}',
    '.mt-fig img{display:inline-block;max-width:100%;height:auto;vertical-align:top;background:#fff;border:1px solid var(--ex-line);border-radius:4px;padding:4px}',
    ':root[data-theme="dark"] .mt-fig img,:root[data-theme="dark"] .mt-ch-fig img{filter:brightness(.93)}',
    '.mt-tbl{max-width:100%;overflow-x:auto;margin:1rem 0;text-align:center}',
    '.mt-table{display:inline-table;border-collapse:collapse;font-family:var(--ex-serif);font-size:16px;color:var(--ex-fg)}',
    '.mt-table caption{font-weight:600;padding-bottom:.4rem}',
    '.mt-table th,.mt-table td{border:1px solid var(--ex-choice-border,#999);padding:5px 16px;text-align:center;vertical-align:middle}',
    '.mt-table th{background:var(--ex-band);font-weight:600}',
    '.exam .answer-text.mt-ch{flex:1 1 auto;min-width:0;overflow-x:auto;overflow-y:hidden}',
    '.mt-ch .katex-display{margin:0;text-align:left}.mt-ch .katex-display>.katex{text-align:left}',
    '.mt-ch .mt-tbl{margin:0;text-align:left}.mt-ch .mt-table{font-size:15px}.mt-ch .mt-table th,.mt-ch .mt-table td{padding:2px 12px}',
    '.mt-ch-fig img{display:block;max-width:100%;height:auto;background:#fff;border-radius:4px}',
    '.mt-orig{display:inline-block;margin:.9rem 0 0;padding:0;background:none;border:none;font-family:var(--ex-ui);font-size:12.5px;color:var(--ex-muted);text-decoration:underline;text-underline-offset:2px;cursor:pointer}',
    '.mt-orig:hover{color:var(--ex-fg)}',
    '.mt-ov{position:fixed;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,.55)}',
    '.mt-ov-box{background:var(--ex-bg,#fff);color:var(--ex-fg,#111);border-radius:10px;max-width:880px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.35)}',
    '.mt-ov-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.7rem 1rem;border-bottom:1px solid var(--ex-line,#ddd);font-family:var(--ex-ui);font-size:14px;font-weight:700}',
    '.mt-ov-x{border:1.5px solid var(--ex-line,#ccc);background:none;color:inherit;border-radius:999px;padding:3px 14px;font:inherit;font-weight:600;cursor:pointer}',
    '.mt-ov-img{overflow:auto;background:#fff;-webkit-overflow-scrolling:touch}',
    '.mt-ov-img img{display:block;width:100%;min-width:600px;height:auto}'
  ].join('\n');
  document.head.appendChild(style);

  // ── Building the HTML (all text escaped; KaTeX later reads the delimiters from the text nodes) ──
  var FIG_SRC = /^math_fig\/[\w.-]+\.(jpe?g|png|webp|gif|svg)$/i;

  function cellsRow(row, tag) {
    return '<tr>' + (row || []).map(function (c) { return '<' + tag + '>' + inlineText(c) + '</' + tag + '>'; }).join('') + '</tr>';
  }
  function tableHTML(t) {
    if (!t || !Array.isArray(t.rows)) return '';
    var rows = t.rows.slice(), head = '';
    if (t.header && rows.length) head = '<thead>' + cellsRow(rows.shift(), 'th') + '</thead>';
    return '<div class="mt-tbl"><table class="mt-table">' + (t.title ? '<caption>' + inlineText(t.title) + '</caption>' : '') +
      head + '<tbody>' + rows.map(function (r) { return cellsRow(r, 'td'); }).join('') + '</tbody></table></div>';
  }
  function figHTML(f, page, cls) {
    return '<div class="' + cls + '"><img src="' + esc(f.src) + '" alt="' + esc(f.alt || 'Figure') + '" data-mt-page="' + esc(page) +
      '" onerror="MathText.figFailed(this)" /></div>';
  }
  // Plain text (never math): escape, then __word__ -> underline and **word** -> bold (same line; the inner text must
  // start and end with a non-space, non-marker character, so a fill-in blank like "______" stays as it is),
  // and a single newline becomes a line break.
  function plain(t) {
    return esc(t)
      .replace(/(^|[^_])__([^_\s](?:[^\n]*?[^_\s])?)__(?!_)/g, '$1<u>$2</u>')
      .replace(/(^|[^*])\*\*([^*\s](?:[^\n]*?[^*\s])?)\*\*(?!\*)/g, '$1<b>$2</b>')
      .replace(/\n/g, '<br>');
  }
  // Text with inline math; math spans are only escaped.
  var MATH = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/;
  // A displayed formula followed directly by punctuation ("\\[ … \\]?") would leave the "?" alone on the next line:
  // move the punctuation inside the formula, after it, as text.
  function tuckPunct(s) {
    return String(s == null ? '' : s).replace(/\\\[([\s\S]*?)\\\][ \t]*([.,;:?!]+)(?=\s|$)/g, function (m, tex, pu) {
      return '\\[' + tex.replace(/\s+$/, '') + '\\,\\text{' + pu + '} \\]';
    });
  }
  function inlineText(s) {
    return tuckPunct(s).split(MATH).map(function (seg, k) { return k % 2 ? esc(seg) : plain(seg); }).join('');
  }

  function stemHTML(e, page) {
    var out = [], para = [], used = {};
    function flush() {
      var h = para.join('').replace(/^(\s|<br>)+|(\s|<br>)+$/g, '');
      if (h) out.push('<p>' + h + '</p>');
      para = [];
    }
    function block(name) {
      if (name === 'table') return e.table ? tableHTML(e.table) : '';
      var f = (e.figs || [])[parseInt(name.slice(3), 10) - 1];
      return f ? figHTML(f, page, 'mt-fig') : '';
    }
    tuckPunct(e.stem || '').split(MATH).forEach(function (seg, k) {
      if (k % 2) { para.push(esc(seg)); return; }
      seg.split(/(\[\[(?:table|fig\d+)\]\]|\n\s*\n)/).forEach(function (t) {
        if (!t) return;
        var mk = /^\[\[(table|fig\d+)\]\]$/.exec(t);
        if (mk) { flush(); out.push(block(mk[1])); used[mk[1]] = 1; }
        else if (/^\n\s*\n$/.test(t)) flush();
        else para.push(plain(t));
      });
    });
    flush();
    if (e.table && !used.table) out.push(tableHTML(e.table));
    (e.figs || []).forEach(function (f, k) { if (!used['fig' + (k + 1)]) out.push(figHTML(f, page, 'mt-fig')); });
    return out.join('');
  }

  function choiceHTML(c, page) {
    if (c && typeof c === 'object') {
      if (c.fig) return figHTML({ src: c.fig, alt: c.alt }, page, 'mt-ch-fig');
      if (c.table) return tableHTML(c.table);
      return '';
    }
    return inlineText(c);
  }

  // Is this entry safe to show as text? (figures only from math_fig/, the right number of choices)
  function valid(e, q) {
    if (!e || typeof e.stem !== 'string') return false;
    if ((e.figs || []).some(function (f) { return !f || !FIG_SRC.test(f.src || ''); })) return false;
    if (q.is_mc) {
      if (!Array.isArray(e.choices) || e.choices.length !== 4) return false;
      if (e.choices.some(function (c) { return c == null || (typeof c === 'object' && !(c.fig ? FIG_SRC.test(c.fig) : c.table && Array.isArray(c.table.rows))); })) return false;
    }
    return true;
  }

  function entry(q) {
    if (!q || q.question || q.page == null || typeof MATH_TEXT === 'undefined') return null;
    var p = String(q.page), e = Object.prototype.hasOwnProperty.call(MATH_TEXT, p) ? MATH_TEXT[p] : null;
    return e && !bad[p] && valid(e, q) ? e : null;
  }

  // Text nodes outside KaTeX output that still hold a delimiter = something didn't typeset.
  function leftover(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) {
      if (n.parentElement && n.parentElement.closest('.katex')) continue;
      if (/\\[()[\]]/.test(n.nodeValue)) return true;
    }
    return false;
  }

  // Keep inline math together with the characters touching it ("\\(x\\)-intercept", "\\(y\\)?"), so a line never
  // starts with the hyphen or the punctuation: wrap them in one no-wrap span (chained math joins the same span).
  function glue(el) {
    var ks = el.querySelectorAll('.katex');
    for (var i = 0; i < ks.length; i++) {
      var k = ks[i];
      if (k.parentElement.closest('.katex, .katex-display')) continue;
      // auto-render puts each formula in its own plain <span>: that wrapper is the unit to glue
      if (k.parentNode.nodeName === 'SPAN' && !k.parentNode.className && k.parentNode.childNodes.length === 1) k = k.parentNode;
      var prev = k.previousSibling, next = k.nextSibling, pre = '', post = '', m;
      if (prev && prev.nodeType === 3 && (m = /\S+$/.exec(prev.nodeValue))) pre = m[0];
      if (next && next.nodeType === 3 && (m = /^\S+/.exec(next.nodeValue))) post = m[0];
      var join = !pre && prev && prev.nodeType === 1 && prev.classList.contains('mt-nw');
      if (!pre && !post && !join) continue;
      var span = join ? prev : document.createElement('span');
      if (!join) {
        span.className = 'mt-nw';
        k.parentNode.insertBefore(span, k);
        if (pre) { prev.nodeValue = prev.nodeValue.slice(0, -pre.length); span.appendChild(document.createTextNode(pre)); }
      }
      span.appendChild(k);
      if (post) { next.nodeValue = next.nodeValue.slice(post.length); span.appendChild(document.createTextNode(post)); }
    }
  }

  var ov = null, ovReturn = null;
  function closeOriginal() {
    if (!ov) return;
    ov.remove(); ov = null;
    if (ovReturn && ovReturn.focus) ovReturn.focus();
  }
  document.addEventListener('keydown', function (ev) {
    if (ov && ev.key === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); closeOriginal(); }
  }, true);

  window.MathText = {
    get status() { return state; },
    // The text entry for a question (whether or not KaTeX is ready), or null.
    entry: entry,
    // The entry to render now: only once KaTeX is ready.
    use: function (q) { return state === 'ready' ? entry(q) : null; },
    // fn(page): page = null when KaTeX finished loading/failed, else the page that just fell back to its image.
    onChange: function (fn) { subs.push(fn); },
    stemHTML: function (e, page) { return stemHTML(e, page); },
    choiceHTML: function (c, page) { return choiceHTML(c, page); },
    origHTML: function (q) {
      return '<button type="button" class="mt-orig" onclick="MathText.openOriginal(' + esc(JSON.stringify('math_img/' + q.page + '.jpg')) + ',this)">View original</button>';
    },
    // Typeset the text parts inside root. False (and the page is marked to use its image) if anything failed.
    typeset: function (root, page) {
      var els = root.querySelectorAll('.mt-stem, .mt-ch'), ok = true;
      try {
        for (var k = 0; k < els.length; k++) {
          window.renderMathInElement(els[k], {
            delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
            throwOnError: false
          });
          if (els[k].querySelector('.katex-error') || leftover(els[k])) ok = false;
          else glue(els[k]);
        }
      } catch (e) { ok = false; }
      if (!ok) { bad[String(page)] = 1; console.warn('[math_render] page ' + page + ' did not typeset; showing its image'); }
      return ok;
    },
    figFailed: function (img) {
      var p = img.getAttribute('data-mt-page');
      if (p == null || bad[p]) return;
      bad[p] = 1; console.warn('[math_render] figure failed for page ' + p + '; showing its image');
      notify(p);
    },
    openOriginal: function (src, from) {
      closeOriginal();
      ovReturn = from || document.activeElement;
      ov = document.createElement('div');
      ov.className = 'mt-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Original question');
      ov.innerHTML = '<div class="mt-ov-box"><div class="mt-ov-head"><span>Original question</span><button type="button" class="mt-ov-x">Close</button></div>' +
        '<div class="mt-ov-img"><img src="' + esc(src) + '" alt="Original question image" /></div></div>';
      ov.addEventListener('click', function (ev) { if (ev.target === ov || ev.target.closest('.mt-ov-x')) closeOriginal(); });
      document.body.appendChild(ov);
      ov.querySelector('.mt-ov-x').focus();
    },
    closeOriginal: closeOriginal
  };
})();
