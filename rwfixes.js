// rwfixes.js: repairs for Reading & Writing questions, applied as they load (the question server's copy can't be
// edited from the site, so test.html and drill.html fix what it sends; the local banks are fixed the same way).
//   RWFix.apply(q) fixes q in place and returns it.
// 1. Choice D missing in five Command of Evidence (graph) questions. The text is rebuilt from the graph and the
//    official explanation of choice D, so the meaning matches; the wording may differ from the original.
// 2. Apostrophes lost in transcription: "student s claim" → "student’s claim", "don t" → "don’t".
// 3. Accented words split by a space: "Rinc ón" → "Rincón", "Vel ázquez" → "Velázquez".
// 4. Rhetorical Synthesis questions show the student's goal; passages that lost their last lines get them back;
//    a few one-off repairs (PATCH).
(function () {
  var CHOICE_D = {
    '2df730d0': 'The majority of turbines installed in 2011 had rotor diameters of less than 100 meters, whereas the majority of turbines installed in 2021 had rotor diameters of 115–130 meters.',
    '3430be35': 'the prices chosen by the students varied far more widely than the prices chosen by the group recruited online, regardless of the message the participants received.',
    '702eb7e3': 'was substantially lower than uncertainty about trade policy in 2005 but substantially higher than uncertainty about trade policy in 2010.',
    '1703403b': 'Rincón and Isabela have a similar average rainfall, as do Ponce and San Sebastián.',
    '8a584241': 'at 48 hours, more than 90% of seeds treated with H₂S at a concentration of 10 micromoles per liter had germinated, whereas less than 30% of untreated seeds had germinated.'
  };
  var L = 'A-Za-zÀ-ÖØ-öø-ÿĀ-žḀ-ỿ';
  var RE_S = new RegExp('([' + L + ']) s(?=[\\s.,;:!?)”"—–-]|$)', 'g');
  var RE_NT = new RegExp('\\b(do|does|did|is|are|was|were|has|have|had|ca|could|would|should|wo|might|must|need|ai)n t\\b', 'gi');
  var RE_CTR = new RegExp('\\b(I|you|we|they|You|We|They|who|Who|that|That|there|There|it|It|he|He|she|She|what|What) (re|ve|ll|d|m)\\b', 'g');
  var RE_ACC = new RegExp('([' + L + ']*[a-zà-öø-ÿ]) ([áéíóúñãõâêôç][a-zà-öø-ÿ])', 'g');
  var KEEP = /^(and|or|the|of|in|on|a|an|to|de|del|el|la|las|los|y|e|o|en|con|por|para|que)$/i;
  function fixText(t) {
    if (typeof t !== 'string' || !t) return t;
    return t.replace(RE_ACC, function (m, w, r) { return KEEP.test(w) ? m : w + r; }).replace(/([A-Za-zà-ÿ]) ([,;])(?= )/g, '$1$2').replace(RE_NT, '$1n’t').replace(RE_S, '$1’s')
      .replace(RE_CTR, function (m, w, c) { return (c === 'd' || c === 'm') && !/^(I|you|we|they|he|she|it|You|We|They|He|She|It)$/.test(w) ? m : w + '’' + c; });
  }
  // Passages whose shown text lost lines that the stored passage still has, and other one-off repairs.
  function line(t, indent) { return { type: 'line', text: t, indent: indent || 0 }; }
  var PATCH = {
    '9077be25': function (q) { // the last two sentences (and the blank) were missing
      addLines(q, [line('As a result, actors tended to highly exaggerate their actions and expressions. The style of acting in Guy-Blaché’s films was therefore ______')]);
      if (q.choices && /other directors films/.test(q.choices[1] || '')) q.choices[1] = 'familiar to actors who had worked on other directors’ films.';
    },
    'ecb31049': function (q) {
      addLines(q, [line('Scientists have long believed that fusion has the potential to meet humanity’s clean energy needs. ______ prior to December 2022, no fusion reaction in a laboratory setting had ever generated a net energy gain.')]);
    },
    'dc043599': function (q) { // Text 2 was empty
      addLines(q, [{ type: 'blank' }, line('Researchers from NASA’s Ames Research Center used a computer to model how the moon could have formed. Although simulations of the moon’s formation have been done in the past, the team from NASA ran simulations that were much more detailed. They found that the formation of the moon was likely not a slow process that took many years. Instead, it’s probable that the moon’s formation happened immediately after impact, taking just a few hours.')]);
    },
    '97360a00': function (q) { // the poem stopped after line 3
      addLines(q, ['As shimmering fine as floating dew...', 'And here and there', 'In the black of her hair', 'The subtle hands of Night', 'Move slowly with their gem-starred light.'].map(function (t) { return line(t); }));
    },
    'd102706f': function (q) { // the dinosaur names were out of place
      eachText(q, function (t) { return t.replace('includes Tarbosaurus Albertosaurus , , and, most famously,', 'includes Tarbosaurus, Albertosaurus, and, most famously,'); });
    },
    'e1546fd6': function (q) { // the table had been read column-by-column into one jumbled block
      q.passage_lines = [
        { type: 'table', title: 'Average Nitrate and Phosphate Concentrations in Seawater after Volcanic Eruption',
          headers: ['Nutrient', 'Seawater in lava-affected area, 5–45 meters below surface', 'Seawater in lava-affected area, 75–125 meters below surface', 'Seawater outside of lava-affected area, 5–45 meters below surface', 'Seawater outside of lava-affected area, 75–125 meters below surface'],
          rows: [['Nitrate (micromoles per liter)', '3.1', '0.4', '≤0.03', '≤0.01'], ['Phosphate (micromoles per liter)', '0.17', '0.09', '0.14', '0.06']] },
        { type: 'text', text: 'After a volcanic eruption spilled lava into North Pacific Ocean waters, a dramatic increase of diatoms (a kind of phytoplankton) near the surface occurred. Scientists assumed the diatoms were thriving on nutrients such as phosphate from the lava, but analysis showed these nutrients weren’t present near the surface in forms diatoms can consume. However, there was an abundance of usable nitrate, a nutrient usually found in much deeper water and almost never found in lava. Microbial oceanographer Sonya Dyhrman and colleagues believe that as the lava plunged nearly 300 meters below the surface it dislodged pockets of this nutrient, releasing it to float upward, given that ______' }
      ];
    },
    'a3e87535': function (q) { eachText(q, function (t) { return t.replace('Trujillohas', 'Trujillo has'); }); }
  };
  function addLines(q, lines) {
    if (!Array.isArray(q.passage_lines)) return;
    var shown = q.passage_lines.map(function (l) { return l && (l.text || ''); }).join(' ');
    var first = lines.filter(function (l) { return l.text; })[0];
    if (first && shown.indexOf(first.text.slice(0, 30)) >= 0) return; // already there (fixed at the source)
    q.passage_lines = q.passage_lines.concat(lines);
  }
  function eachText(q, f) {
    (q.passage_lines || []).forEach(function (l) { if (l && typeof l.text === 'string') l.text = f(l.text); });
  }
  // Rhetorical Synthesis: the student's goal ("The student wants to …") was only in the stored passage, never on
  // screen. Show it at the start of the question, as the real test does.
  function goal(q) {
    if (q.skill !== 'Rhetorical Synthesis' || /wants to/.test(q.question || '')) return;
    var shown = (q.passage_lines || []).map(function (l) { return l && (l.text || ''); }).join(' ');
    if (/wants to/.test(shown)) return;
    var m = String(q.passage || '').replace(/\s+/g, ' ').match(/(The [A-Za-z’' ]{0,30}wants to [\s\S]*?)(?=\s*Which choice|$)/);
    if (m) q.question = m[1].trim() + ' ' + q.question;
  }
  function apply(q) {
    if (!q || q.__rwfixed) return q;
    if (PATCH[q.id]) PATCH[q.id](q);
    goal(q);
    // Command of Evidence: table titles were read as underlined text. Nothing is underlined in these questions.
    if (q.skill === 'Command of Evidence' && q.underline_segments && !/underlin/i.test(q.question || '')) { q.underline_segments = []; q.underline = null; }
    if (CHOICE_D[q.id] && Array.isArray(q.choices) && !String(q.choices[3] || '').trim()) q.choices[3] = CHOICE_D[q.id];
    q.question = fixText(q.question);
    if (Array.isArray(q.choices)) q.choices = q.choices.map(fixText);
    if (q.rationale) q.rationale = fixText(q.rationale);
    if (Array.isArray(q.passage_lines)) q.passage_lines.forEach(function (l) {
      if (!l) return;
      if (typeof l.text === 'string') l.text = fixText(l.text);
      if (l.type === 'table') {
        if (l.title) l.title = fixText(l.title);
        if (Array.isArray(l.rows)) l.rows = l.rows.map(function (r) { return Array.isArray(r) ? r.map(fixText) : r; });
      }
    });
    try { Object.defineProperty(q, '__rwfixed', { value: true }); } catch (e) {}
    return q;
  }
  // The question server's copy of a module is older than the site's (tables, underlines); rw/<key>.js holds the
  // repaired text. load(key) writes its script tag (call while the page is still loading); overlay() lays it on.
  var FIELDS = ['domain', 'skill', 'difficulty', 'context', 'passage', 'passage_lines', 'question', 'choices', 'underline', 'underline_segments'];
  function load(key) {
    if (typeof document === 'undefined' || !/^[a-z0-9-]+_[0-9A-Za-z]+$/.test(key || '')) return;
    document.write('<script src="rw/' + key + '.js?v=1"><\/script>');
  }
  function overlay(qs, key) {
    var local = (typeof window !== 'undefined' && window.RW_DISPLAY && window.RW_DISPLAY[key]) || [];
    var byId = {}; local.forEach(function (q) { byId[q.id] = q; });
    (qs || []).forEach(function (q) {
      var l = q && byId[q.id]; if (!l) return;
      // Graph images come only from the server: where it sends one, keep its passage and lay on the rest.
      var hasImg = (q.passage_lines || []).some(function (x) { return x && x.type === 'chart' && x.image; });
      FIELDS.forEach(function (f) {
        if (hasImg && (f === 'passage' || f === 'passage_lines')) return;
        if (l[f] !== undefined) q[f] = JSON.parse(JSON.stringify(l[f]));
      });
    });
    return qs;
  }
  var api = { apply: apply, fixText: fixText, choiceD: CHOICE_D, load: load, overlay: overlay };
  if (typeof window !== 'undefined') window.RWFix = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
