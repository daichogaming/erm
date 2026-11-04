// kbd.js: lets keyboard users reach and press the clickable cards and rows
// that are plain <div onclick> (test rows, subject cards, theme options, tabs).
// Tab focuses them; Enter or Space presses them.
(function () {
  var SEL = '[onclick]:not(a):not(button):not(input):not(select):not(textarea):not(label):not(option)';
  function usable(el) {
    var js = el.getAttribute('onclick') || '';
    return !/event\.target\s*===?\s*this/.test(js); // overlay backdrops close on outside clicks only
  }
  function tag(root) {
    if (!root || !root.querySelectorAll) return;
    var list = Array.prototype.slice.call(root.querySelectorAll(SEL));
    if (root.matches && root.matches(SEL)) list.push(root);
    list.forEach(function (el) {
      if (!usable(el)) return;
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target;
    if (!el || !el.matches || !el.matches(SEL) || !usable(el)) return;
    e.preventDefault();
    el.click();
  });
  function start() {
    tag(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) tag(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
