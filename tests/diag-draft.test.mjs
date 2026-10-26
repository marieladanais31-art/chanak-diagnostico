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
