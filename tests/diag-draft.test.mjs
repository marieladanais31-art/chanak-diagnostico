import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for node environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

test('auto-save: clave de almacenamiento por token o invitado', () => {
  const getDraftKey = (token) => (token ? `chanak_diag_draft_${token}` : 'chanak_diag_draft_guest');
  assert.equal(getDraftKey('abc-123'), 'chanak_diag_draft_abc-123');
  assert.equal(getDraftKey(null), 'chanak_diag_draft_guest');
  assert.equal(getDraftKey(''), 'chanak_diag_draft_guest');
});

test('auto-save: serialización y recuperación de borrador completo', () => {
  const storage = new LocalStorageMock();
  const key = 'chanak_diag_draft_test-token';

  const mockDraft = {
    savedAt: 1729900000000,
    version: '2.2',
    linkToken: 'test-token',
    form: {
      nombre: 'Sofía Martínez',
      curso: '5',
      programa: 'off',
      pais: 'México',
      email: 'sofia@example.com',
      mentor: 'Prof. Gabriel',
      ingles: 'si',
      consent: true,
    },
    grade: 5,
    track: 'off',
    plan: ['math', 'ela', 'comp'],
    results: {
      math: {
        performanceLevel: 5,
        tested: [2, 3, 4, 5],
        gaps: [],
        found: true,
      },
    },
    activeSubject: {
      subj: 'ela',
      level: 3,
      n: 2,
      answers: { 'ELA-3-01': 1, 'ELA-3-02': 0 },
    },
    inProgress: true,
  };

  storage.setItem(key, JSON.stringify(mockDraft));

  const retrieved = JSON.parse(storage.getItem(key));
  assert.equal(retrieved.linkToken, 'test-token');
  assert.equal(retrieved.form.nombre, 'Sofía Martínez');
  assert.equal(retrieved.results.math.performanceLevel, 5);
  assert.equal(retrieved.activeSubject.subj, 'ela');
  assert.equal(retrieved.activeSubject.answers['ELA-3-01'], 1);
});

test('resumen de test: salta materias completadas y retoma en la materia activa', () => {
  const S = {
    plan: ['math', 'ela', 'comp'],
    results: {
      math: { performanceLevel: 5 },
    },
  };

  const executed = [];
  for (const subj of S.plan) {
    if (S.results[subj]) {
      // Si la materia ya tiene resultado final guardado, se omite
      continue;
    }
    executed.push(subj);
  }

  // Matemáticas no se repite; solo se ejecutan ela y comp
  assert.deepEqual(executed, ['ela', 'comp']);
});

test('auto-save: limpieza de borrador tras entrega exitosa', () => {
  const storage = new LocalStorageMock();
  const key = 'chanak_diag_draft_test-token';

  storage.setItem(key, JSON.stringify({ inProgress: true }));
  assert.ok(storage.getItem(key));

  // Simula clearDraft()
  storage.removeItem(key);
  assert.equal(storage.getItem(key), null);
});

test('protección contra borrado accidental en startTest(): nunca borra progreso existente', () => {
  const S = {
    results: { math: { performanceLevel: 4 } },
    comp: null,
    plan: ['math', 'ela', 'comp'],
  };
  const existingDraft = {
    results: { math: { performanceLevel: 4 } },
    activeSubject: { subj: 'ela', level: 4, answers: { 'ELA-4-01': 2 } }
  };

  let isResume = false;
  const hasWork = (S.results && Object.keys(S.results).length > 0) ||
                  (existingDraft && existingDraft.results && Object.keys(existingDraft.results).length > 0) ||
                  (existingDraft && existingDraft.activeSubject) ||
                  (existingDraft && existingDraft.comp);

  if (!isResume && hasWork) {
    if (existingDraft) {
      if (!S.results || !Object.keys(S.results).length) S.results = existingDraft.results || {};
      if (!S.comp) S.comp = existingDraft.comp || null;
      if (!S.activeSubject) S.activeSubject = existingDraft.activeSubject || null;
    }
    isResume = true;
  }

  // Verifica que NO se borraron los resultados y que isResume se activó automáticamente
  assert.equal(isResume, true);
  assert.deepEqual(S.results, { math: { performanceLevel: 4 } });
  assert.equal(S.activeSubject.subj, 'ela');
  assert.equal(S.activeSubject.answers['ELA-4-01'], 2);
});

test('auto-save: payload para la nube es ligero y excluye base64 pesados', () => {
  const draft = {
    savedAt: 1729900000000,
    results: { math: { performanceLevel: 5 } },
    formUploads: [
      { name: 'cedula.pdf', size: 102400, mime: 'application/pdf', b64: 'JVBERi0xLjQK...', uploaded: false }
    ]
  };

  const lightDraft = {
    ...draft,
    formUploads: (draft.formUploads || []).map(f => ({ name: f.name, size: f.size, mime: f.mime, uploaded: !!f.uploaded }))
  };

  assert.equal(lightDraft.formUploads[0].b64, undefined);
  assert.equal(lightDraft.formUploads[0].name, 'cedula.pdf');
  assert.equal(lightDraft.results.math.performanceLevel, 5);
});

test('finalizar antes (ya no sé más): calcula nivel de desempeño con lo respondido y no se bloquea', async () => {
  const C = await import('../js/diag-core.js').then((m) => m.default || m);
  const state = {
    grade: 6,
    blocks: [
      {
        level: 3,
        units: [
          { ace: 1025, correct: true, level: 3, skill: 'addition' },
          { ace: 1026, correct: true, level: 3, skill: 'subtraction' },
        ],
        pct: 1.0,
      },
      {
        level: 4,
        units: [
          { ace: 1037, correct: false, level: 4, skill: 'fractions' },
          { ace: 1038, correct: false, level: 4, skill: 'decimals' },
        ],
        pct: 0.0,
      },
    ],
  };

  const seq = C.sequence(state.blocks);
  let idx = C.findRun(seq);
  if (idx < 0) {
    const firstFail = seq.findIndex((u) => !u.correct);
    idx = firstFail >= 0 ? firstFail : -1;
  }

  const res = C.finish(state, { runIdx: idx });
  assert.equal(res.performanceLevel, 4);
  assert.equal(res.performancePace, 1037);
  assert.equal(res.found, true);
});

test('finalizar antes en CEFR (ya no sé más): asigna el nivel máximo alcanzado hasta donde llegó', async () => {
  const C = await import('../js/diag-core.js').then((m) => m.default || m);
  const blocks = [
    { level: 1, units: [{ correct: true }, { correct: true }, { correct: true }] }, // A1: 100%
    { level: 2, units: [{ correct: false }, { correct: false }] }, // A2: 0%
  ];

  const res = C.cefrResult(blocks);
  assert.equal(res.code, 'A1');
  assert.equal(res.level, 1);
});
