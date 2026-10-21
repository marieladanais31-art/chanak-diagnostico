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
    if (!k) { res.status(200).json({ require_link: (await supa.rpc('diagnostic_require_link', {})) === true }); return; }
    if (!/^[0-9a-f]{16,64}$/.test(k)) { res.status(200).json({ valid: false, reason: 'not_found' }); return; }
    res.status(200).json(await supa.rpc('diagnostic_link_info', { p_token: k }));
  } catch (e) {
    res.status(502).json({ error: 'No se pudo comprobar el enlace' });
  }
};
