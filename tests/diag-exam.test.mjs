import { test } from 'node:test';
import assert from 'node:assert/strict';
import diagExamHandler from '../api/diag-exam.js';

function mockReqRes(query = {}) {
  let statusCode = 200;
  let headers = {};
  let body = null;
  const req = { method: 'GET', query };
  const res = {
    setHeader: (k, v) => { headers[k] = v; },
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { body = data; }
      };
    }
  };
  return { req, res, getResult: () => ({ statusCode, headers, body }) };
}

test('diag-exam: genera paquete completo para Off-Campus K-12 (Grado 5)', async () => {
  const { req, res, getResult } = mockReqRes({ grade: '5', track: 'off' });
  await diagExamHandler(req, res);
  const result = getResult();

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.track, 'off');
  assert.equal(result.body.grade, 5);
  assert.equal(result.body.startLevel, 2); // 5 - 3 = 2
  assert.ok(result.body.totalItems > 50, 'Debe incluir preguntas de matemáticas, inglés y complementarias');

  const subjects = result.body.sections.map(s => s.id);
  assert.ok(subjects.includes('math'), 'Debe incluir sección de matemáticas');
  assert.ok(subjects.includes('ela'), 'Debe incluir sección de lectura e inglés');
  assert.ok(subjects.includes('comp'), 'Debe incluir áreas complementarias');

  // Verificar que matemáticas va desde el nivel 2 al 5
  const mathSec = result.body.sections.find(s => s.id === 'math');
  const mathLvls = mathSec.levels.map(l => l.level);
  assert.deepEqual(mathLvls, [2, 3, 4, 5]);

  // Ninguna pregunta debe contener respuestas (seguridad de examen público)
  for (const sec of result.body.sections) {
    for (const lvl of sec.levels) {
      for (const item of lvl.items) {
        assert.equal(item.answer, undefined, 'El item público nunca debe exponer su respuesta');
        assert.ok(item.prompt, 'El item debe tener enunciado');
      }
    }
  }
});

test('diag-exam: genera paquete completo para Dual Diploma / Adulto (CEFR A1-C2)', async () => {
  const { req, res, getResult } = mockReqRes({ track: 'dual' });
  await diagExamHandler(req, res);
  const result = getResult();

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.track, 'dual');

  const cefrSec = result.body.sections.find(s => s.id === 'cefr');
  assert.ok(cefrSec, 'Debe incluir sección CEFR');
  const cefrLvls = cefrSec.levels.map(l => l.level);
  assert.deepEqual(cefrLvls, [1, 2, 3, 4, 5, 6], 'Debe abarcar A1 a C2');
});

test('diag-exam: incluye secciones opcionales de Biblia y Castellano si se solicitan', async () => {
  const { req, res, getResult } = mockReqRes({ grade: '6', track: 'off', bible: '1', spa: '1' });
  await diagExamHandler(req, res);
  const result = getResult();

  assert.equal(result.statusCode, 200);
  const spaSec = result.body.sections.find(s => s.id === 'spa');
  assert.ok(spaSec, 'Debe incluir sección de castellano');
  assert.equal(spaSec.levels[0].level, 6);
});
