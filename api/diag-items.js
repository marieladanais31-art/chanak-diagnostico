// GET /api/diag-items?subject=math|ela&level=0..12&lang=en|es
// Devuelve las preguntas de un nivel, sin respuestas.
const { itemsFor, publicItem, SUBJECTS } = require('./_lib/bank');

module.exports = (req, res) => {
  const subject = String(req.query.subject || '');
  const level = Number(req.query.level);
  const lang = req.query.lang === 'es' ? 'es' : 'en';
  if (!SUBJECTS.includes(subject) || !Number.isInteger(level) || level < 0 || level > 12) {
    res.status(400).json({ error: 'Parámetros no válidos' });
    return;
  }
  const opts = { bible: req.query.bible === '1', areas: req.query.areas ? String(req.query.areas).split(',') : null };
  const us = req.query.us === '1';
  const items = itemsFor(subject, level, opts).sort((a, b) => (a.ace || 0) - (b.ace || 0) || a.id.localeCompare(b.id));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ subject, level, items: items.map((it) => publicItem(it, lang, us)) });
};
