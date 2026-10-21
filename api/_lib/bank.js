// Banco de preguntas del diagnóstico. Vive dentro de /api para que no se publique como archivo
// estático: el navegador solo recibe enunciados y opciones, nunca las respuestas.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '_bank');
let cache = null;

function load() {
  if (cache) return cache;
  const items = [];
  for (const f of fs.readdirSync(DIR)) {
    if (!f.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    for (const it of data.items || []) if (!it.hold) items.push(it); // 'hold' = pendiente de revisión, no se sirve
  }
  cache = items;
  return items;
}

const SUBJECTS = ['math', 'ela', 'comp'];
// Opciones de las áreas complementarias: bible=1 incluye Biblia; areas='ei,science'; us=1 usa la variante de EE. UU.
function itemsFor(subject, level, opts = {}) {
  let list = load().filter((it) => it.subject === subject && it.level === level);
  if (subject === 'comp') {
    if (!opts.bible) list = list.filter((it) => it.area !== 'bible');
    if (opts.areas && opts.areas.length) list = list.filter((it) => opts.areas.includes(it.area));
  }
  return list;
}
function byId(id) {
  return load().find((it) => it.id === id) || null;
}

// Vista pública de una pregunta (sin respuesta).
function variant(it, us) {
  return us && it.us_alt ? { ...it, prompt: it.us_alt.prompt, options: it.us_alt.options, answer: it.us_alt.answer } : it;
}
function publicItem(it0, lang, us) {
  const it = variant(it0, us);
  const pick = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v[lang] || v.en) : v);
  return { id: it.id, type: it.type, prompt: pick(it.prompt), options: it.options ? pick(it.options) : undefined, skill: it.skill, area: it.area };
}

function isCorrect(it, value) {
  if (value === undefined || value === null || value === '') return false;
  if (it.type === 'numeric') {
    const n = Number(String(value).replace(',', '.').replace(/[^0-9.\-/]/g, ''));
    return Number.isFinite(n) && Math.abs(n - Number(it.answer)) < 1e-9;
  }
  if (it.type === 'text') {
    const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
    const accepted = Array.isArray(it.answer) ? it.answer : [it.answer];
    return accepted.some((a) => norm(a) === norm(value));
  }
  return Number(value) === Number(it.answer); // opción múltiple: índice
}

module.exports = { load, itemsFor, byId, publicItem, variant, isCorrect, SUBJECTS };
