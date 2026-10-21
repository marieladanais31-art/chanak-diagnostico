// POST /api/diag-submit  { track: 'off'|'dual', payload }
// Guarda el resultado en el SIS (RPC submit_diagnostic), lo enruta a coordinación y avisa por correo.
//   off  → offcampus@chanakacademy.org   (hub FL-OFF)
//   dual → dualdiploma@chanakacademy.org (hub DUAL-01)
const supa = require('./_lib/supa');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROUTE = { off: 'offcampus@chanakacademy.org', dual: 'dualdiploma@chanakacademy.org' };
const SIS_URL = process.env.SIS_URL || 'https://sis.chanakacademy.org';

async function notify(route, p, id) {
  const key = process.env.BREVO_API_KEY; const sender = process.env.DIAG_SENDER_EMAIL;
  if (!key || !sender) return false;
  const name = esc(p.student && p.student.name);
  const subj = (p.subjects || []).map((s) => `${esc(s.subject)}: ${esc(s.working_level)}`).join(' · ');
  const cefr = p.cefr ? ` · CEFR ${esc(p.cefr.level)}` : '';
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px"><h3 style="color:#1a3a5c">Nuevo diagnóstico para revisar</h3>
<p><strong>${name}</strong> · ${esc(p.pei_fields && p.pei_fields.grade_level)} · ${p.track === 'dual' ? 'Dual Diploma' : 'Off-Campus'}</p>
<p>${subj}${cefr}</p><p><a href="${SIS_URL}/admin?section=diagnosticos">Abrir en el SIS (Matrícula → Diagnósticos)</a></p>
<p style="font-size:12px;color:#6b7280">Referencia ${esc(id)}. Los datos completos y la letra del estudiante están en el SIS.</p></div>`;
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: { name: 'Chanak Diagnóstico', email: sender }, to: [{ email: route }], subject: `Diagnóstico para revisar — ${String(p.student && p.student.name || '').slice(0, 60)}`, htmlContent: html }) });
    return r.ok;
  } catch { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Usa POST' }); return; }
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const track = body && body.track; const payload = body && body.payload;
  if (!['off', 'dual'].includes(track) || !payload || typeof payload !== 'object' || JSON.stringify(payload).length > 180000) { res.status(400).json({ error: 'Datos no válidos' }); return; }
  if (process.env.DIAG_MOCK === '1') { res.status(200).json({ id: '00000000-0000-4000-8000-000000000001', upload_token: '0123456789abcdef', route_email: ROUTE[track], notified: false, mock: true }); return; }
  if (!supa.configured()) { res.status(501).json({ error: 'El envío al SIS aún no está configurado (SUPABASE_URL, SUPABASE_ANON_KEY).' }); return; }
  try {
    const out = await supa.rpc('submit_diagnostic', { p_track: track, p_payload: payload });
    const notified = await notify(ROUTE[track], { ...payload, track }, out.id);
    res.status(200).json({ id: out.id, upload_token: out.upload_token, route_email: out.route_email || ROUTE[track], notified });
  } catch (e) {
    res.status(502).json({ error: 'No se pudo guardar el diagnóstico' });
  }
};
