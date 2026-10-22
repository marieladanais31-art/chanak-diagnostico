// POST /api/diag-score  { subject, level, answers: { [itemId]: value } }
// Corrige un nivel en el servidor y devuelve aciertos por PACE / habilidad (sin revelar respuestas).
const { itemsFor, isCorrect, variant, SUBJECTS } = require('./_lib/bank');

module.exports = (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Usa POST' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const subject = body && String(body.subject || '');
  const level = body && Number(body.level);
  const answers = (body && body.answers) || {};
  if (!SUBJECTS.includes(subject) || !Number.isInteger(level) || level < 0 || level > 12) {
    res.status(400).json({ error: 'Parámetros no válidos' });
    return;
  }
  const opts = { bible: body.bible === true || body.bible === 1, areas: Array.isArray(body.areas) ? body.areas : null };
  const us = body.us === true || body.us === 1;
  const items = itemsFor(subject, level, opts);
  const units = items.map((it) => ({
    id: it.id, ace: it.ace || null, skill: it.skill, strand: it.florida || null, florida_code: it.florida_code || null, domain: it.strand || (subject === 'ela' ? 'grammar' : null), lu: it.lu || null,
    correct: isCorrect(variant(it, us), answers[it.id]), area: it.area || null, answered: answers[it.id] !== undefined && answers[it.id] !== '',
  }));
  const correct = units.filter((u) => u.correct).length;
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ subject, level, total: units.length, correct, pct: units.length ? correct / units.length : 0, units });
};
