/* exam.js — shared behaviour for the exam-style test screen (see exam.css).
   Used by test.html; drill.html, math.html and fulltest.html can adopt it the same way.

   What it gives a page (all optional, nothing runs until called):
   • Exam.initPopovers()      — any button with data-ex-pop="<id>" opens/closes the element with that id
                                (a menu or panel with the `hidden` attribute). One open at a time; closes
                                on an outside click or Escape and gives focus back to its button.
   • Exam.closePopovers()     — close whatever is open.
   • Exam.initDivider(div, left, container) — drag (mouse, touch or arrow keys) to resize the two panes.
                                The left pane's share is kept as a percentage, so it survives window resizes.
   • Exam.studentName()       — the part of the logged-in email before "@" (auth.js), else "Student".
   • Exam.renderNavGrid(el, items, current, onPick) — the numbered question boxes of the navigator.
   • Exam.icon.<name>         — the small inline SVG icons the layout uses (own drawings, no copied assets).
   • Exam.fillIcons(root)     — fills every <span class="ex-ico" data-icon="name"> with that icon (done on load).
*/
(function () {
  var S = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
  var icon = {
    chevDown: '<svg ' + S + ' fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    chevUp: '<svg ' + S + ' fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    pen: '<svg ' + S + ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/><path d="M14 20h6"/></svg>',
    more: '<svg ' + S + ' fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    bookmark: '<svg ' + S + ' fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
    bookmarkFill: '<svg ' + S + ' fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
    pin: '<svg ' + S + ' fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>',
    clock: '<svg ' + S + ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pause: '<svg ' + S + ' fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    flag: '<svg ' + S + ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
    exit: '<svg ' + S + ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/></svg>',
    close: '<svg ' + S + ' fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  // ── Popovers / menus ──────────────────────────────────────────
  var openBtn = null, openEl = null;
  function closePopovers(refocus) {
    if (!openEl) return;
    openEl.hidden = true;
    if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); openBtn.classList.remove('is-open'); }
    var b = openBtn; openBtn = openEl = null;
    if (refocus && b) { try { b.focus(); } catch (e) {} }
  }
  function openPopover(btn, el) {
    closePopovers(false);
    el.hidden = false; openBtn = btn; openEl = el;
    btn.setAttribute('aria-expanded', 'true'); btn.classList.add('is-open');
    var first = el.querySelector('[data-ex-autofocus], [role="menuitem"]');
    if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 0);
  }
  function initPopovers(root) {
    (root || document).querySelectorAll('[data-ex-pop]').forEach(function (btn) {
      if (btn._exPop) return; btn._exPop = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var el = document.getElementById(btn.getAttribute('data-ex-pop'));
        if (!el) return;
        if (openEl === el) closePopovers(false); else openPopover(btn, el);
      });
    });
    if (initPopovers._done) return; initPopovers._done = true;
    document.addEventListener('mousedown', function (e) {
      if (openEl && !openEl.contains(e.target) && !(openBtn && openBtn.contains(e.target))) closePopovers(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!openEl) return;
      if (e.key === 'Escape') { e.preventDefault(); closePopovers(true); return; }
      // Up/Down move between the items of a menu.
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && openEl.getAttribute('role') === 'menu') {
        var items = Array.prototype.filter.call(openEl.querySelectorAll('[role="menuitem"]'), function (x) { return !x.disabled; });
        var k = items.indexOf(document.activeElement);
        k = e.key === 'ArrowDown' ? (k + 1) % items.length : (k - 1 + items.length) % items.length;
        if (items[k]) { e.preventDefault(); items[k].focus(); }
      }
    });
    // Choosing a menu item closes the menu.
    document.addEventListener('click', function (e) {
      var it = e.target.closest && e.target.closest('[role="menuitem"]');
      if (it && openEl && openEl.contains(it)) closePopovers(false);
    });
  }

  // ── Resizable two-pane split ──────────────────────────────────
  function initDivider(divider, left, container, opts) {
    opts = opts || {};
    var minL = opts.minLeft || 260, minR = opts.minRight || 320;
    var dragging = false;
    function setPct(p) {
      var w = container.getBoundingClientRect().width || 1;
      var lo = Math.min(50, minL / w * 100), hi = Math.max(50, 100 - minR / w * 100);
      p = Math.max(lo, Math.min(hi, p));
      container.style.setProperty('--ex-split', p.toFixed(2) + '%');
      divider.setAttribute('aria-valuenow', Math.round(p));
    }
    function pctAt(x) { var r = container.getBoundingClientRect(); return (x - r.left) / r.width * 100; }
    function cur() { var r = container.getBoundingClientRect(); return left.getBoundingClientRect().width / r.width * 100; }
    function start(e) { dragging = true; divider.classList.add('dragging'); document.body.classList.add('ex-resizing'); if (e.cancelable) e.preventDefault(); }
    function move(x) { if (dragging) setPct(pctAt(x)); }
    function end() { if (!dragging) return; dragging = false; divider.classList.remove('dragging'); document.body.classList.remove('ex-resizing'); }
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-orientation', 'vertical');
    divider.setAttribute('aria-label', 'Resize the passage and question panes');
    divider.setAttribute('aria-valuemin', '0'); divider.setAttribute('aria-valuemax', '100'); divider.setAttribute('aria-valuenow', '50');
    if (!divider.hasAttribute('tabindex')) divider.tabIndex = 0;
    divider.addEventListener('mousedown', start);
    document.addEventListener('mousemove', function (e) { move(e.clientX); });
    document.addEventListener('mouseup', end);
    divider.addEventListener('touchstart', start, { passive: false });
    document.addEventListener('touchmove', function (e) { if (dragging) { move(e.touches[0].clientX); e.preventDefault(); } }, { passive: false });
    document.addEventListener('touchend', end);
    divider.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 3;
      if (e.key === 'ArrowLeft') { setPct(cur() - step); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setPct(cur() + step); e.preventDefault(); }
      else if (e.key === 'Home') { setPct(0); e.preventDefault(); }
      else if (e.key === 'End') { setPct(100); e.preventDefault(); }
    });
    divider.addEventListener('dblclick', function () { container.style.removeProperty('--ex-split'); });
  }

  function studentName() {
    var em = '';
    try { em = (typeof authGetEmail === 'function' ? authGetEmail() : localStorage.getItem('sat-email')) || ''; } catch (e) {}
    var n = String(em).split('@')[0].trim();
    return n || 'Student';
  }

  // items[i] = { answered, flagged, result: 'correct'|'incorrect'|null, checked: 'right'|'wrong'|null }
  // idPrefix: optional, gives box i the id idPrefix + i.
  function renderNavGrid(el, items, current, onPick, idPrefix) {
    if (el.children.length !== items.length) {
      el.innerHTML = '';
      items.forEach(function (_, i) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'ex-qbox'; if (idPrefix) b.id = idPrefix + i;
        b.innerHTML = '<span class="ex-qbox-pin">' + icon.pin + '</span><span class="ex-qbox-n">' + (i + 1) + '</span><span class="ex-qbox-flag">' + icon.bookmarkFill + '</span>';
        b.addEventListener('click', function () { onPick(i); });
        el.appendChild(b);
      });
    }
    items.forEach(function (it, i) {
      var b = el.children[i];
      b.className = 'ex-qbox' + (it.answered ? ' answered' : '') + (it.flagged ? ' flagged' : '') + (i === current ? ' current' : '') +
        (it.result ? ' result-' + it.result : '') + (it.checked ? ' checked checked-' + it.checked : '');
      var parts = ['Question ' + (i + 1), it.answered ? 'answered' : 'unanswered'];
      if (it.flagged) parts.push('marked for review');
      if (it.checked) parts.push('checked: ' + (it.checked === 'right' ? 'correct' : 'incorrect'));
      if (it.result) parts.push(it.result);
      if (i === current) parts.push('current');
      b.setAttribute('aria-label', parts.join(', '));
      if (i === current) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }

  // <span class="ex-ico" data-icon="pin"></span> → the pin icon. Runs once on load; call again for new markup.
  function fillIcons(root) {
    (root || document).querySelectorAll('.ex-ico[data-icon]').forEach(function (el) {
      if (!el.firstChild && icon[el.getAttribute('data-icon')]) el.innerHTML = icon[el.getAttribute('data-icon')];
      el.style.display = 'inline-flex';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fillIcons(); }); else fillIcons();

  window.Exam = { icon: icon, fillIcons: fillIcons, initPopovers: initPopovers, closePopovers: closePopovers, initDivider: initDivider, studentName: studentName, renderNavGrid: renderNavGrid };
})();
