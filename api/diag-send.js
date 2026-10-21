// POST /api/diag-send  { key, to, lang, payload }
// Envía a la familia un resumen del diagnóstico por Brevo. Solo personal de Chanak (clave en DIAG_STAFF_KEY):
// así el endpoint público no sirve para enviar correo a terceros.
const crypto = require('crypto');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeEq = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const gradeLabel = (g) => (Number(g) === 0 ? 'Kindergarten' : `Grade ${g}`);

function renderEmail(p, lang) {
  const es = lang !== 'en';
  const t = es
    ? { subject: 'Resultados del diagnóstico académico — Chanak International Academy', hi: 'Estimada familia,', intro: 'Este es el resumen del diagnóstico académico de', start: 'Punto de partida', gaps: 'Lagunas a cubrir (PACE)', none: 'Sin lagunas', math: 'Matemáticas', ela: 'Inglés y Lectura', next: 'Su mentor revisará el PEI inicial con ustedes. El plan queda como borrador hasta su aprobación por coordinación.', foot: 'Chanak International Academy · FLDOE #134620. Resultados orientativos; no sustituyen una calificación oficial.' }
    : { subject: 'Academic diagnostic results — Chanak International Academy', hi: 'Dear family,', intro: 'Here is the academic diagnostic summary for', start: 'Starting point', gaps: 'Gaps to cover (PACE)', none: 'No gaps', math: 'Mathematics', ela: 'English & Reading', next: 'Your mentor will review the initial IEP with you. The plan remains a draft until approved by the coordinator.', foot: 'Chanak International Academy · FLDOE #134620. Indicative results; they do not replace an official grade.' };
  const name = esc(p.student && p.student.name);
  const rows = (p.subjects || []).map((s) => {
    const where = s.kinder ? 'Kindergarten' : s.abcs ? 'Kindergarten ✓ → Level 1' : `${gradeLabel(s.performance_level)} · PACE ${s.performance_pace}`;
    const gaps = (s.gaps || []).map((g) => g.pace).join(', ') || t.none;
    return `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb"><strong>${esc(s.subject === 'math' ? t.math : t.ela)}</strong></td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${esc(where)}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e7eb">${esc(gaps)}</td></tr>`;
  }).join('');
  const f = p.pei_fields || {};
  const html = `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:auto"><h2 style="color:#1a3a5c">Chanak International Academy</h2><p>${t.hi}</p><p>${t.intro} <strong>${name}</strong>.</p>
<table style="border-collapse:collapse;width:100%;font-size:14px"><thead><tr style="background:#1a3a5c;color:#fff"><th style="padding:6px 10px;text-align:left"> </th><th style="padding:6px 10px;text-align:left">${t.start}</th><th style="padding:6px 10px;text-align:left">${t.gaps}</th></tr></thead><tbody>${rows}</tbody></table>
${f.strength_areas ? `<p><strong>${es ? 'Fortalezas' : 'Strengths'}:</strong> ${esc(f.strength_areas)}</p>` : ''}${f.improvement_areas ? `<p><strong>${es ? 'Áreas a reforzar' : 'Areas to strengthen'}:</strong> ${esc(f.improvement_areas)}</p>` : ''}
<p>${t.next}</p><p style="font-size:12px;color:#6b7280">${t.foot}</p></div>`;
  return { subject: t.subject, html };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Usa POST' }); return; }
  const staffKey = process.env.DIAG_STAFF_KEY; const brevo = process.env.BREVO_API_KEY; const sender = process.env.DIAG_SENDER_EMAIL;
  if (!staffKey || !brevo || !sender) { res.status(501).json({ error: 'El envío por correo aún no está configurado (DIAG_STAFF_KEY, BREVO_API_KEY, DIAG_SENDER_EMAIL).' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || !safeEq(body.key || '', staffKey)) { res.status(403).json({ error: 'Clave no válida' }); return; }
  const to = String(body.to || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || to.length > 200) { res.status(400).json({ error: 'Correo no válido' }); return; }
  if (!body.payload || JSON.stringify(body.payload).length > 60000) { res.status(400).json({ error: 'Datos no válidos' }); return; }
  const mail = renderEmail(body.payload, body.lang);
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': brevo, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'Chanak International Academy', email: sender }, to: [{ email: to }], subject: mail.subject, htmlContent: mail.html }),
    });
    if (!r.ok) { res.status(502).json({ error: 'El proveedor de correo rechazó el envío' }); return; }
    res.status(200).json({ ok: true });
  } catch { res.status(502).json({ error: 'No se pudo contactar con el proveedor de correo' }); }
};
module.exports.renderEmail = renderEmail;
