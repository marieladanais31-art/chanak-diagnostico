// Acceso mínimo a Supabase con la clave pública (anon): solo RPC y Storage con las políticas de la migración 20261031.
// Se limpian espacios, saltos de línea y comillas que se cuelan al pegar valores en Vercel.
const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').trim();
const URL_ = () => clean(process.env.SUPABASE_URL).replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1.*$/, '');
const KEY = () => clean(process.env.SUPABASE_ANON_KEY).replace(/\s+/g, '');
const configured = () => !!(URL_() && KEY());
const headers = (extra = {}) => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, ...extra });

async function rpc(fn, args) {
  let r;
  try { r = await fetch(`${URL_()}/rest/v1/rpc/${fn}`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(args) }); }
  catch (err) { const e = new Error('No se pudo conectar con Supabase (revisa SUPABASE_URL)'); e.status = 0; throw e; }
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!r.ok) { const e = new Error((json && json.message) || `HTTP ${r.status}`); e.status = r.status; throw e; }
  return json;
}

async function uploadObject(bucket, path, buffer, contentType) {
  const r = await fetch(`${URL_()}/storage/v1/object/${bucket}/${path}`, { method: 'POST', headers: headers({ 'Content-Type': contentType, 'x-upsert': 'false' }), body: buffer });
  if (!r.ok) { const t = await r.text().catch(() => ''); const e = new Error(`storage ${r.status} ${t.slice(0, 120)}`); e.status = r.status; throw e; }
}

module.exports = { configured, rpc, uploadObject };
