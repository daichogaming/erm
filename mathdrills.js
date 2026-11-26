// mathdrills.js — Math Topical Drills: every Math question in math_modules.js, sorted by skill
// into sets of about 15. Needs math_modules.js loaded first. window.MathDrills:
//   .skills            [{ domain, skill, slug, total, sizes:[n,…] }]  (College Board order)
//   .set(slug, n)      the questions of set n (1-based), easy → hard
//   .bySkill(name)     the skill entry for a skill name (or undefined)
(function () {
  if (typeof MATH_MODULES === 'undefined') return;
  var ORDER = [
    ['Algebra', ['Linear equations in one variable', 'Linear functions', 'Linear equations in two variables',
      'Systems of two linear equations in two variables', 'Linear inequalities in one or two variables']],
    ['Advanced Math', ['Equivalent expressions',
      'Nonlinear equations in one variable and systems of equations in two variables', 'Nonlinear functions']],
    ['Problem-Solving and Data Analysis', ['Ratios, rates, proportional relationships, and units', 'Percentages',
      'One-variable data: distributions and measures of center and spread', 'Two-variable data: models and scatterplots',
      'Probability and conditional probability', 'Inference from sample statistics and margin of error',
      'Evaluating statistical claims: observational studies and experiments']],
    ['Geometry and Trigonometry', ['Area and volume', 'Lines, angles, and triangles', 'Right triangles and trigonometry', 'Circles']]
  ];
  var RANK = { easy: 0, medium: 1, hard: 2 };
  function rank(q) { var r = RANK[String(q.difficulty || '').toLowerCase()]; return r == null ? 1 : r; }
  function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // One copy of each question (the Hard sets reuse ids), in a fixed order.
  var seen = {}, bySkill = {};
  Object.keys(MATH_MODULES).sort().forEach(function (k) {
    if (!/^mathtest\d+_/.test(k)) return;
    (MATH_MODULES[k] || []).forEach(function (q) {
      if (!q || seen[q.id]) return; seen[q.id] = 1;
      (bySkill[q.skill] = bySkill[q.skill] || []).push(q);
    });
  });

  var skills = [], sets = {};
  ORDER.forEach(function (d) {
    d[1].forEach(function (name) {
      var qs = (bySkill[name] || []).slice();
      if (!qs.length) return;
      qs.sort(function (a, b) { return rank(a) - rank(b) || (a.page || 0) - (b.page || 0); });
      // Deal the questions out like cards so every set gets easy, medium and hard ones, then order each easy → hard.
      var n = Math.max(1, Math.round(qs.length / 15)), out = [];
      for (var i = 0; i < n; i++) out.push([]);
      qs.forEach(function (q, i) { out[i % n].push(q); });
      out.forEach(function (s) { s.sort(function (a, b) { return rank(a) - rank(b) || (a.page || 0) - (b.page || 0); }); });
      var slug = slugify(name);
      sets[slug] = out;
      skills.push({ domain: d[0], skill: name, slug: slug, total: qs.length, sizes: out.map(function (s) { return s.length; }) });
    });
  });

  window.MathDrills = {
    skills: skills,
    set: function (slug, n) { var s = sets[slug]; return s && s[n - 1] ? s[n - 1].slice() : []; },
    bySkill: function (name) { for (var i = 0; i < skills.length; i++) if (skills[i].skill === name) return skills[i]; }
  };
})();
