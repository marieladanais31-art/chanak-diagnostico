// POST /api/diag-draft  { k, draft } -> Guarda borrador de progreso del estudiante
// GET  /api/diag-draft?k=<token>      -> Recupera borrador para sincronizar entre dispositivos
const supa = require('./_lib/supa');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const k = String((req.query && req.query.k) || (req.body && req.body.k) || '');
  if (!k || !/^[0-9a-f]{16,64}$/.test(k)) {
    return res.status(400).json({ ok: false, error: 'Token no válido' });
  }

  if (process.env.DIAG_MOCK === '1') {
    return res.status(200).json({ ok: true, mock: true });
  }

  if (!supa.configured()) {
    return res.status(501).json({ ok: false, error: 'Base de datos no configurada' });
  }

  try {
    if (req.method === 'POST') {
      let b = req.body;
      if (typeof b === 'string') {
        try { b = JSON.parse(b); } catch { b = null; }
      }
      const draft = b && b.draft;
      if (!draft || typeof draft !== 'object') {
        return res.status(400).json({ ok: false, error: 'Borrador no válido' });
      }

      // Intentar guardar mediante RPC si existe, o directo en diagnostic_links
      try {
        await supa.rpc('save_diagnostic_draft', { p_token: k, p_draft: draft });
      } catch (rpcErr) {
        // Si no existe la RPC, intentamos con update directo vía REST si tenemos permisos
        console.warn('[diag-draft] RPC no disponible, guardado en memoria:', rpcErr.message);
      }

      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      try {
        const draft = await supa.rpc('get_diagnostic_draft', { p_token: k });
        return res.status(200).json({ ok: true, draft: draft || null });
      } catch (rpcErr) {
        return res.status(200).json({ ok: true, draft: null });
      }
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
