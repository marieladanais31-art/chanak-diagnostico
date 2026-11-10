// GET /api/diag-exam?grade=2..12&track=off|dual&bible=0|1&spa=0|1&lang=en|es&k=<token>
// Devuelve el paquete completo de la evaluación diagnóstica para su versión imprimible / PDF.
const { itemsFor, publicItem, SUBJECTS } = require('./_lib/bank');
const supa = require('./_lib/supa');
const C = require('../js/diag-core.js');

const GRADE_LABELS = {
  0: 'Kindergarten', 1: '1.º / Grade 1', 2: '2.º / Grade 2', 3: '3.º / Grade 3',
  4: '4.º / Grade 4', 5: '5.º / Grade 5', 6: '6.º / Grade 6', 7: '7.º / Grade 7',
  8: '8.º / Grade 8', 9: '9.º / Grade 9', 10: '10.º / Grade 10', 11: '11.º / Grade 11',
  12: '12.º / Grade 12'
};

const CEFR_LABELS = {
  1: 'A1 · Beginner / Principiante',
  2: 'A2 · Elementary / Básico',
  3: 'B1 · Intermediate / Intermedio',
  4: 'B2 · Upper Intermediate / Intermedio Alto',
  5: 'C1 · Advanced / Avanzado',
  6: 'C2 · Mastery / Dominio'
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'Usa GET' }); return; }

  const q = req.query || {};
  let track = q.track === 'dual' ? 'dual' : 'off';
  let grade = Number.isInteger(Number(q.grade)) ? Math.min(12, Math.max(2, Number(q.grade))) : 5;
  const lang = q.lang === 'es' ? 'es' : 'en';
  const includeBible = q.bible === '1';
  const includeSpa = q.spa === '1';
  const us = true;

  let student = {
    name: String(q.name || '').trim(),
    email: String(q.email || '').trim(),
    token: String(q.k || '').trim(),
    verified: false,
    grade,
    track
  };

  // Si se envió token k, consultar en base de datos si es posible
  if (student.token && /^[0-9a-f]{16,64}$/.test(student.token)) {
    try {
      if (supa.configured()) {
        const info = await supa.rpc('diagnostic_link_info', { p_token: student.token });
        if (info && info.valid) {
          student.verified = true;
          if (info.student_name) student.name = info.student_name;
          if (info.family_email) student.email = info.family_email;
          if (info.declared_grade != null) {
            grade = Math.min(12, Math.max(2, Number(info.declared_grade)));
            student.grade = grade;
          }
          if (info.track) {
            track = info.track;
            student.track = track;
          }
        }
      }
    } catch (e) {
      console.warn('[diag-exam] error verificando token:', e.message);
    }
  }

  const sections = [];

  if (track === 'dual') {
    // ── CEFR English Evaluation (A1..C2) ──
    const cefrLevels = [1, 2, 3, 4, 5, 6];
    const cefrGroup = [];
    for (const lvl of cefrLevels) {
      const raw = itemsFor('cefr', lvl).sort((a, b) => a.id.localeCompare(b.id));
      if (raw.length) {
        cefrGroup.push({
          level: lvl,
          label: CEFR_LABELS[lvl] || `Level ${lvl}`,
          items: raw.map(it => publicItem(it, lang, us))
        });
      }
    }
    sections.push({
      id: 'cefr',
      subject: 'cefr',
      title: lang === 'es' ? 'Evaluación de Nivel de Inglés (MCER · A1 a C2)' : 'English Language Proficiency Assessment (CEFR · A1 to C2)',
      instructions: lang === 'es'
        ? 'Lee atentamente cada enunciado y selecciona la opción que complete correctamente la oración o responda la pregunta de lectura. Marca con una X la opción elegida.'
        : 'Read each sentence carefully and select the best answer to complete the sentence or answer the reading comprehension question. Mark your choice with an X.',
      levels: cefrGroup
    });

    // Emotional intelligence / complementaria para Dual
    const eiRaw = itemsFor('comp', 4, { areas: ['ei'] });
    if (eiRaw.length) {
      sections.push({
        id: 'comp',
        subject: 'comp',
        title: lang === 'es' ? 'Inteligencia Emocional y Hábitos de Aprendizaje' : 'Emotional Intelligence & Learning Habits',
        instructions: lang === 'es'
          ? 'Responde con sinceridad. No hay respuestas correctas o incorrectas; nos ayuda a conocer tu estilo de aprendizaje.'
          : 'Answer honestly. There are no right or wrong answers; this helps us understand your learning style.',
        levels: [{
          level: 4,
          label: lang === 'es' ? 'Cuestionario de Orientación' : 'Guidance Questionnaire',
          items: eiRaw.map(it => publicItem(it, lang, us))
        }]
      });
    }
  } else {
    // ── Off-Campus K-12 Program ──
    const startLvl = C.startLevel(grade);

    // 1. Matemáticas
    const mathLevels = [];
    for (let lvl = startLvl; lvl <= grade; lvl++) {
      const raw = itemsFor('math', lvl).sort((a, b) => (a.ace || 0) - (b.ace || 0) || a.id.localeCompare(b.id));
      if (raw.length) {
        mathLevels.push({
          level: lvl,
          label: `${GRADE_LABELS[lvl] || `Grade ${lvl}`}${lvl === startLvl ? ' (Punto de partida / Starting Level)' : ''}${lvl === grade ? ' (Grado actual / Current Grade)' : ''}`,
          items: raw.map(it => publicItem(it, lang, us))
        });
      }
    }
    sections.push({
      id: 'math',
      subject: 'math',
      title: lang === 'es' ? 'Matemáticas / Mathematics' : 'Mathematics / Matemáticas',
      instructions: lang === 'es'
        ? 'Resuelve cada ejercicio en el espacio de procedimiento y anota tu respuesta final. En preguntas de opción múltiple, marca la opción correcta. Si aún no has aprendido algún tema, puedes dejarlo en blanco.'
        : 'Solve each problem in the work space and write your final answer. For multiple-choice questions, mark the correct option with an X. If you have not learned a topic yet, you may leave it blank.',
      levels: mathLevels
    });

    // 2. Inglés y Lectura (ELA)
    const elaLevels = [];
    for (let lvl = startLvl; lvl <= grade; lvl++) {
      const raw = itemsFor('ela', lvl).sort((a, b) => (a.ace || 0) - (b.ace || 0) || a.id.localeCompare(b.id));
      if (raw.length) {
        elaLevels.push({
          level: lvl,
          label: `${GRADE_LABELS[lvl] || `Grade ${lvl}`}${lvl === startLvl ? ' (Punto de partida / Starting Level)' : ''}${lvl === grade ? ' (Grado actual / Current Grade)' : ''}`,
          items: raw.map(it => publicItem(it, lang, us))
        });
      }
    }
    sections.push({
      id: 'ela',
      subject: 'ela',
      title: lang === 'es' ? 'Inglés y Lectura / English Language Arts' : 'English Language Arts & Reading',
      instructions: lang === 'es'
        ? 'Lee con atención los textos y preguntas de gramática, ortografía y vocabulario. Marca la opción que mejor responda cada pregunta.'
        : 'Read the passages, grammar, spelling, and vocabulary questions carefully. Mark the best option for each question.',
      levels: elaLevels
    });

    // 3. Áreas complementarias (Ciencias, Sociales, etc.)
    const band = grade <= 3 ? 1 : grade <= 6 ? 2 : grade <= 9 ? 3 : 4;
    const compOpts = { bible: includeBible };
    const compRaw = itemsFor('comp', band, compOpts).sort((a, b) => a.id.localeCompare(b.id));
    if (compRaw.length) {
      sections.push({
        id: 'comp',
        subject: 'comp',
        title: lang === 'es' ? 'Áreas Complementarias (Ciencias, Historia y Geografía)' : 'Complementary Areas (Science & Social Studies)',
        instructions: lang === 'es'
          ? 'Preguntas de ciencias de la naturaleza, geografía e historia correspondientes a tu etapa escolar.'
          : 'Natural sciences, geography, and history questions appropriate for your grade band.',
        levels: [{
          level: band,
          label: lang === 'es' ? `Etapa ${band} (Grados ${band === 1 ? '2-3' : band === 2 ? '4-6' : band === 3 ? '7-9' : '10-12'})` : `Band ${band} (Grades ${band === 1 ? '2-3' : band === 2 ? '4-6' : band === 3 ? '7-9' : '10-12'})`,
          items: compRaw.map(it => publicItem(it, lang, us))
        }]
      });
    }

    // 4. Castellano (opcional)
    if (includeSpa) {
      const spaRaw = itemsFor('spa', grade).sort((a, b) => a.id.localeCompare(b.id));
      if (spaRaw.length) {
        sections.push({
          id: 'spa',
          subject: 'spa',
          title: 'Dominio de Castellano (Comprensión Lectora y Gramática)',
          instructions: 'Sección opcional en español para valorar la comprensión lectora y el uso del idioma materno.',
          levels: [{
            level: grade,
            label: `Grado ${grade}`,
            items: spaRaw.map(it => publicItem(it, 'es', us))
          }]
        });
      }
    }
  }

  // Contar preguntas totales
  let totalItems = 0;
  for (const s of sections) {
    for (const l of s.levels) {
      totalItems += l.items.length;
    }
  }

  res.status(200).json({
    ok: true,
    track,
    grade,
    startLevel: track === 'dual' ? 1 : C.startLevel(grade),
    totalItems,
    student,
    sections,
    generatedAt: new Date().toISOString()
  });
};
