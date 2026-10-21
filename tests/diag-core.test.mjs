import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../js/diag-core.js');

const block = (level, wrongAces = [], n = 12) => {
  const [lo] = C.paceRange(level);
  return { level, units: Array.from({ length: n }, (_, i) => ({ ace: lo + i, correct: !wrongAces.includes(lo + i), skill: 's' + i })) };
};

test('punto de partida: 3 niveles abajo en primaria, 5 en secundaria', () => {
  assert.equal(C.startLevel(0), 0);
  assert.equal(C.startLevel(4), 1);
  assert.equal(C.startLevel(6), 3);
  assert.equal(C.startLevel(7), 2);
  assert.equal(C.startLevel(12), 7);
  assert.equal(C.startLevel(2), 0);
});

test('pace ↔ nivel', () => {
  assert.equal(C.paceLevel(1001), 1); assert.equal(C.paceLevel(1012), 1);
  assert.equal(C.paceLevel(1013), 2); assert.equal(C.paceLevel(1144), 12);
  assert.deepEqual(C.paceRange(4), [1037, 1048]);
});

test('tres fallos seguidos marcan el nivel de desempeño y lo anterior son lagunas', () => {
  // grado 4: empieza en nivel 1; fallos aislados 1005 y luego 1040,1041,1042 seguidos
  const state = { grade: 4, blocks: [block(1, [1005]), block(2), block(3), block(4, [1040, 1041, 1042])] };
  const r = C.next(state);
  assert.equal(r.action, 'done');
  assert.equal(r.result.found, true);
  assert.equal(r.result.performancePace, 1040);
  assert.equal(r.result.performanceLevel, 4);
  assert.deepEqual(r.result.gaps.map((g) => g.pace), [1005]);
});

test('sin tres seguidos se sigue subiendo hasta el grado declarado y se aplica el tope', () => {
  let state = { grade: 4, blocks: [block(1)] };
  let r = C.next(state); assert.deepEqual([r.action, r.level], ['ask', 2]);
  state.blocks.push(block(2)); r = C.next(state); assert.deepEqual([r.action, r.level], ['ask', 3]);
  state.blocks.push(block(3)); r = C.next(state); assert.deepEqual([r.action, r.level], ['ask', 4]);
  state.blocks.push(block(4)); r = C.next(state);
  assert.equal(r.action, 'done');
  assert.equal(r.result.found, false);
  assert.equal(r.result.performancePace, 1037); // inicio del grado declarado, nunca por encima
  assert.equal(r.result.capped, true);
});

test('fallos aislados (sin racha) quedan como lagunas y ubican al inicio del grado', () => {
  const state = { grade: 2, blocks: [block(0, [], 10), block(1, [1003, 1007]), block(2, [1015])] };
  state.blocks[0].units.forEach((u) => { u.ace = null; });
  const r = C.next(state);
  assert.equal(r.action, 'done');
  assert.equal(r.result.found, false);
  assert.deepEqual(r.result.gaps.map((g) => g.pace), [1003, 1007, 1015]);
  assert.equal(r.result.performancePace, 1013);
});

test('si la racha empieza en el primer PACE evaluado se baja un nivel (hasta 2 veces)', () => {
  const state = { grade: 6, blocks: [block(3, [1025, 1026, 1027])] };
  let r = C.next(state);
  assert.deepEqual([r.action, r.level, r.ext], ['ask', 2, 1]);
  state.blocks.push(block(2)); state.ext = 1;
  r = C.next(state);
  assert.equal(r.action, 'done');
  assert.equal(r.result.performancePace, 1025);
  assert.equal(r.result.gaps.length, 0);
});

test('Kindergarten: <80 % → programa Kindergarten; ≥80 % → ABCs y continúa al nivel 1', () => {
  const k = (okN) => ({ level: 0, units: Array.from({ length: 10 }, (_, i) => ({ ace: null, correct: i < okN })) });
  let r = C.next({ grade: 1, blocks: [k(7)] });
  assert.equal(r.action, 'done'); assert.equal(r.result.kinder, true);
  r = C.next({ grade: 1, blocks: [k(8)] });
  assert.deepEqual([r.action, r.level], ['ask', 1]);
  r = C.next({ grade: 0, blocks: [k(9)] });
  assert.equal(r.action, 'done'); assert.equal(r.result.abcs, true);
});
