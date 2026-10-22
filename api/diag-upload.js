// POST /api/diag-upload  { id, token, name, mime, data (base64), note }
// Sube una foto/PDF de lo escrito por el estudiante al bucket privado y lo registra en la entrega.
const crypto = require('crypto');
const supa = require('./_lib/supa');
const MIMES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3' };
const MAX = 3 * 1024 * 1024;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Usa POST' }); return; }
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || !/^[0-9a-f-]{36}$/.test(String(b.id || '')) || !/^[0-9a-f]{8,64}$/.test(String(b.token || '')) || !MIMES[b.mime]) { res.status(400).json({ error: 'Datos no válidos' }); return; }
  const buf = Buffer.from(String(b.data || ''), 'base64');
  if (!buf.length || buf.length > MAX) { res.status(400).json({ error: 'Archivo vacío o demasiado grande (máx. 3 MB)' }); return; }
  if (process.env.DIAG_MOCK === '1') { res.status(200).json({ ok: true, mock: true }); return; }
  if (!supa.configured()) { res.status(501).json({ error: 'La subida aún no está configurada' }); return; }
  const path = `${b.id}/${b.token}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${MIMES[b.mime]}`;
  try {
    await supa.uploadObject('diagnostic-uploads', path, buf, b.mime);
    await supa.rpc('register_diagnostic_upload', { p_submission: b.id, p_token: b.token, p_path: path, p_note: String(b.note || '').slice(0, 300) || null });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: 'No se pudo subir el archivo' });
  }
};
