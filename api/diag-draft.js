// POST /api/diag-draft  { k, draft } -> Guarda borrador de progreso del estudiante
// GET  /api/diag-draft?k=<token>&email=<email>&name=<name> -> Recupera borrador para sincronizar entre dispositivos
const supa = require('./_lib/supa');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const k = String((req.query && req.query.k) || (req.body && req.body.k) || '').trim();
  const email = String((req.query && req.query.email) || (req.body && req.body.email) || '').trim().toLowerCase();
  const name = String((req.query && req.query.name) || (req.body && req.body.name) || '').trim();

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

      let saved = false;

      // 1. Intentar guardar mediante RPC oficial
      try {
        const rpcRes = await supa.rpc('save_diagnostic_draft', { p_token: k, p_draft: draft });
        if (rpcRes === true) saved = true;
      } catch (rpcErr) {
        console.warn('[diag-draft] RPC no disponible:', rpcErr.message);
      }

      // 2. Si la RPC falló o devolvió false, actualizar directamente vía REST
      if (!saved) {
        try {
          await supa.rest(`diagnostic_links?token=eq.${encodeURIComponent(k)}`, {
            method: 'PATCH',
            body: { draft, draft_updated_at: new Date().toISOString() },
            headers: { Prefer: 'return=minimal' }
          });
          saved = true;
        } catch (restErr) {
          console.warn('[diag-draft] REST update falló:', restErr.message);
        }
      }

      return res.status(200).json({ ok: true, saved });
    }

    if (req.method === 'GET') {
      let draft = null;

      // 1. Intentar recuperar mediante RPC por token
      try {
        draft = await supa.rpc('get_diagnostic_draft', { p_token: k });
      } catch (rpcErr) {
        console.warn('[diag-draft GET] RPC no disponible:', rpcErr.message);
      }

      // 2. Si no lo obtuvo por RPC, consultar tabla directamente vía REST por token
      if (!draft) {
        try {
          const rows = await supa.rest(`diagnostic_links?token=eq.${encodeURIComponent(k)}&select=draft`);
          if (Array.isArray(rows) && rows[0] && rows[0].draft) {
            draft = rows[0].draft;
          }
        } catch (restErr) {
          console.warn('[diag-draft GET] REST por token falló:', restErr.message);
        }
      }

      // 3. Rescate por email: si este token es nuevo pero el estudiante tenía respuestas bajo su email
      if (!draft && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        try {
          const emailRows = await supa.rest(`diagnostic_links?family_email=eq.${encodeURIComponent(email)}&draft=not.is.null&order=draft_updated_at.desc.nullslast&limit=1&select=draft`);
          if (Array.isArray(emailRows) && emailRows[0] && emailRows[0].draft) {
            draft = emailRows[0].draft;
            console.log('[diag-draft GET] Borrador recuperado por email:', email);
          }
        } catch (emailErr) {
          console.warn('[diag-draft GET] Rescate por email falló:', emailErr.message);
        }
      }

      // 4. Rescate por nombre: si tampoco hubo por email, buscar por nombre del estudiante
      if (!draft && name && name.length >= 3) {
        try {
          const cleanName = name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, '').trim();
          const nameRows = await supa.rest(`diagnostic_links?student_name=ilike.*${encodeURIComponent(cleanName)}*&draft=not.is.null&order=draft_updated_at.desc.nullslast&limit=1&select=draft`);
          if (Array.isArray(nameRows) && nameRows[0] && nameRows[0].draft) {
            draft = nameRows[0].draft;
            console.log('[diag-draft GET] Borrador recuperado por nombre:', cleanName);
          }
        } catch (nameErr) {
          console.warn('[diag-draft GET] Rescate por nombre falló:', nameErr.message);
        }
      }

      return res.status(200).json({ ok: true, draft: draft || null });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
