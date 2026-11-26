// rworder.js: the order of Reading & Writing questions in a module (the team's allocation table):
//   1–5   Words in Context
//   6–15  the rest of Craft and Structure (Text Structure and Purpose, Cross-Text Connections), then
//         Information and Ideas (Central Ideas and Details, Command of Evidence: text first, then table/graph,
//         Inferences)
//   16–24 Standard English Conventions (Boundaries, Form, Structure, and Sense)
//   25–27 Expression of Ideas (Transitions, Rhetorical Synthesis)
// RWOrder.sort(questions, { byDifficulty }) returns a new array in that order; questions of the same type keep
// their order (or go easy → hard with byDifficulty).
(function () {
  var SKILLS = ['Words in Context', 'Text Structure and Purpose', 'Cross-Text Connections',
    'Central Ideas and Details', 'Command of Evidence', 'Command of Evidence (quantitative)', 'Inferences',
    'Boundaries', 'Form, Structure, and Sense', 'Transitions', 'Rhetorical Synthesis'];
  var DOMAINS = ['Craft and Structure', 'Information and Ideas', 'Standard English', 'Expression of Ideas'];
  var DIFF = { Easy: 0, Medium: 1, Hard: 2 };
  function quantitative(q) {
    var lines = q.passage_lines || [];
    for (var i = 0; i < lines.length; i++) if (lines[i] && lines[i].type === 'table') return true;
    return /\b(table|graph|chart)\b/i.test(q.question || '');
  }
  function rank(q) {
    var s = q.skill === 'Command of Evidence' && quantitative(q) ? 'Command of Evidence (quantitative)' : q.skill;
    var r = SKILLS.indexOf(s);
    if (r >= 0) return r;
    // Unknown skill: put it at the end of its domain.
    for (var d = 0; d < DOMAINS.length; d++) if (q.domain && q.domain.indexOf(DOMAINS[d]) === 0)
      return [2.5, 6.5, 8.5, 10.5][d];
    return 99;
  }
  window.RWOrder = {
    rank: rank,
    sort: function (qs, opts) {
      var byDiff = opts && opts.byDifficulty;
      return qs.map(function (q, i) { return { q: q, i: i, r: rank(q) }; }).sort(function (a, b) {
        return a.r - b.r || (byDiff ? (DIFF[a.q.difficulty] == null ? 1 : DIFF[a.q.difficulty]) - (DIFF[b.q.difficulty] == null ? 1 : DIFF[b.q.difficulty]) : 0) || a.i - b.i;
      }).map(function (x) { return x.q; });
    }
  };
})();
