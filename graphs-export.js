// graphs-export.js: one-off. Opened as test.html?export=graphs on the live site, it collects the Command of
// Evidence graphs that only the question server has and saves them as satlab-graphs.json. Delete after use.
(function () {
  var NEED = {"53c6c179":"test01_1B","3dc911d6":"test01_1B","2df730d0":"test02_1B","a9ac31e4":"test02_2B","89f71526":"test03_2A","040583a5":"test04_1A","b074cc05":"test05_1B","a16128e2":"test05_2A","02848335":"test05_2A","f71802d6":"test05_2B","b29c520a":"test06_1A","23e2421a":"test06_2A","3430be35":"test06_2B","be19faa1":"test07_1A","702eb7e3":"test07_2A","ff18829b":"test08_1A","d5da74be":"test09_2B","15873d14":"test09_2B","1703403b":"test10_1A","303bcc41":"test10_1B","8a584241":"test10_2A","a9040290":"test11_2B","403fb4e4":"test11_2B","b470d853":"test12_1B","8a668840":"test12_2B","b71861fc":"test13_1A","df34b586":"test13_2A","742fd8ba":"test13_2B"};
  window.GraphExport = { run: async function () {
    var API = 'https://sat.mrnoobyesyes.workers.dev';
    var box = document.getElementById('loading-screen') || document.body;
    box.innerHTML = '<div style="max-width:560px;margin:40px auto;padding:24px;font:15px/1.5 Inter,system-ui,sans-serif"><h1 style="font:600 24px Georgia,serif">Export graphs</h1><div id="gx-log" style="font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap"></div></div>';
    box.classList.remove('hidden'); box.style.display = 'block'; box.style.overflow = 'auto';
    var log = function (t) { document.getElementById('gx-log').textContent += t + '\n'; };
    function toDataURL(src) {
      if (/^data:/.test(src)) return Promise.resolve(src);
      return fetch(src).then(function (r) { return r.blob(); }).then(function (b) {
        return new Promise(function (ok) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.readAsDataURL(b); });
      }).catch(function () { return src; });
    }
    var out = {}, mods = {};
    Object.keys(NEED).forEach(function (id) { (mods[NEED[id]] = mods[NEED[id]] || []).push(id); });
    for (var key of Object.keys(mods)) {
      try {
        var r = await fetch(API + '/api/module?bank=' + encodeURIComponent(key));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var qs = await r.json();
        for (var id of mods[key]) {
          var q = qs.find(function (x) { return x.id === id; });
          var charts = q ? (q.passage_lines || []).filter(function (l) { return l && l.type === 'chart' && l.image; }) : [];
          if (!charts.length) { log('✗ ' + id + ' (' + key + '): no graph on the server' + (q ? ' [' + (q.passage_lines || []).map(function (l) { return l && l.type; }).join(',') + ']' : ' [question not found]')); continue; }
          out[id] = [];
          for (var c of charts) out[id].push({ title: c.title || c.note || '', image: await toDataURL(c.image) });
          log('✓ ' + id + ' (' + key + ')');
        }
      } catch (e) { log('✗ ' + key + ': ' + e.message); }
    }
    log('\n' + Object.keys(out).length + ' of ' + Object.keys(NEED).length + ' graphs collected.');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
    a.download = 'satlab-graphs.json'; a.textContent = 'Download satlab-graphs.json';
    a.style.cssText = 'display:inline-block;margin-top:12px;padding:10px 20px;border-radius:999px;background:#0A5FE0;color:#fff;text-decoration:none;font-weight:600';
    document.getElementById('gx-log').after(a); a.click();
    log('Saved satlab-graphs.json (tap the button if it did not download). Send it to Claude.');
  } };
})();
