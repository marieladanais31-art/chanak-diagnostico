import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const bank = (n) => JSON.parse(readFileSync(new URL(`../api/_bank/${n}.json`, import.meta.url), 'utf8')).items;
const codes = JSON.parse(readFileSync(new URL('../data/florida-codes.json', import.meta.url), 'utf8'));
const gradeOf = (c) => c.split('.')[1];

test('cada pregunta de Matemáticas, Inglés, Ciencias e Historia tiene un código de Florida válido', () => {
  for (const n of ['math_A', 'math_B', 'math_C', 'ela_A', 'ela_B', 'ela_C', 'comp', 'math_scope', 'ela_reading', 'comp_scope']) {
    for (const it of bank(n)) {
      if (it.id.includes('-EI-') || it.id.includes('-BIB-')) { assert.equal(it.florida_code, undefined, it.id); continue; }
      assert.match(it.florida_code || '', /^(MA|ELA|SC|SS)\./, it.id);
      assert.ok(codes[it.florida_code], `${it.id}: ${it.florida_code} no está en el catálogo`);
    }
  }
});

test('el código de Matemáticas e Inglés corresponde al grado de la pregunta', () => {
  for (const n of ['math_A', 'math_B', 'math_C', 'ela_A', 'ela_B', 'ela_C', 'math_scope', 'ela_reading']) {
    for (const it of bank(n)) {
      const g = gradeOf(it.florida_code);
      const ok = it.level === 0 ? g === 'K' : it.level >= 9 ? (g === String(it.level) || g === '912') : g === String(it.level);
      assert.ok(ok, `${it.id} (nivel ${it.level}) → ${it.florida_code}`);
    }
  }
});
