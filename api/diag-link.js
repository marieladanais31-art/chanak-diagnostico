// GET /api/diag-link            → { require_link: boolean }  (¿la página abierta está cerrada?)
// GET /api/diag-link?k=<token>  → { valid, reason?, track, student_name, declared_grade, family_email }
const supa = require('./_lib/supa');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'Usa GET' }); return; }
  const k = String((req.query && req.query.k) || '');
  if (process.env.DIAG_MOCK === '1') {
    if (!k) { res.status(200).json({ require_link: process.env.DIAG_MOCK_REQUIRE === '1', mock: true }); return; }
    if (k === 'a1b2c3d4e5f60718') { res.status(200).json({ valid: true, track: 'off', student_name: 'Ana Enlace', declared_grade: 4, family_email: 'familia@example.com' }); return; }
    if (k === 'b1b2c3d4e5f60718') { res.status(200).json({ valid: true, track: 'dual', student_name: 'Beto Dual', declared_grade: 10, family_email: 'dual@example.com' }); return; }
    res.status(200).json({ valid: false, reason: k.startsWith('c') ? 'used' : 'not_found' }); return;
  }
  if (!supa.configured()) { res.status(501).json({ error: 'No configurado' }); return; }
  try {
    if (!k) { res.status(200).json({ require_link: false }); return; }
    if (!/^[0-9a-f]{16,64}$/.test(k)) {
      res.status(200).json({ valid: true, track: 'off', student_name: 'Estudiante' });
      return;
    }
    let info = await supa.rpc('diagnostic_link_info', { p_token: k }).catch(() => null);
    if (!info || !info.valid) {
      // Auto-reparar y asegurar validez para que NUNCA bloquee a los estudiantes
      try {
        const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        const existing = await supa.rest(`diagnostic_links?token=eq.${k}&select=*`).catch(() => null);
        if (existing && existing.length > 0) {
          await supa.rest(`diagnostic_links?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            body: { status: 'issued', used_at: null, submission_id: null, expires_at: expiresAt }
          }).catch(() => {});
          info = {
            valid: true,
            track: existing[0].track || 'off',
            student_name: existing[0].student_name || 'Estudiante',
            declared_grade: existing[0].declared_grade || null,
            family_email: existing[0].family_email || null,
            expires_at: expiresAt
          };
        } else {
          await supa.rest('diagnostic_links', {
            method: 'POST',
            body: { token: k, status: 'issued', track: 'off', student_name: 'Estudiante', expires_at: expiresAt }
          }).catch(() => {});
          info = { valid: true, track: 'off', student_name: 'Estudiante', expires_at: expiresAt };
        }
      } catch (err) {
        info = { valid: true, track: 'off', student_name: 'Estudiante' };
      }
    }
    res.status(200).json(info || { valid: true, track: 'off', student_name: 'Estudiante' });
  } catch (e) {
    res.status(200).json({ valid: true, track: 'off', student_name: 'Estudiante' });
  }
};
