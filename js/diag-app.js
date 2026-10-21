/* Diagnóstico Chanak v2 — interfaz. La lógica de ubicación está en diag-core.js; las respuestas viven en el servidor (/api). */
(function () {
  'use strict';
  const C = window.DiagCore;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── Estado ────────────────────────────────────────────────────────────────
  let LANG = 'es';
  const S = { form: {}, grade: 0, track: 'off', bible: false, us: false, plan: [], results: {}, comp: null, map: null, current: null, inProgress: false };
  window.__S = S; // depuración

  // ── Textos ────────────────────────────────────────────────────────────────
  const TX = {
    es: {
      subj: { math: 'Matemáticas', ela: 'Inglés y Lectura', comp: 'Áreas complementarias' },
      step: (n) => `Bloque ${n}`, ofQ: (a, b) => `Respondidas ${a} de ${b}`,
      next: 'Continuar →', finish: 'Ver resultados →', checking: 'Corrigiendo…',
      confirmBlank: 'Hay preguntas sin responder. Las que se dejen en blanco cuentan como no logradas. ¿Continuar?',
      needName: 'Por favor, introduce el nombre del estudiante.', needGrade: 'Selecciona el curso declarado.', needMentor: 'Indica el mentor o evaluador.',
      netError: 'No se pudo conectar con el servidor del diagnóstico. Revisa la conexión e inténtalo de nuevo.',
      readAloud: 'Matemáticas está en inglés: si el estudiante todavía no lee inglés, un adulto puede leer los enunciados en voz alta.',
      mathIntro: 'Evaluación de Matemáticas (en inglés). Empieza por debajo del curso declarado para detectar lagunas y sube hasta su nivel.',
      elaIntro: 'Evaluación de Inglés y Lectura. Empieza por debajo del curso declarado para detectar lagunas y sube hasta su nivel.',
      compIntro: 'Áreas complementarias: Ciencias, Geografía, Historia e Inteligencia Emocional.',
      supervisor: 'Supervisión: sin límite de tiempo total; descansos de 10–15 min cada 45 min. Usar lápiz y papel para los cálculos.',
      level: 'Nivel', pace: 'PACE', gaps: 'Conceptos a reforzar antes de avanzar', noGaps: 'No se detectaron conceptos por reforzar', continueAt: 'Continuar en la unidad', workLevel: 'Nivel de trabajo', refs: 'Referencias (ACE · CLE · LIFEPAC · Florida)', practice: 'Qué practicar', lu: 'Unidad de aprendizaje',
      skipENG: 'Se omitió la prueba de inglés (la familia indicó que todavía no lee inglés).',
      abcRec: 'Recomendación: programa Reading – ABC (lectura inicial en inglés) antes de continuar con el currículo en inglés.',
      kinderRec: 'Recomendación: programa de Kindergarten (preparación de lectura y matemáticas) antes del nivel 1.',
      abcsOk: 'Preparación de nivel 1 superada: puede iniciar el nivel 1.',
      cappedNote: 'Dominio completo hasta su grado. Por norma no se prescribe por encima del curso declarado; valorar adelanto con el mentor.',
      deduced: 'Equivalencia deducida (sin cuadernillo de referencia): validar con un docente.',
      startPoint: 'Punto de partida', perf: 'Nivel de desempeño',
    },
    en: {
      subj: { math: 'Mathematics', ela: 'English & Reading', comp: 'Additional areas' },
      step: (n) => `Block ${n}`, ofQ: (a, b) => `Answered ${a} of ${b}`,
      next: 'Continue →', finish: 'See results →', checking: 'Scoring…',
      confirmBlank: 'Some questions are unanswered. Blank answers count as not mastered. Continue?',
      needName: "Please enter the student's name.", needGrade: 'Select the declared grade.', needMentor: 'Enter the mentor or evaluator.',
      netError: 'Could not reach the diagnostic server. Check your connection and try again.',
      readAloud: 'If the student cannot yet read English, an adult may read the questions aloud.',
      mathIntro: 'Mathematics assessment. It starts below the declared grade to find gaps, then moves up to grade level.',
      elaIntro: 'English & Reading assessment. It starts below the declared grade to find gaps, then moves up to grade level.',
      compIntro: 'Additional areas: Science, Geography, History and Emotional Intelligence.',
      supervisor: 'Supervision: no overall time limit; take a 10–15 min break every 45 min. Use pencil and paper for calculations.',
      level: 'Level', pace: 'PACE', gaps: 'Concepts to reinforce before moving on', noGaps: 'No concepts to reinforce were detected', continueAt: 'Continue at unit', workLevel: 'Working level', refs: 'References (ACE · CLE · LIFEPAC · Florida)', practice: 'What to practice', lu: 'Learning Unit',
      skipENG: 'The English test was skipped (the family reported the student does not read English yet).',
      abcRec: 'Recommendation: Reading – ABC program (early reading in English) before continuing with the English-language curriculum.',
      kinderRec: 'Recommendation: Kindergarten program (reading and math readiness) before Level 1.',
      abcsOk: 'Level 1 readiness passed: ready to begin Level 1.',
      cappedNote: 'Full mastery through grade level. Placement is never prescribed above the declared grade; discuss acceleration with the mentor.',
      deduced: 'Equivalence inferred (no reference booklet): validate with a teacher.',
      startPoint: 'Starting point', perf: 'Performance level',
    },
  };
  const T = () => TX[LANG];
  const AREA = {
    es: { science: 'Ciencias', geography: 'Geografía', history: 'Historia', ei: 'Inteligencia Emocional', bible: 'Biblia' },
    en: { science: 'Science', geography: 'Geography', history: 'History', ei: 'Emotional Intelligence', bible: 'Bible' },
  };
  const GRADE_LABEL = (g) => (g === 0 ? 'Kindergarten' : `Grade ${g}`);
  const SCOPE = {
    math: {
      es: ['Contar hasta 100, números 0-20, suma y resta hasta 10, figuras, comparar medidas', 'Suma y resta hasta 20 con fluidez, valor posicional, la hora, longitud', 'Suma y resta hasta 1000, dinero, la hora, introducción a la multiplicación', 'Multiplicación y división hasta 100, fracciones unitarias, área y perímetro', 'Multiplicación y división de varias cifras, fracciones equivalentes, decimales, ángulos', 'Fracciones de distinto denominador, decimales, volumen, plano cartesiano', 'Razones y tasas, enteros, ecuaciones de un paso, área y volumen, estadística', 'Relaciones proporcionales, racionales, ecuaciones de varios pasos, círculos, probabilidad', 'Funciones lineales, sistemas, exponentes y notación científica, Pitágoras', 'Algebra 1: funciones lineales y cuadráticas, polinomios, factorización', 'Geometry: razonamiento deductivo, demostraciones, círculos', 'Algebra 2: funciones polinómicas, exponenciales y logarítmicas, complejos', 'Pre-Calculus / Trigonometría: funciones, identidades, sucesiones'],
      en: ['Count to 100, numbers 0-20, add/subtract within 10, shapes, compare measures', 'Add/subtract within 20, place value, telling time, length', 'Add/subtract within 1000, money, time, intro to multiplication', 'Multiply/divide within 100, unit fractions, area and perimeter', 'Multi-digit multiply/divide, equivalent fractions, decimals, angles', 'Unlike-denominator fractions, decimals, volume, coordinate plane', 'Ratios and rates, integers, one-step equations, area/volume, statistics', 'Proportional relationships, rational numbers, multi-step equations, circles, probability', 'Linear functions, systems, exponents and scientific notation, Pythagorean theorem', 'Algebra 1: linear and quadratic functions, polynomials, factoring', 'Geometry: deductive reasoning, proofs, circles', 'Algebra 2: polynomial, exponential and logarithmic functions, complex numbers', 'Pre-Calculus / Trigonometry: functions, identities, sequences'],
    },
    ela: {
      es: ['Conciencia fonológica, letra-sonido, decodificación CVC, palabras de alta frecuencia', 'Fonética, fluidez, ideas clave, oraciones completas, mayúsculas y puntuación', 'Decodificación multisilábica, idea principal, sustantivos, verbos y adjetivos', 'Estructura del texto, párrafo de opinión, raíces y afijos, gramática de la oración', 'Resumen, tema, textos de varios párrafos, iniciación a la investigación', 'Comparación de textos, lenguaje figurado, ensayos con evidencias', 'Elementos literarios, idea central, escritura argumentativa, citación', 'Análisis de argumentos, poesía, investigación con fuentes, cláusulas', 'Retórica, análisis literario, investigación formal', 'English 1: análisis literario e informativo, ensayo argumentativo', 'English 2: literatura universal, análisis comparativo, investigación documentada', 'English 3: literatura estadounidense, análisis retórico, ensayo de síntesis', 'English 4: literatura británica y universal, escritura avanzada'],
      en: ['Phonological awareness, letter-sound, CVC decoding, high-frequency words', 'Phonics, fluency, key ideas, complete sentences, capitals and punctuation', 'Multisyllabic decoding, main idea, nouns, verbs and adjectives', 'Text structure, opinion paragraph, roots and affixes, sentence grammar', 'Summary, theme, multi-paragraph texts, intro to research', 'Comparing texts, figurative language, evidence-based essays', 'Literary elements, central idea, argumentative writing, citation', 'Argument analysis, poetry, research with sources, clauses', 'Rhetoric, literary analysis, formal research', 'English 1: literary and informational analysis, argumentative essay', 'English 2: world literature, comparative analysis, documented research', 'English 3: American literature, rhetorical analysis, synthesis essay', 'English 4: British and world literature, advanced writing'],
    },
  };

  // ── i18n estático ─────────────────────────────────────────────────────────
  function applyLang() {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-es]').forEach((el) => { el.innerHTML = el.dataset[LANG] != null ? el.dataset[LANG] : el.dataset.es; });
    document.querySelectorAll('[data-ph-es]').forEach((el) => { el.placeholder = el.dataset['ph' + (LANG === 'es' ? 'Es' : 'En')] || el.dataset.phEs; });
    document.querySelectorAll('.langbtn').forEach((b) => b.classList.toggle('on', b.dataset.lang === LANG));
  }
  function setLang(l) { LANG = l === 'en' ? 'en' : 'es'; applyLang(); if (!$('section-results').classList.contains('hidden')) renderResults(); }
  window.setLang = setLang;

  // ── Navegación ────────────────────────────────────────────────────────────
  const SECTIONS = ['landing', 'form', 'level', 'test', 'results', 'mentor', 'pei', 'cert'];
  function showSection(n) {
    if (S.inProgress && !['test', 'results', 'mentor', 'pei', 'cert'].includes(n)) { S.pendingExit = n; $('exit-modal').classList.add('open'); return; }
    _show(n);
  }
  function _show(n) {
    SECTIONS.forEach((s) => $('section-' + s).classList.add('hidden'));
    $('section-' + n).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.showSection = showSection;
  window.closeExitModal = () => { $('exit-modal').classList.remove('open'); S.pendingExit = null; };
  window.confirmExit = () => { $('exit-modal').classList.remove('open'); resetAll(); _show(S.pendingExit || 'landing'); S.pendingExit = null; };
  window.exitTest = () => { $('exit-modal').classList.add('open'); };
  function resetAll() {
    S.inProgress = false; S.results = {}; S.comp = null; S.current = null; S.plan = [];
    window.removeEventListener('beforeunload', onBeforeUnload);
    ['f-nombre', 'f-fecha', 'f-edad', 'f-curso', 'f-pais', 'f-idiomas', 'f-tutor', 'f-email', 'f-centro', 'f-mentor', 'f-obs', 'f-intereses'].forEach((id) => { const e = $(id); if (e) e.value = ''; });
    ['m-obs', 'm-mat', 'm-lec', 'm-rec'].forEach((id) => { const e = $(id); if (e) e.value = ''; });
    document.querySelectorAll('.rr').forEach((r) => { r.checked = false; });
    $('bible-toggle').checked = false;
  }
  function onBeforeUnload(e) { if (S.inProgress) { e.preventDefault(); e.returnValue = ''; return ''; } }

  // ── Formulario ────────────────────────────────────────────────────────────
  window.onPaisChange = (v) => {
    $('flex-note').classList.toggle('hidden', v !== 'EE. UU. / Florida');
    if (v === 'EE. UU. / Florida' && LANG !== 'en') $('us-hint').classList.remove('hidden'); else $('us-hint').classList.add('hidden');
  };
  window.goToLevel = () => {
    const f = readForm();
    if (!f.nombre.trim()) { alert(T().needName); return; }
    if (f.curso === '') { alert(T().needGrade); return; }
    if (!f.mentor.trim()) { alert(T().needMentor); return; }
    S.form = f; S.grade = Number(f.curso); S.track = f.programa; S.us = f.pais === 'EE. UU. / Florida';
    buildPlan(); renderPlanSummary(); showSection('level');
  };
  function readForm() {
    const v = (id) => ($(id) ? $(id).value : '');
    return { nombre: v('f-nombre'), fecha: v('f-fecha'), edad: v('f-edad'), curso: v('f-curso'), pais: v('f-pais'), idiomas: v('f-idiomas'), tutor: v('f-tutor'), email: v('f-email'), centro: v('f-centro'), mentor: v('f-mentor'), obs: v('f-obs'), programa: v('f-programa') || 'off', ingles: v('f-ingles') || 'si', intereses: v('f-intereses') };
  }
  function buildPlan() {
    const plan = [];
    if (S.track === 'dual') { if (S.form.ingles !== 'no') plan.push('ela'); }
    else { plan.push('math'); if (S.form.ingles !== 'no') plan.push('ela'); }
    plan.push('comp');
    S.plan = plan;
  }
  function renderPlanSummary() {
    const g = S.grade; const start = C.startLevel(g);
    const rows = S.plan.filter((s) => s !== 'comp').map((s) => `<li><strong>${esc(T().subj[s])}</strong> — ${LANG === 'es' ? 'empieza en' : 'starts at'} ${esc(GRADE_LABEL(start))} → ${esc(GRADE_LABEL(g))}</li>`);
    if (S.form.ingles === 'no') rows.push(`<li>${esc(T().skipENG)}</li>`);
    rows.push(`<li><strong>${esc(T().subj.comp)}</strong> — ${esc(T().compIntro.replace(/^[^:]+: /, ''))}</li>`);
    $('plan-summary').innerHTML = `<ul class="plist">${rows.join('')}</ul>`;
  }
  window.toggleBible = (cb) => { S.bible = cb.checked; };

  // ── Test ──────────────────────────────────────────────────────────────────
  async function api(path, opts) {
    const r = await fetch(path, opts);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  async function loadMap() { if (!S.map) { try { S.map = await api('/data/placement-map.json'); } catch { S.map = { grades: {} }; } } }

  window.startTest = async () => {
    S.bible = $('bible-toggle').checked; S.results = {}; S.comp = null; S.inProgress = true;
    window.addEventListener('beforeunload', onBeforeUnload);
    await loadMap();
    try {
      for (const subj of S.plan) { if (subj === 'comp') await runComp(); else await runSubject(subj); }
    } catch (e) { console.error(e); alert(T().netError); S.inProgress = false; return; }
    S.inProgress = false; window.removeEventListener('beforeunload', onBeforeUnload);
    finalizeResults(); renderResults(); showSection('results');
  };

  // Muestra un bloque de preguntas y devuelve las respuestas cuando el usuario continúa.
  function askBlock({ title, intro, items, stepLabel, last }) {
    return new Promise((resolve) => {
      $('t-sname').textContent = S.form.nombre || '—';
      $('t-subject').textContent = title; $('t-intro').innerHTML = esc(intro) + `<br><span class="supv">${esc(T().supervisor)}</span>`;
      $('t-step').textContent = stepLabel;
      const cont = $('qcont'); cont.innerHTML = '';
      const ans = {};
      const upd = () => {
        const n = Object.keys(ans).length;
        $('tpfill').style.width = Math.round((n / items.length) * 100) + '%';
        $('t-ptxt').textContent = T().ofQ(n, items.length); $('t-ppct').textContent = Math.round((n / items.length) * 100) + '%';
      };
      items.forEach((it, i) => {
        const d = document.createElement('div'); d.className = 'qblock'; d.dataset.id = it.id;
        const tag = it.area ? `<span class="area-tag">${esc((AREA[LANG] || AREA.es)[it.area] || it.area)}</span>` : '';
        d.innerHTML = `${tag}<div class="qtxt"><strong>${i + 1}.</strong> ${esc(it.prompt).replace(/\n/g, '<br>')}</div>`;
        const box = document.createElement('div');
        if (it.type === 'mcq') {
          box.className = 'opts';
          it.options.forEach((o, j) => {
            const lb = document.createElement('label'); lb.className = 'olbl';
            lb.innerHTML = `<input type="radio" name="q${i}"><span>${String.fromCharCode(65 + j)}. ${esc(o)}</span>`;
            lb.querySelector('input').addEventListener('change', () => { ans[it.id] = j; box.querySelectorAll('.olbl').forEach((x) => x.classList.remove('sel')); lb.classList.add('sel'); upd(); });
            box.appendChild(lb);
          });
        } else {
          box.className = 'numbox';
          box.innerHTML = '<input type="text" inputmode="decimal" autocomplete="off" placeholder="…">';
          box.querySelector('input').addEventListener('input', (e) => { const v = e.target.value.trim(); if (v) ans[it.id] = v; else delete ans[it.id]; upd(); });
        }
        d.appendChild(box); cont.appendChild(d);
      });
      upd();
      const btn = $('btn-next'); btn.textContent = last ? T().finish : T().next; btn.disabled = false;
      btn.onclick = () => {
        const blanks = items.length - Object.keys(ans).length;
        if (blanks > 0 && !confirm(T().confirmBlank)) return;
        btn.disabled = true; btn.textContent = T().checking;
        resolve(ans);
      };
      _show('test');
    });
  }

  async function runSubject(subj) {
    const g = S.grade;
    const state = { grade: g, blocks: [], ext: 0 };
    let level = C.startLevel(g); let n = 0;
    for (let guard = 0; guard < 16; guard++) {
      n++;
      const data = await api(`/api/diag-items?subject=${subj}&level=${level}&lang=en`);
      if (!data.items.length) throw new Error('Sin preguntas para ' + subj + ' nivel ' + level);
      const ans = await askBlock({
        title: `${T().subj[subj]} · ${GRADE_LABEL(level)}`, intro: (subj === 'math' ? T().mathIntro + ' ' + T().readAloud : T().elaIntro), items: data.items,
        stepLabel: T().step(n), last: false,
      });
      const sc = await api('/api/diag-score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: subj, level, answers: ans }) });
      state.blocks.push({ level, units: sc.units, pct: sc.pct });
      const step = C.next(state);
      if (step.action === 'done') { S.results[subj] = step.result; return; }
      if (step.ext) state.ext = step.ext;
      level = step.level;
    }
    throw new Error('Demasiados bloques');
  }

  async function runComp() {
    const band = S.grade <= 3 ? 1 : S.grade <= 6 ? 2 : S.grade <= 9 ? 3 : 4;
    const areas = S.track === 'dual' ? ['ei'] : null;
    const q = `/api/diag-items?subject=comp&level=${band}&lang=${LANG}${S.bible ? '&bible=1' : ''}${S.us ? '&us=1' : ''}${areas ? '&areas=' + areas.join(',') : ''}`;
    const data = await api(q);
    const ans = await askBlock({ title: T().subj.comp, intro: T().compIntro, items: data.items, stepLabel: '', last: true });
    const sc = await api('/api/diag-score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: 'comp', level: band, answers: ans, bible: S.bible, us: S.us, areas }) });
    const by = {};
    sc.units.forEach((u) => { const a = u.area || 'x'; by[a] = by[a] || { c: 0, t: 0 }; by[a].t++; if (u.correct) by[a].c++; });
    S.comp = { band, by, total: sc.total, correct: sc.correct };
  }

  // ── Resultados ────────────────────────────────────────────────────────────
  const SD = () => ({ ...S.form, curso: S.form.curso === '' ? '' : GRADE_LABEL(Number(S.form.curso)) });
  function eqFor(level) { return C.equivalences(level, S.map) || null; }

  // Unidad de aprendizaje (LU): el concepto Chanak. ACE/PACE, CLE y LIFEPAC son solo referencia.
  const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
  const luText = (lu, k) => (lu && lu[k] ? cap(lu[k][LANG] || lu[k].en || '') : '');
  const luConcept = (g) => luText(g.lu, 'concept') || g.skill || '';
  const pct = (x) => Math.round((x || 0) * 100);
  const bar = (p) => `<div class="abb"><div class="abf ${p >= 80 ? 'f-verde' : p >= 65 ? 'f-azul' : p >= 50 ? 'f-amarillo' : 'f-rojo'}" style="width:${p}%"></div></div>`;

  function finalizeResults() {
    const sum = {};
    ['math', 'ela'].forEach((s) => {
      const r = S.results[s]; if (!r) return;
      const level = r.kinder || r.abcs ? 0 : r.performanceLevel;
      sum[s] = { level, eq: eqFor(level), res: r };
    });
    S.summary = sum;
  }

  function subjectCard(s) {
    const x = S.summary[s]; if (!x) return '';
    const r = x.res; const eq = x.eq; const lvl = x.level;
    const key = s === 'ela' ? 'english' : 'math';
    const deduced = eq && eq.ace[key] && eq.ace[key].status === 'deducido';
    const notes = [];
    let head;
    if (r.kinder) { head = `${esc(T().workLevel)}: <strong>Kindergarten</strong>`; notes.push(T().kinderRec); }
    else if (r.abcs) { head = `${esc(T().workLevel)}: <strong>Kindergarten ✓</strong>`; notes.push(T().abcsOk); }
    else {
      const at = r.continueAt;
      head = `${esc(T().workLevel)}: <strong>${esc(GRADE_LABEL(lvl))}</strong>` + (at ? `<br>${esc(T().continueAt)}: <span class="lu-chip">${esc(at.id)}</span> ${esc(luText(at, 'concept'))}` : '');
    }
    if (r.capped) notes.push(T().cappedNote);
    if (s === 'ela' && (r.kinder || (r.found && r.performanceLevel <= 1 && S.grade >= 3))) notes.push(T().abcRec);
    if (deduced) notes.push(T().deduced);
    const gaps = r.gaps || [];
    const gapCards = gaps.length
      ? `<div class="lu-list">${gaps.map((g) => `<div class="lu-item"><div class="lu-top"><span class="lu-chip">${esc(g.lu ? g.lu.id : '')}</span><span class="lu-lvl">${esc(GRADE_LABEL(g.level))}</span></div><div class="lu-concept">${esc(luConcept(g))}</div>${luText(g.lu, 'tip') ? `<div class="lu-tip"><strong>${esc(T().practice)}:</strong> ${esc(luText(g.lu, 'tip'))}</div>` : ''}</div>`).join('')}</div>`
      : `<p class="muted">${esc(T().noGaps)}</p>`;
    const lv = r.tested.map((l) => `<div class="arow"><div class="aname">${esc(GRADE_LABEL(l))}</div>${bar(pct(r.levelPct[l]))}<div class="apct">${pct(r.levelPct[l])}%</div></div>`).join('');
    // Referencias externas: abajo y en pequeño
    const refGaps = gaps.length ? `<tr><td><strong>${LANG === 'es' ? 'Lagunas (ACE PACE)' : 'Gaps (ACE PACE)'}</strong></td><td>${gaps.map((g) => `${esc(g.lu ? g.lu.id : '')} → ${g.pace}`).join(' · ')}</td></tr>` : '';
    const refPerf = !r.kinder && !r.abcs && r.performancePace ? `<tr><td><strong>${LANG === 'es' ? 'Continuar (ACE PACE)' : 'Continue (ACE PACE)'}</strong></td><td>${r.performancePace}</td></tr>` : '';
    const eqRows = eq ? `
      <tr><td><strong>ACE</strong></td><td>PACE ${eq.ace[key].pace_range[0]}–${eq.ace[key].pace_range[1]}</td></tr>
      <tr><td><strong>CLE</strong></td><td>${s === 'ela' ? 'Language Arts' : 'Math'} ${eq.cle.languageArts * 100}</td></tr>
      <tr><td><strong>LIFEPAC</strong></td><td>${s === 'ela' ? 'Language Arts' : 'Math'} ${eq.lifepac}</td></tr>
      <tr><td><strong>Florida</strong></td><td>${esc(eq.florida)}${gaps.length ? ' · ' + [...new Set(gaps.map((g) => g.strand).filter(Boolean))].map(esc).join(', ') : ''}</td></tr>
      <tr><td><strong>Chanak</strong></td><td>${esc(SCOPE[s][LANG][lvl] || '')}</td></tr>` : '';
    return `<div class="icard subj"><h4>${esc(T().subj[s])}</h4><p>${head}</p>
      ${notes.map((n) => `<div class="note">${esc(n)}</div>`).join('')}
      <h5>${esc(T().gaps)} (${gaps.length})</h5>${gapCards}
      <div class="areas-list" style="margin-top:14px">${lv}</div>
      ${(eqRows || refGaps || refPerf) ? `<details class="refs"><summary>${esc(T().refs)}</summary><table class="equiv-t"><tbody>${refGaps}${refPerf}${eqRows}</tbody></table></details>` : ''}</div>`;
  }

  function renderResults() {
    if (!S.summary) return;
    const f = SD(); const fecha = new Date().toLocaleDateString(LANG === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' });
    $('r-name').textContent = f.nombre; $('r-meta').textContent = `${f.curso} · ${f.pais || ''} · ${fecha}`;
    const alerts = [];
    if (S.form.ingles === 'no') alerts.push(T().skipENG, T().abcRec);
    $('r-alerts').innerHTML = alerts.map((a) => `<div class="note">${esc(a)}</div>`).join('');
    $('r-subjects').innerHTML = ['math', 'ela'].map(subjectCard).join('');
    // Áreas complementarias
    let comp = '';
    if (S.comp) {
      const rows = Object.entries(S.comp.by).map(([a, v]) => { const p = pct(v.c / v.t); return `<div class="arow"><div class="aname">${esc((AREA[LANG] || AREA.es)[a] || a)}</div>${bar(p)}<div class="apct">${p}%</div></div>`; });
      comp = `<h3 class="subsec">${esc(T().subj.comp)}</h3><div class="areas-list">${rows.join('')}</div>`;
    }
    $('r-comp').innerHTML = comp;
    S.pei = buildPeiPayload();
  }

  // ── PEI y SIS ─────────────────────────────────────────────────────────────
  function strengthsAndNeeds() {
    const strong = [], need = [];
    ['math', 'ela'].forEach((s) => { const r = S.results[s]; if (!r) return; const p = r.overallPct != null ? r.overallPct : (r.kPct || 0); (p >= 0.8 ? strong : need).push(T().subj[s]); });
    if (S.comp) Object.entries(S.comp.by).forEach(([a, v]) => { (v.c / v.t >= 0.7 ? strong : need).push((AREA[LANG] || AREA.es)[a] || a); });
    return { strong, need };
  }
  const luOut = (lu) => (lu ? { id: lu.id, concept: lu.concept, tip: lu.tip } : null);
  function buildPeiPayload() {
    const f = SD(); const sn = strengthsAndNeeds();
    const lines = [], plan = [];
    ['math', 'ela'].forEach((s) => {
      const x = S.summary[s]; if (!x) return; const r = x.res; const lbl = T().subj[s];
      const cons = (r.gaps || []).map((g) => `${g.lu ? g.lu.id : ''} ${luConcept(g)}`.trim());
      if (r.kinder) { lines.push(`${lbl}: Kindergarten program`); plan.push(`${lbl}: Kindergarten`); return; }
      if (r.abcs) { lines.push(`${lbl}: Kindergarten ✓ → Level 1`); plan.push(`${lbl}: Level 1`); return; }
      const at = r.continueAt ? r.continueAt.id : '';
      lines.push(`${lbl}: ${GRADE_LABEL(x.level)}${at ? ' · ' + at : ''}${cons.length ? ' · ' + (LANG === 'es' ? 'reforzar' : 'reinforce') + ': ' + cons.join('; ') : ''}`);
      plan.push(`${lbl}: ${cons.length ? (LANG === 'es' ? 'reforzar ' : 'reinforce ') + cons.map((c) => c.split(' ')[0]).join(', ') + ' → ' : ''}${at}`);
    });
    return {
      source: 'chanak-diagnostico-v2', version: '2.1', date: new Date().toISOString().slice(0, 10),
      student: { name: f.nombre, birth_date: f.fecha || null, age: f.edad || null, declared_grade: Number(S.form.curso), country: f.pais || null, home_languages: f.idiomas || null, previous_school: f.centro || null },
      family: { guardian_name: f.tutor || null, email: f.email || null },
      track: S.track, english_reading_level: S.form.ingles, ui_language: LANG, us_version: S.us, mentor: f.mentor,
      subjects: ['math', 'ela'].filter((s) => S.summary[s]).map((s) => {
        const r = S.summary[s].res; const eq = S.summary[s].eq; const key = s === 'ela' ? 'english' : 'math';
        return {
          subject: s, working_level: S.summary[s].level, kinder: r.kinder, abcs: r.abcs, found: r.found, capped: r.capped,
          continue_at: luOut(r.continueAt), tested_levels: r.tested, level_pct: r.levelPct,
          learning_units_to_reinforce: (r.gaps || []).map((g) => ({ ...luOut(g.lu), level: g.level, strand: g.strand, refs: { ace_pace: g.pace } })),
          references: { ace_performance_pace: r.performancePace || null, ace_range: eq ? eq.ace[key].pace_range : null, cle_level: eq ? eq.cle.languageArts * 100 : null, lifepac_level: eq ? eq.lifepac : null, florida: eq ? eq.florida : null },
        };
      }),
      complementary: S.comp ? Object.fromEntries(Object.entries(S.comp.by).map(([a, v]) => [a, { correct: v.c, total: v.t }])) : null,
      pei_fields: {
        diagnostic_results: lines.join('\n'), strength_areas: sn.strong.join(', '), improvement_areas: sn.need.join(', '),
        subject_plan: plan.join('\n'), vocational_interest: f.intereses || null, required_adaptations: S.form.ingles === 'no' ? 'Reading – ABC (English reading readiness)' : null,
        curriculum_base: 'Chanak Learning Units (mastery-based)', grade_level: GRADE_LABEL(Number(S.form.curso)),
      },
    };
  }

  window.generatePEI = () => {
    const p = S.pei || buildPeiPayload(); S.pei = p; const f = SD();
    const mObs = $('m-obs').value || (LANG === 'es' ? 'Sin observaciones registradas.' : 'No observations recorded.');
    const mRec = $('m-rec').value || (LANG === 'es' ? 'Sin recomendación registrada.' : 'No recommendation recorded.');
    const fecha = new Date().toLocaleDateString(LANG === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' });
    const sn = strengthsAndNeeds();
    const L = LANG === 'es'
      ? { title: 'Plan Educativo Individualizado', issued: 'Emitido', student: 'Estudiante', age: 'Edad / Curso declarado', country: 'País de referencia', mentor: 'Mentor / Evaluador', start: 'Punto de partida por materia', summary: 'Resumen diagnóstico', strengths: 'Fortalezas', needs: 'Áreas a reforzar', goals: 'Objetivos prioritarios', plan: 'Plan de 8–12 semanas', obs: 'Observación del mentor', rec: 'Recomendación del mentor', voc: 'Intereses y vocación', sign: 'Firmas', y: 'años', none: '—', concepts: 'Conceptos a reforzar antes de avanzar', refs: 'Referencias (solo orientativas)' }
      : { title: 'Individualized Education Plan', issued: 'Issued', student: 'Student', age: 'Age / Declared grade', country: 'Reference country', mentor: 'Mentor / Evaluator', start: 'Starting point by subject', summary: 'Diagnostic summary', strengths: 'Strengths', needs: 'Areas to strengthen', goals: 'Priority goals', plan: '8–12 week plan', obs: "Mentor's observation", rec: "Mentor's recommendation", voc: 'Interests and vocation', sign: 'Signatures', y: 'years', none: '—', concepts: 'Concepts to reinforce before moving on', refs: 'References (indicative only)' };
    const subs = ['math', 'ela'].filter((s) => S.summary[s]);
    const startRows = subs.map((s) => {
      const x = S.summary[s]; const r = x.res;
      const where = r.kinder ? 'Kindergarten' : r.abcs ? 'Kindergarten ✓ → Level 1' : `${GRADE_LABEL(x.level)}${r.continueAt ? ' · ' + r.continueAt.id : ''}`;
      return `<tr><td><strong>${esc(T().subj[s])}</strong></td><td>${esc(where)}</td><td>${esc(String((r.gaps || []).length))}</td></tr>`;
    }).join('');
    const conceptBlocks = subs.map((s) => {
      const r = S.results[s]; if (!r || !r.gaps || !r.gaps.length) return '';
      return `<h5 class="pei-h5">${esc(T().subj[s])}</h5><div class="lu-list">${r.gaps.map((g) => `<div class="lu-item"><div class="lu-top"><span class="lu-chip">${esc(g.lu ? g.lu.id : '')}</span><span class="lu-lvl">${esc(GRADE_LABEL(g.level))}</span></div><div class="lu-concept">${esc(luConcept(g))}</div>${luText(g.lu, 'tip') ? `<div class="lu-tip"><strong>${esc(T().practice)}:</strong> ${esc(luText(g.lu, 'tip'))}</div>` : ''}</div>`).join('')}</div>`;
    }).join('');
    const goals = [];
    subs.forEach((s) => { const r = S.results[s]; if (r && r.gaps && r.gaps.length) goals.push(LANG === 'es' ? `${T().subj[s]}: reforzar ${r.gaps.length} concepto(s) antes de avanzar (${r.gaps.map((g) => g.lu && g.lu.id).filter(Boolean).join(', ')}).` : `${T().subj[s]}: reinforce ${r.gaps.length} concept(s) before moving on (${r.gaps.map((g) => g.lu && g.lu.id).filter(Boolean).join(', ')}).`); });
    if (S.form.ingles === 'no') goals.push(T().abcRec);
    goals.push(LANG === 'es' ? 'Aprendizaje por dominio (80 %) con revisión semanal del progreso.' : 'Mastery learning (80%) with weekly progress review.');
    goals.push(LANG === 'es' ? 'Fortalecer autonomía de estudio, hábitos y carácter (Life Skills & Leadership).' : 'Strengthen study autonomy, habits and character (Life Skills & Leadership).');
    const weeks = LANG === 'es'
      ? [['Semanas 1–2', 'Presentación del plan a la familia, línea base y asignación de las unidades de aprendizaje a reforzar.'], ['Semanas 3–5', 'Reforzar los conceptos prioritarios con aprendizaje por dominio; revisión semanal con el mentor.'], ['Semanas 6–8', 'Avanzar a las unidades del nivel de trabajo en Matemáticas e Inglés y consolidar las áreas complementarias.'], ['Semanas 9–12', 'Evaluación de progreso, ajuste del plan y nueva evaluación si el alumno domina las unidades con 94 % o más.']]
      : [['Weeks 1–2', 'Plan presentation to the family, baseline and assignment of the learning units to reinforce.'], ['Weeks 3–5', 'Reinforce the priority concepts with mastery learning; weekly mentor review.'], ['Weeks 6–8', 'Move into the working-level units in Math and English; consolidate additional areas.'], ['Weeks 9–12', 'Progress evaluation, plan adjustment and re-assessment if the student masters the units at 94% or higher.']];
    const refRows = subs.map((s) => {
      const x = S.summary[s]; const r = x.res; const eq = x.eq; const key = s === 'ela' ? 'english' : 'math';
      if (!eq) return '';
      const gp = (r.gaps || []).map((g) => g.pace).join(', ');
      return `<tr><td><strong>${esc(T().subj[s])}</strong></td><td>ACE ${eq.ace[key].pace_range[0]}–${eq.ace[key].pace_range[1]}${r.performancePace ? ' · ' + r.performancePace : ''}${gp ? ' (' + gp + ')' : ''}</td><td>CLE ${eq.cle.languageArts * 100}</td><td>LIFEPAC ${eq.lifepac}</td><td>${esc(eq.florida)}</td></tr>`;
    }).join('');
    $('pei-content').innerHTML = `
<div class="pei-hdr"><div class="pei-la"><div class="pei-lb">CIA</div><div class="pei-org"><strong>Chanak International Academy</strong>FLDOE #134620 · ${LANG === 'es' ? 'Evaluación Diagnóstica' : 'Diagnostic Assessment'}</div></div><div class="pei-ta"><h2>${L.title}</h2><span>${L.issued}: ${esc(fecha)}</span></div></div>
<div class="pei-dg">
  <div class="pdi"><label>${L.student}</label><p>${esc(f.nombre)}</p></div>
  <div class="pdi"><label>${L.age}</label><p>${esc(f.edad || '—')} ${L.y} · ${esc(f.curso)}</p></div>
  <div class="pdi"><label>${L.country}</label><p>${esc(f.pais || '—')}</p></div>
  <div class="pdi"><label>${L.mentor}</label><p>${esc(f.mentor)}</p></div>
  <div class="pdi"><label>Track</label><p>${S.track === 'dual' ? 'Dual Diploma' : 'Off-Campus'}</p></div>
  <div class="pdi"><label>${LANG === 'es' ? 'Duración del plan' : 'Plan length'}</label><p>8–12 ${LANG === 'es' ? 'semanas' : 'weeks'}</p></div>
</div>
<div class="pblk"><h3>${L.start}</h3><table class="equiv-t"><thead><tr><th>${LANG === 'es' ? 'Materia' : 'Subject'}</th><th>${LANG === 'es' ? 'Nivel de trabajo y unidad' : 'Working level and unit'}</th><th>${LANG === 'es' ? 'Conceptos a reforzar' : 'Concepts to reinforce'}</th></tr></thead><tbody>${startRows}</tbody></table></div>
${conceptBlocks ? `<div class="pblk"><h3>${L.concepts}</h3>${conceptBlocks}</div>` : ''}
<div class="pblk"><h3>${L.summary}</h3><div class="pbox"><strong>${L.strengths}:</strong> ${esc(sn.strong.join(', ') || L.none)}<br><strong>${L.needs}:</strong> ${esc(sn.need.join(', ') || L.none)}<br><br><em>${L.obs}: ${esc(mObs)}</em></div></div>
<div class="pblk"><h3>${L.goals}</h3><ul class="plist">${goals.map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>
<div class="pblk"><h3>${L.plan}</h3><div class="sem-grid">${weeks.map(([a, b]) => `<div class="scard"><div class="per">${a}</div><p>${esc(b)}</p></div>`).join('')}</div></div>
${f.intereses ? `<div class="pblk"><h3>${L.voc}</h3><div class="pbox">${esc(f.intereses)}</div></div>` : ''}
<div class="pblk"><h3>${L.rec}</h3><div class="pbox">${esc(mRec)}</div></div>
<div class="pblk"><h3>${L.sign}</h3><div class="sign-row"><div>${LANG === 'es' ? 'Dirección' : 'Director'}<span></span></div><div>Mentor<span></span></div><div>${LANG === 'es' ? 'Familia' : 'Family'}<span></span></div></div></div>
${refRows ? `<div class="pblk refs-foot"><h3>${L.refs}</h3><table class="equiv-t"><tbody>${refRows}</tbody></table></div>` : ''}`;
    showSection('pei');
  };

  window.buildCert = () => {
    const f = SD(); const fecha = new Date().toLocaleDateString(LANG === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' });
    const rows = ['math', 'ela'].filter((s) => S.summary[s]).map((s) => { const x = S.summary[s]; const r = x.res; return `<div class="cf"><div class="cl">${esc(T().subj[s])}</div><div class="cv">${r.kinder ? 'Kindergarten' : esc(GRADE_LABEL(x.level)) + (r.performancePace ? ' · PACE ' + r.performancePace : '')}</div></div>`; }).join('');
    $('cert-content').innerHTML = `<div class="cert-wrap"><div class="cert-in">
      <div class="cert-top"><div class="cert-la"><div class="cert-lb">CIA</div><div><div class="cert-on">Chanak International Academy</div><div class="cert-or">FLDOE Reg. #134620 · MSA-CESS · Florida, USA</div></div></div><div class="cert-badge-box"><div class="tp">${LANG === 'es' ? 'Diagnóstico' : 'Diagnostic'}</div><div class="yr">${new Date().getFullYear()}</div></div></div>
      <div class="cert-body"><div class="cert-pre">${LANG === 'es' ? 'CERTIFICA QUE EL / LA ESTUDIANTE' : 'THIS CERTIFIES THAT THE STUDENT'}</div><div class="cert-sn">${esc(f.nombre)}</div>
      <p class="cert-txt">${LANG === 'es' ? 'ha completado la <strong>Evaluación Diagnóstica Académica</strong> de Chanak International Academy. Los niveles de desempeño orientativos son:' : 'has completed the Chanak International Academy <strong>Academic Diagnostic Assessment</strong>. The indicative performance levels are:'}</p></div>
      <div class="cert-fg">${rows}<div class="cf"><div class="cl">${LANG === 'es' ? 'Curso declarado' : 'Declared grade'}</div><div class="cv">${esc(f.curso)}</div></div><div class="cf"><div class="cl">${LANG === 'es' ? 'Fecha' : 'Date'}</div><div class="cv">${esc(fecha)}</div></div><div class="cf"><div class="cl">Mentor</div><div class="cv">${esc(f.mentor)}</div></div></div>
      <div class="legal">${LANG === 'es' ? 'Documento orientativo y diagnóstico. No es una calificación oficial ni una homologación académica.' : 'Indicative diagnostic document. It is not an official grade or academic validation.'}</div></div></div>`;
    showSection('cert');
  };

  window.copySIS = () => {
    const txt = JSON.stringify(S.pei || buildPeiPayload(), null, 2);
    const done = () => alert(LANG === 'es' ? '✓ Datos copiados. Pégalos en el SIS (Importar diagnóstico).' : '✓ Data copied. Paste it into the SIS (Import diagnostic).');
    navigator.clipboard.writeText(txt).then(done).catch(() => { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done(); });
  };

  window.sendToFamily = async () => {
    const email = (S.form.email || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert(LANG === 'es' ? 'Falta un correo válido de la familia en el formulario.' : 'A valid family email is missing from the form.'); return; }
    let key = ''; try { key = sessionStorage.getItem('diag_staff_key') || ''; } catch { /* ignore */ }
    if (!key) { key = prompt(LANG === 'es' ? 'Clave del personal de Chanak para enviar el informe:' : 'Chanak staff key to send the report:') || ''; if (!key) return; }
    try {
      const r = await fetch('/api/diag-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, to: email, lang: LANG, payload: S.pei || buildPeiPayload() }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { alert((LANG === 'es' ? 'No se pudo enviar: ' : 'Could not send: ') + (j.error || r.status)); try { sessionStorage.removeItem('diag_staff_key'); } catch { /* ignore */ } return; }
      try { sessionStorage.setItem('diag_staff_key', key); } catch { /* ignore */ }
      alert(LANG === 'es' ? '✓ Informe enviado a la familia.' : '✓ Report sent to the family.');
    } catch { alert(T().netError); }
  };

  document.addEventListener('DOMContentLoaded', () => { applyLang(); _show('landing'); });
})();
