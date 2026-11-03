/* Injects the shared sidebar on secondary pages (weakness, settings, previous scores). */
(function () {
  var cur = location.pathname.split('/').pop();
  var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'home.css'; document.head.appendChild(l);
  var I = {
    home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    math:'<path d="M5 12h14M12 5v14"/>', eng:'<path d="M4 5h16M4 12h10M4 19h16"/>',
    full:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h4"/>',
    adapt:'<path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/>',
    drill:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
    recall:'<path d="M12 5c-4.5 0-8 3.6-9 7 1 3.4 4.5 7 9 7s8-3.6 9-7c-1-3.4-4.5-7-9-7z"/><path d="M9.5 12a2.5 2.5 0 1 0 5 0"/>',
    recycle:'<path d="M7 19H4.5a1.5 1.5 0 0 1-1.3-2.25L5.6 12.6"/><path d="M11 19h8.5a1.5 1.5 0 0 0 1.3-2.25l-1.7-2.95"/><path d="M14 16l-3 3 3 3"/><path d="M8.6 7.5 10.7 4a1.5 1.5 0 0 1 2.6 0l2.6 4.5"/><path d="M15 4.6l.9 4-4 .9"/><path d="M3 9.5l2.6 3.1 3.1-2.6"/>',
    hard:'<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    weak:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', hist:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    set:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'
  };
  function a(href, icon, text, file) {
    return '<a class="sb-link' + (file === cur ? ' active' : '') + '" href="' + href + '" style="text-decoration:none"><svg viewBox="0 0 24 24">' + I[icon] + '</svg>' + text + '</a>';
  }
  var el = document.createElement('aside');
  el.className = 'sidebar'; el.setAttribute('aria-label', 'Main navigation');
  el.innerHTML =
    '<div class="sb-brand" onclick="location.href=\'index.html\'"><i>S</i>SATLab</div><nav class="sb-nav">' +
    a('index.html', 'home', 'Home') + '<div class="sb-label">Practice</div>' +
    a('index.html#math', 'math', 'Math') + a('index.html#english', 'eng', 'Writing') +
    a('index.html#fulltests', 'full', 'Full Test') + a('index.html#adaptive', 'adapt', 'Adaptive Test') + a('index.html#drills', 'drill', 'Topical Drills') + a('index.html#recall', 'recall', 'Active Recall') +
    a('index.html#hard', 'hard', 'Hard Question Bank') +
    a('index.html#recycles', 'recycle', 'Recycles') +
    '<div class="sb-label">You</div>' +
    a('weakness.html', 'weak', 'Weakness Profile', 'weakness.html') +
    a('previous-scores.html', 'hist', 'Previous Scores', 'previous-scores.html') +
    a('settings.html', 'set', 'Settings', 'settings.html') +
    '</nav><div class="sb-foot">Digital SAT · 2025–2026<br>Not affiliated with College Board</div>';
  // Show the sidebar as soon as <body> exists, without waiting for big scripts
  // further down the page (e.g. the 4 MB question bank) to download.
  function mount() { document.body.insertBefore(el, document.body.firstChild); }
  if (document.body) mount();
  else new MutationObserver(function (_, obs) {
    if (document.body) { obs.disconnect(); mount(); }
  }).observe(document.documentElement, { childList: true });
})();
