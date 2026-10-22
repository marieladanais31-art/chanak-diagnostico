// Acceso mínimo a Supabase con la clave pública (anon): solo RPC y Storage con las políticas de la migración 20261031.
// Se limpian espacios, saltos de línea y comillas que se cuelan al pegar valores en Vercel.
const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').trim();
const URL_ = () => {
  let u = clean(process.env.SUPABASE_URL).replace(/\/+$/, '').replace(/\/(rest|auth|storage)\/v1.*$/, '');
  if (/^[a-z0-9]{20}$/.test(u)) u = `https://${u}.supabase.co`;           // solo el código del proyecto
  else if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`;              // faltaba https://
  return u;
};
// Pista no sensible para diagnosticar (la URL del proyecto es pública; si parece una clave, no se muestra).
const urlHint = () => { const u = clean(process.env.SUPABASE_URL); return /^eyJ/.test(u) || u.length > 120 ? `(valor de ${u.length} caracteres que no parece una URL)` : u.slice(0, 70); };
// La clave es un JWT (letras, números, '.', '-', '_'): se quita todo lo demás (espacios, saltos de línea, caracteres invisibles).
const rawKey = () => String(process.env.SUPABASE_ANON_KEY || '');
const KEY = () => rawKey().replace(/[^A-Za-z0-9._-]/g, '');
const keyHint = () => { const r = rawKey(), k = KEY(); return `clave de ${r.length} caracteres (${r.length - k.length} sobrantes), ${k.startsWith('eyJ') ? 'empieza como un JWT' : 'NO empieza como un JWT'}, ${k.split('.').length} partes`; };
const configured = () => !!(URL_() && KEY());
const headers = (extra = {}) => ({ apikey: KEY(), Authorization: `Bearer ${KEY()}`, ...extra });

async function rpc(fn, args) {
  let r;
  try { r = await fetch(`${URL_()}/rest/v1/rpc/${fn}`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(args) }); }
  catch (err) { const e = new Error(`No se pudo conectar con Supabase. URL: "${urlHint()}" · ${keyHint()} · causa: ${String(err && err.message || err).slice(0, 80)}${err && err.cause && err.cause.code ? ' / ' + err.cause.code : ''}`); e.status = 0; throw e; }
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
