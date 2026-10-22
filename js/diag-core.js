/* Lógica pura del diagnóstico Chanak (sin DOM ni red): punto de partida, detección de nivel de desempeño
   y lagunas al estilo ACE, y equivalencias. Funciona en el navegador y en Node (pruebas). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DiagCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MASTERY = 0.8; // dominio Chanak = ACE (mínimo ≈ 80 %)
  const RUN = 3;       // ACE: tres o más PACE seguidos por debajo del mínimo marcan el nivel de desempeño

  // Primaria (grados 1-6): empezar 3 niveles por debajo; secundaria (7-12): 5 por debajo (ACE Procedures Manual I).
  function startLevel(grade) {
    const g = Number(grade);
    if (!Number.isFinite(g) || g <= 0) return 0;
    const back = g <= 6 ? 3 : 5;
    return Math.max(0, g - back);
  }

  const paceLevel = (pace) => Math.floor((pace - 1001) / 12) + 1;
  const paceRange = (level) => [1001 + 12 * (level - 1), 1012 + 12 * (level - 1)];

  // blocks: [{ level, units: [{ ace, correct, skill, strand }] }] (niveles ≥ 1). Devuelve la secuencia de PACE evaluados.
  function sequence(blocks) {
    return blocks
      .filter((b) => b.level >= 1)
      .slice()
      .sort((a, b) => a.level - b.level)
      .flatMap((b) => b.units.filter((u) => u.ace).slice().sort((x, y) => x.ace - y.ace).map((u) => ({ ...u, level: b.level })));
  }

  function findRun(seq) {
    let run = 0, startIdx = -1;
    for (let i = 0; i < seq.length; i++) {
      if (!seq[i].correct) {
        if (run === 0) startIdx = i;
        run++;
        if (run >= RUN) return startIdx;
      } else run = 0;
    }
    return -1;
  }

  // Decide el siguiente paso del test de una materia.
  // → { action: 'ask', level } | { action: 'done', result }
  function next(state) {
    const { grade, blocks } = state;
    const g = Number(grade) || 0;
    const tested = blocks.map((b) => b.level);
    const k = blocks.find((b) => b.level === 0);

    if (k) {
      const kp = k.units.length ? k.units.filter((u) => u.correct).length / k.units.length : 0;
      if (kp < MASTERY) return { action: 'done', result: finish(state, { kinder: true, kPct: kp }) };
      if (g === 0) return { action: 'done', result: finish(state, { abcs: true, kPct: kp }) };
      if (!tested.includes(1)) return { action: 'ask', level: 1 };
    }

    const seq = sequence(blocks);
    const idx = findRun(seq);
    const firstLevel = Math.min(...tested.filter((l) => l >= 1));
    if (idx >= 0) {
      if (idx === 0 && Number.isFinite(firstLevel) && firstLevel > 1 && (state.ext || 0) < 2) {
        return { action: 'ask', level: firstLevel - 1, ext: (state.ext || 0) + 1 };
      }
      return { action: 'done', result: finish(state, { runIdx: idx }) };
    }
    const maxLevel = Math.max(...tested);
    if (maxLevel < g) return { action: 'ask', level: maxLevel + 1 };
    return { action: 'done', result: finish(state, { runIdx: -1 }) };
  }

  function finish(state, info) {
    const { grade, blocks } = state;
    const g = Number(grade) || 0;
    const seq = sequence(blocks);
    const levelPct = {};
    blocks.forEach((b) => {
      levelPct[b.level] = b.units.length ? b.units.filter((u) => u.correct).length / b.units.length : 0;
    });
    const res = { grade: g, start: startLevel(g), tested: blocks.map((b) => b.level).sort((a, b) => a - b), levelPct, kinder: !!info.kinder, abcs: !!info.abcs, kPct: info.kPct ?? null };
    if (info.kinder || info.abcs) {
      res.found = false; res.performanceLevel = 0; res.performancePace = null; res.gaps = []; res.capped = false;
      return res;
    }
    let perfPace, found = false;
    if (info.runIdx >= 0) { found = true; perfPace = seq[info.runIdx].ace; }
    else perfPace = paceRange(Math.max(1, g))[0]; // sin tres seguidos: se ubica al inicio del grado declarado (tope por edad)
    res.found = found;
    res.performancePace = perfPace;
    res.performanceLevel = paceLevel(perfPace);
    // La unidad de aprendizaje (LU) es el concepto Chanak; el PACE queda solo como referencia.
    res.gaps = seq.filter((u) => !u.correct && (found ? u.ace < perfPace : true))
      .map((u) => ({ lu: u.lu || null, level: u.level, strand: u.strand || null, florida_code: u.florida_code || null, pace: u.ace, skill: u.skill }));
    const at = seq.find((u) => u.ace === perfPace);
    res.continueAt = at && at.lu ? at.lu : null;
    const total = seq.length;
    const ok = seq.filter((u) => u.correct).length;
    res.overallPct = total ? ok / total : 0;
    res.capped = !found && res.overallPct >= 0.9; // nunca se prescribe por encima del grado cronológico
    return res;
  }

  // Equivalencias de un nivel (grado) según data/placement-map.json
  function equivalences(level, map) {
    const e = map && map.grades && map.grades[String(level)];
    if (!e) return null;
    const cle = e.cle_language_arts;
    return {
      level,
      ace: { english: e.ace.english, math: e.ace.math },
      cle: cle ? { languageArts: cle.level, minimum: cle.minimum, possible: cle.possible } : { languageArts: level, minimum: null, possible: null },
      lifepac: e.lifepac_level,
      florida: level === 0 ? 'Kindergarten' : (level <= 5 ? `Grade ${level} (elementary)` : level <= 8 ? `Grade ${level} (middle)` : `Grade ${level} (high school)`),
    };
  }


  // ── Prueba de nivel de inglés (CEFR) para Dual Diploma ──────────────────
  const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const CEFR_PASS = 0.65;
  // blocks: [{ level: 1..6, units: [{ correct, area, lu }] }] en orden. Decide si hay que seguir con el siguiente nivel.
  function cefrNext(blocks) {
    const p = (b) => (b.units.length ? b.units.filter((u) => u.correct).length / b.units.length : 0);
    const n = blocks.length;
    if (n === 0) return { action: 'ask', level: 1 };
    const last = blocks[n - 1];
    if (last.level >= 6) return { action: 'done' };
    const pl = p(last);
    if (pl < 0.35) return { action: 'done' };
    if (n >= 2 && pl < 0.5 && p(blocks[n - 2]) < 0.5) return { action: 'done' };
    return { action: 'ask', level: last.level + 1 };
  }
  function cefrResult(blocks) {
    const sorted = blocks.slice().sort((a, b) => a.level - b.level);
    const pct = {};
    sorted.forEach((b) => { pct[CEFR[b.level - 1]] = b.units.length ? b.units.filter((u) => u.correct).length / b.units.length : 0; });
    let reached = 0;
    for (const b of sorted) {
      if (b.level !== reached + 1) break;
      if (pct[CEFR[b.level - 1]] >= CEFR_PASS) reached = b.level; else break;
    }
    const nextCode = CEFR[reached];
    const borderline = !!nextCode && pct[nextCode] !== undefined && pct[nextCode] >= 0.45 && pct[nextCode] < CEFR_PASS;
    const areas = {};
    sorted.forEach((b) => b.units.forEach((u) => { const a = u.area || 'x'; areas[a] = areas[a] || { c: 0, t: 0 }; areas[a].t++; if (u.correct) areas[a].c++; }));
    // Conceptos a reforzar: fallos hasta un nivel por encima del alcanzado (lo que consolida el nivel y prepara el siguiente).
    const gaps = sorted.filter((b) => b.level <= Math.min(6, reached + 1))
      .flatMap((b) => b.units.filter((u) => !u.correct).map((u) => ({ lu: u.lu || null, level: b.level, cefr: CEFR[b.level - 1], area: u.area || null })));
    return { level: reached, code: reached ? CEFR[reached - 1] : 'Pre-A1', borderline, nextCode: nextCode || null, pct, areas, gaps, tested: sorted.map((b) => CEFR[b.level - 1]) };
  }

  return { CEFR, CEFR_PASS, cefrNext, cefrResult, MASTERY, RUN, startLevel, paceLevel, paceRange, sequence, findRun, next, finish, equivalences };
});
