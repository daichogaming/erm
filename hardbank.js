/* Hard Question Bank: every question tagged "Hard" in the existing banks,
   split into fixed sets so a set number always means the same questions.
   Sets can be narrowed to one skill (e.g. "Transitions"); set numbers are then
   counted within that skill.

   Sources (already used by fulltest.html):
     QUESTION_BANK  (questionbank.js)  Reading & Writing, keyed "test01_1A" …
     MATH_MODULES   (math_modules.js)  Math, keyed "mathtest01_1A" …

   Used by hard.html (the set list), test.html?test=hard and math.html?test=hard
   (both read ?module=N for the set number and an optional ?skill=…). */
(function () {
  var SET_SIZE = 20;

  function isHard(q) { return q && String(q.difficulty || '').toLowerCase() === 'hard'; }

  // Walk every module in key order and keep the first copy of each question id.
  function collect(bank) {
    if (!bank) return [];
    var seen = {}, out = [];
    Object.keys(bank).sort().forEach(function (k) {
      (bank[k] || []).forEach(function (q) {
        if (isHard(q) && !q.unusable && !seen[q.id]) { seen[q.id] = true; out.push(q); } // unusable: graph lost in extraction
      });
    });
    return out;
  }

  function chunk(arr) {
    var sets = [];
    for (var i = 0; i < arr.length; i += SET_SIZE) sets.push(arr.slice(i, i + SET_SIZE));
    // Fold a tiny last set (under 8) into the previous one so no set feels empty.
    if (sets.length > 1 && sets[sets.length - 1].length < 8) sets[sets.length - 2] = sets[sets.length - 2].concat(sets.pop());
    return sets;
  }

  var hardCache = {}, setCache = {};
  function hardQuestions(kind) {
    if (hardCache[kind]) return hardCache[kind];
    var bank = kind === 'math'
      ? (typeof MATH_MODULES !== 'undefined' ? MATH_MODULES : null)
      : (typeof QUESTION_BANK !== 'undefined' ? QUESTION_BANK : null);
    return (hardCache[kind] = collect(bank));
  }
  function sets(kind, skill) {
    var key = kind + '|' + (skill || '');
    if (setCache[key]) return setCache[key];
    var qs = hardQuestions(kind);
    if (skill) qs = qs.filter(function (q) { return q.skill === skill; });
    return (setCache[key] = chunk(qs));
  }
  // [{ skill, count }] sorted by most hard questions first.
  function skills(kind) {
    var counts = {};
    hardQuestions(kind).forEach(function (q) { if (q.skill) counts[q.skill] = (counts[q.skill] || 0) + 1; });
    return Object.keys(counts).map(function (s) { return { skill: s, count: counts[s] }; })
      .sort(function (a, b) { return b.count - a.count || a.skill.localeCompare(b.skill); });
  }

  window.HardBank = {
    SET_SIZE: SET_SIZE,
    rwSets: function (skill) { return sets('rw', skill); },
    mathSets: function (skill) { return sets('math', skill); },
    rwSkills: function () { return skills('rw'); },
    mathSkills: function () { return skills('math'); },
    // n is 1-based, matching the ?module= URL parameter
    rwSet: function (n, skill) { return sets('rw', skill)[n - 1] || []; },
    mathSet: function (n, skill) { return sets('math', skill)[n - 1] || []; }
  };
})();
