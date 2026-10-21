import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('../js/diag-core.js');

const block = (level, wrongAces = [], n = 12) => {
  const [lo] = C.paceRange(level);
  return { level, units: Array.from({ length: n }, (_, i) => ({ ace: lo + i, correct: !wrongAces.includes(lo + i), skill: 's' + i, lu: { id: `LU-X-${String(level).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}` } })) };
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

test('las lagunas se expresan como unidades de aprendizaje y el punto de continuación también', () => {
  const state = { grade: 4, blocks: [block(1, [1005]), block(2), block(3), block(4, [1040, 1041, 1042])] };
  const r = C.next(state).result;
  assert.equal(r.gaps[0].lu.id, 'LU-X-01-05');
  assert.equal(r.continueAt.id, 'LU-X-04-04');
});

const cblock = (level, okN, n = 20) => ({ level, units: Array.from({ length: n }, (_, i) => ({ correct: i < okN, area: ['grammar', 'vocabulary', 'reading', 'usage'][i % 4], lu: { id: `LU-CEFR-${C.CEFR[level - 1]}-${String(i + 1).padStart(2, '0')}` } })) });

test('CEFR: sube de nivel mientras haya dominio y fija el nivel alcanzado', () => {
  const blocks = [cblock(1, 19), cblock(2, 17), cblock(3, 14), cblock(4, 8, 20)];
  assert.deepEqual(C.cefrNext(blocks), { action: 'ask', level: 5 });
  const r = C.cefrResult(blocks);
  assert.equal(r.code, 'B1'); // B2 con 40 % no alcanza el 65 %
  assert.equal(r.borderline, false);
  assert.equal(r.nextCode, 'B2');
  assert.ok(r.gaps.every((g) => g.level <= 4));
});

test('CEFR: se detiene cuando dos niveles seguidos están por debajo de 50 % o uno por debajo de 35 %', () => {
  assert.equal(C.cefrNext([cblock(1, 18), cblock(2, 6)]).action, 'done');
  assert.equal(C.cefrNext([cblock(1, 18), cblock(2, 9), cblock(3, 9)]).action, 'done');
  assert.equal(C.cefrNext([cblock(1, 18), cblock(2, 9)]).action, 'ask');
  assert.equal(C.cefrNext([cblock(1, 20), cblock(2, 20), cblock(3, 20), cblock(4, 20), cblock(5, 15, 15), cblock(6, 15, 15)]).action, 'done');
});

test('CEFR: Pre-A1 y nivel en el límite', () => {
  assert.equal(C.cefrResult([cblock(1, 8)]).code, 'Pre-A1');
  const r = C.cefrResult([cblock(1, 20), cblock(2, 12)]);
  assert.equal(r.code, 'A1'); assert.equal(r.borderline, true);
});
