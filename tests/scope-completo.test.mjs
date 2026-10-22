import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const bank = require('../api/_lib/bank.js');
const C = require('../js/diag-core.js');

test('el inglés tiene gramática y lectura en cada nivel de 1 a 12, y el kínder no cambia', () => {
  for (let l = 1; l <= 12; l++) {
    const items = bank.itemsFor('ela', l);
    assert.ok(items.some((i) => i.strand === 'reading'), `nivel ${l} sin lectura`);
    assert.ok(items.some((i) => !i.strand || i.strand === 'grammar'), `nivel ${l} sin gramática`);
  }
  assert.equal(bank.itemsFor('ela', 0).filter((i) => i.strand === 'reading').length, 0);
});
test('las preguntas nuevas no tienen PACE (no mueven la ubicación) pero sí unidad de aprendizaje y código de Florida', () => {
  for (const it of bank.load().filter((i) => /^(MA|EN)-\d\d-(S|R|W)\d\d$/.test(i.id))) {
    assert.equal(it.ace, null, it.id); assert.ok(it.lu && it.lu.id, it.id); assert.ok(it.florida_code, it.id);
  }
});
test('los fallos de lectura salen como lagunas (extraGaps) y los dominios se calculan sin alterar la ubicación', () => {
  const mk = (level, units) => ({ level, units });
  const base = { grade: 3, ext: 0, blocks: [mk(1, [{ ace: 1001, correct: true, domain: 'grammar' }]), mk(3, [{ ace: 1025, correct: true, domain: 'grammar' }])] };
  const conLectura = { ...base, blocks: [base.blocks[0], mk(3, [...base.blocks[1].units, { ace: null, correct: false, domain: 'reading', lu: { id: 'LU-ELA-RD-03-01' }, florida_code: 'ELA.3.R.1.1' }, { ace: null, correct: true, domain: 'reading' }])] };
  const a = C.finish(base, { runIdx: -1 }); const b = C.finish(conLectura, { runIdx: -1 });
  assert.equal(b.performanceLevel, a.performanceLevel); assert.equal(b.performancePace, a.performancePace);
  assert.equal(b.extraGaps.length, 1); assert.equal(b.extraGaps[0].lu.id, 'LU-ELA-RD-03-01');
  assert.deepEqual(b.domains.reading, { c: 1, t: 2 }); assert.deepEqual(b.domains.grammar, { c: 2, t: 2 });
});
test('el diagnóstico de Ciencias y Sociales cubre las 4 bandas con preguntas nuevas del Scope & Sequence', () => {
  for (const band of [1, 2, 3, 4]) {
    for (const area of ['science', 'history', 'geography']) {
      assert.ok(bank.itemsFor('comp', band, { areas: [area] }).some((i) => /-S\d\d$/.test(i.id)), `banda ${band} ${area}`);
    }
  }
});

test('una unidad de aprendizaje con dos preguntas falladas aparece una sola vez en las lagunas', () => {
  const st = { grade: 3, ext: 0, blocks: [{ level: 1, units: [{ ace: 1001, correct: true }] }, { level: 3, units: [{ ace: 1025, correct: true },
    { ace: null, correct: false, domain: 'reading', lu: { id: 'LU-ELA-RD-03-01' } }, { ace: null, correct: false, domain: 'reading', lu: { id: 'LU-ELA-RD-03-01' } }] }] };
  assert.equal(C.finish(st, { runIdx: -1 }).extraGaps.length, 1);
});

test('castellano opcional: 7 preguntas (4 gramática + 3 lectura) por cada grado de 2.º a 12.º, todas en español y sin código de Florida', () => {
  for (let l = 2; l <= 12; l++) {
    const items = bank.itemsFor('spa', l);
    assert.equal(items.length, 7, `grado ${l}`);
    assert.equal(items.filter((i) => i.strand === 'reading').length, 3, `grado ${l} lectura`);
    for (const it of items) { assert.equal(it.florida_code, undefined); assert.ok(it.lu && it.lu.id.startsWith('LU-SPA-'), it.id); assert.ok(it.local_ref); }
  }
  assert.equal(bank.itemsFor('spa', 0).length + bank.itemsFor('spa', 1).length, 0); // K y 1.º no hacen diagnóstico
});
test('el diagnóstico no ofrece Kindergarten ni 1.º, es solo en inglés y de versión única EE. UU.', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../evaluacion.html', import.meta.url), 'utf8');
  const sel = html.match(/<select id="f-curso">([\s\S]*?)<\/select>/)[1];
  assert.ok(!/value="0"/.test(sel) && !/value="1"/.test(sel) && /value="2"/.test(sel) && /value="12"/.test(sel));
  assert.ok(/id="f-spa"/.test(html));
  assert.match(html, /<option selected>EE\. UU\. \/ Florida<\/option>/);
  assert.doesNotMatch(html, /<option>España<\/option>/);
});
