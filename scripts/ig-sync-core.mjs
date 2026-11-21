// Lógica de la sincronización con Instagram (sin dependencias: se prueba con datos simulados).
// Por cada marca conectada (users/{uid}/instagram/{marca}):
//   1. Renueva el token si toca (cada 7 días; la API lo permite sin clave secreta).
//   2. Captura las historias activas y sus métricas (Instagram solo las da durante 24 h).
//   3. Actualiza las métricas de publicaciones de los últimos 7 días ya vinculadas a una pieza.
//   4. Guarda el estado en users/{uid}/brands/{marca}/ig_estado/ultimo.
// Nunca escribe tokens ni identificadores completos en el registro.

export const IG_API = 'https://graph.instagram.com';
const DIA = 864e5;
const MET_POST = [['views', 'reach', 'likes', 'comments', 'saved', 'shares'], ['reach', 'likes', 'comments', 'saved', 'shares'], ['reach', 'saved', 'shares'], ['reach']];
const MET_STORY = [['views', 'reach', 'replies', 'shares', 'navigation'], ['reach', 'replies', 'shares', 'navigation'], ['reach', 'replies'], ['reach']];

const z = n => String(n).padStart(2, '0');
// Fecha y hora locales: el flujo de trabajo fija TZ (zona horaria de la marca).
export const fechaLocal = ms => { const d = new Date(ms); return { date: d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()), hora: z(d.getHours()) + ':' + z(d.getMinutes()) }; };
export const shortcode = u => (String(u || '').match(/instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|p|tv)\/([\w-]+)/) || [])[1] || '';
const corto = s => String(s || '').slice(0, 4) + '…';

// Prueba graph.instagram.com y, si el token no es de ahí, graph.facebook.com (tokens de usuario del sistema).
async function igGet(fetch, ruta, params, token) {
  const hosts = [IG_API, 'https://graph.facebook.com/v27.0'];
  let ultimo = null;
  for (const h of hosts) {
    const url = h + '/' + ruta + '?' + new URLSearchParams({ ...params, access_token: token });
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    if (!j.error) return j;
    ultimo = j.error;
    if (j.error.code !== 190 && j.error.code !== 100) break;
  }
  const e = new Error(ultimo.message || 'Error de Instagram'); e.code = ultimo.code; throw e;
}
async function insights(fetch, id, token, grupos) {
  for (const g of grupos) {
    try {
      const r = await igGet(fetch, id + '/insights', { metric: g.join(',') }, token);
      const o = {};
      (r.data || []).forEach(x => { const v = x.values && x.values[0] ? x.values[0].value : (x.total_value ? x.total_value.value : 0); o[x.name] = typeof v === 'number' ? v : 0; });
      return o;
    } catch (e) { if (e.code === 190) throw e; }
  }
  return {};
}

export async function sincronizar({ db, fetch, ahora = Date.now(), log = console.log }) {
  const resumen = { marcas: 0, historias: 0, publicaciones: 0, renovados: 0, errores: 0 };
  const snap = await db.collectionGroup('instagram').get();
  for (const doc of snap.docs) {
    const uid = doc.ref.parent.parent.id, marca = doc.id, base = `users/${uid}/brands/${marca}`;
    let d = doc.data();
    if (!d || !d.token) continue;
    resumen.marcas++;
    try {
      if (ahora >= (d.expiraMs || 0)) { const e = new Error('Token vencido'); e.code = 190; throw e; }
      if (ahora - (d.renovadoMs || 0) > 7 * DIA && ahora - (d.conectadoMs || 0) > DIA) {
        const r = await igGet(fetch, 'refresh_access_token', { grant_type: 'ig_refresh_token' }, d.token);
        const nuevo = { token: r.access_token, renovadoMs: ahora, expiraMs: ahora + (r.expires_in || 5184000) * 1000 };
        await doc.ref.update(nuevo); d = { ...d, ...nuevo }; resumen.renovados++;
      }
      // Historias activas
      const st = await igGet(fetch, 'me/stories', { fields: 'id,media_type,permalink,timestamp' }, d.token);
      let nh = 0;
      for (const s of st.data || []) {
        const m = await insights(fetch, s.id, d.token, MET_STORY), f = fechaLocal(Date.parse(s.timestamp));
        await db.doc(`${base}/ig_historias/${s.id}`).set({ mediaId: s.id, fecha: f.date, hora: f.hora, permalink: s.permalink || '', tipo: s.media_type || '', metricas: m, actualizadoMs: ahora, fuente: 'github' }, { merge: true });
        nh++;
      }
      // Publicaciones recientes ya vinculadas a una pieza (por enlace)
      const media = await igGet(fetch, 'me/media', { fields: 'id,permalink,timestamp,media_type,media_product_type,like_count,comments_count', limit: '25' }, d.token);
      const recientes = (media.data || []).filter(m => m.media_product_type !== 'STORY' && ahora - Date.parse(m.timestamp) <= 7 * DIA);
      let np = 0;
      if (recientes.length) {
        const desde = fechaLocal(ahora - 10 * DIA).date;
        const ps = await db.collection(`${base}/pieces`).where('date', '>=', desde).get();
        const porCodigo = new Map();
        ps.docs.forEach(p => { const c = shortcode(p.data().links && p.data().links.ig); if (c) porCodigo.set(c, p.ref); });
        for (const m of recientes) {
          const ref = porCodigo.get(shortcode(m.permalink)); if (!ref) continue;
          const o = await insights(fetch, m.id, d.token, MET_POST);
          await ref.update({
            'm.ig.views': o.views || o.reach || 0,
            'm.ig.likes': o.likes != null ? o.likes : (m.like_count || 0),
            'm.ig.comments': o.comments != null ? o.comments : (m.comments_count || 0),
            'm.ig.saves': o.saved || 0,
            'm.ig.shares': o.shares || 0
          });
          np++;
        }
      }
      await db.doc(`${base}/ig_estado/ultimo`).set({ ultimaSyncMs: ahora, fuente: 'github', historias: nh, publicaciones: np, username: d.username || '', error: '' }, { merge: true });
      resumen.historias += nh; resumen.publicaciones += np;
      log(`marca ${corto(marca)}: ${nh} historia(s), ${np} publicación(es) actualizadas`);
    } catch (e) {
      resumen.errores++;
      const msg = e.code === 190 ? 'El token venció o no es válido. Genera uno nuevo en Meta y vuelve a conectarlo en la app.' : 'Error al sincronizar: ' + e.message;
      log(`marca ${corto(marca)}: ${e.code === 190 ? 'token vencido o inválido' : 'error ' + (e.code || '')}`);
      await db.doc(`${base}/ig_estado/ultimo`).set({ error: msg, errorMs: ahora }, { merge: true }).catch(() => {});
    }
  }
  return resumen;
}
