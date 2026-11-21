// ===== Conexión con Instagram (API de Instagram con inicio de sesión de Instagram) =====
// - El token se guarda SOLO en la parte privada del propietario: users/{uid}/instagram/{marca}.
//   Colaboradores no pueden leerlo (regla de cuenta propia).
// - Las estadísticas se leen directo desde el navegador (la API permite llamadas desde la página).
// - Una tarea de GitHub Actions (scripts/ig-sync.mjs) captura historias y actualiza cada hora.

const IG_API='https://graph.instagram.com';   // sin versión: Meta usa la vigente. Para fijarla: 'https://graph.instagram.com/v23.0'
const IG_DIA=864e5;
const IG_MET_POST=[['views','reach','likes','comments','saved','shares'],['reach','likes','comments','saved','shares'],['reach','saved','shares'],['reach']];
const IG_MET_STORY=[['views','reach','replies','shares','navigation'],['reach','replies','shares','navigation'],['reach','replies'],['reach']];
FX.ig={doc:null,estado:null,hist:[],dias:30,cargadoKey:null};

const igEsDueno=()=>!!(S.u&&S.b&&!S.b.owner);
// Con token de usuario del sistema, «me» no es tu cuenta: se usa el ID de la cuenta de Instagram.
const igNodo=()=>(FX.ig.doc&&FX.ig.doc.igUserId)||'me';
const igRef=()=>db.collection('users').doc(S.u.uid).collection('instagram').doc(S.b.id);
// Prueba primero graph.instagram.com y, si el token no es de ahí, graph.facebook.com (tokens de usuario del sistema).
async function igGet(ruta,params,token){
  const hosts=[IG_API,'https://graph.facebook.com/v27.0'];
  let ultimo=null;
  for(const h of hosts){
    const url=/^https?:/.test(ruta)?ruta:h+'/'+ruta+'?'+new URLSearchParams({...params,access_token:token});
    let r;try{r=await fetch(url)}catch(e){const x=new Error('Sin conexión con Instagram');x.code='red';throw x}
    const j=await r.json().catch(()=>({}));
    if(!j.error)return j;
    ultimo=j.error;
    if(j.error.code!==190&&j.error.code!==100)break;
  }
  const x=new Error(ultimo.message||'Error de Instagram');x.code=ultimo.code;throw x}
// Pide métricas; si alguna no existe para ese tipo de publicación, prueba con un grupo más pequeño.
async function igInsights(id,token,grupos){
  for(const g of grupos){try{const r=await igGet(id+'/insights',{metric:g.join(',')},token);const o={};
      (r.data||[]).forEach(x=>{const v=x.values&&x.values[0]?x.values[0].value:(x.total_value?x.total_value.value:0);o[x.name]=typeof v==='number'?v:0});return o}
    catch(e){if(e.code===190||e.code==='red')throw e}}
  return {}}
const igFormato=m=>(m.media_product_type==='REELS'||m.media_type==='VIDEO')?'reel':'carrusel';
const igMetricasPost=(o,m)=>({views:o.views||o.reach||0,likes:o.likes!=null?o.likes:(m.like_count||0),comments:o.comments!=null?o.comments:(m.comments_count||0),saves:o.saved||0,shares:o.shares||0});
const igFechaLocal=ts=>{const d=new Date(ts);return{date:ds(d),hora:String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}};
const igMsgError=e=>e.code===190?'El token venció o no es válido. Genera uno nuevo en Meta y vuelve a conectar.':e.code==='red'?'Sin conexión con Instagram. Revisa tu internet.':e.message;

// ---- Cargar conexión y renovar el token (sin clave secreta: la API lo permite) ----
async function igCargar(forzar){if(!S.u||!S.b)return;const key=S.u.uid+'|'+S.b.id;
  if(!forzar&&FX.ig.cargadoKey===key)return;FX.ig.cargadoKey=key;FX.ig.doc=null;FX.ig.estado=null;FX.ig.hist=[];
  try{const e=await cref('ig_estado').doc('ultimo').get();FX.ig.estado=e.exists?e.data():null}catch(e){}
  if(igEsDueno()){try{const d=await igRef().get();FX.ig.doc=d.exists?d.data():null}catch(e){}
    const d=FX.ig.doc,ahora=Date.now();
    if(d&&d.token&&ahora<(d.expiraMs||0)&&ahora-(d.renovadoMs||0)>7*IG_DIA&&ahora-(d.conectadoMs||0)>IG_DIA){
      try{const r=await igGet('refresh_access_token',{grant_type:'ig_refresh_token'},d.token);
        const nuevo={token:r.access_token,renovadoMs:ahora,expiraMs:ahora+(r.expires_in||5184000)*1000};
        await igRef().update(nuevo);Object.assign(FX.ig.doc,nuevo)}catch(e){}}}
  if(S.v==='resumen'&&FX.rs==='instagram')fxSafeRender()}
async function igCargarHist(){try{const s=await cref('ig_historias').get();
  FX.ig.hist=fxDocs(s).sort((a,b)=>(b.fecha+(b.hora||'')).localeCompare(a.fecha+(a.hora||''))).slice(0,80)}catch(e){FX.ig.hist=[]}}

async function igMe(t,id){const nodo=id||'me';try{return await igGet(nodo,{fields:'user_id,username,account_type'},t)}
  catch(e){if(e.code===190||e.code==='red')throw e;return igGet(nodo,{fields:'id,username'},t)}}
async function igConectar(){const t=($('#ig_tok').value||'').trim();const idManual=($('#ig_id').value||'').trim();
  if(t.length<20)return alert('Pega el token completo que generaste en Meta.');
  fxStatus('Comprobando el token…','warn');
  try{const me=await igMe(t,idManual),ahora=Date.now();
    await fxRun(igRef().set({token:t,igUserId:String(idManual||me.user_id||me.id||''),username:me.username||'',tipo:me.account_type||'',conectadoMs:ahora,renovadoMs:ahora,expiraMs:ahora+60*IG_DIA}),'Instagram conectado: @'+(me.username||''));
    await cref('ig_estado').doc('ultimo').set({username:me.username||'',conectadoMs:ahora,error:''}).catch(()=>{});
    igCargar(true)}
  catch(e){fxStatus('No se pudo conectar: '+igMsgError(e),'err')}}
function igDesconectar(){if(!confirm('¿Desconectar Instagram de esta marca? Se borra el token guardado; las estadísticas ya guardadas se conservan.'))return;
  fxRun(igRef().delete(),'Instagram desconectado').then(()=>igCargar(true)).catch(()=>{})}

// ---- Actualizar publicaciones: leer, emparejar por enlace o copy, y confirmar ----
function igSim(a,b){const w=s=>new Set(nz(s).replace(/#\S+/g,' ').split(/[^a-z0-9]+/).filter(x=>x.length>=4));
  const A=w(a),B=w(b);if(!A.size||!B.size)return 0;let i=0;A.forEach(x=>{if(B.has(x))i++});return i/Math.min(A.size,B.size)}
function igEmparejar(items){const usadas=new Set();const cuenta={enlace:0,copy:0,fecha:0,sin:0};
  items.forEach(x=>{const p=S.P.find(q=>sc(q.links&&q.links.ig)&&sc(q.links.ig)===sc(x.link));if(p){x.p=p;x.por='enlace';usadas.add(p.id)}});
  items.forEach(x=>{if(x.p)return;
    const c=S.P.filter(q=>q.format===x.format&&!usadas.has(q.id)&&!sc(q.links&&q.links.ig)&&dd(q.date,x.date)<=2)
      .map(q=>({q,s:igSim(x.desc,[q.desc,q.tema,q.hook,q.idea].join(' ')),d:dd(q.date,x.date)})).sort((a,b)=>b.s-a.s||a.d-b.d);
    const best=c[0];const unicoDia=c.filter(z=>z.d===0).length===1;
    if(best&&best.s>=0.3){x.p=best.q;x.por='copy'}else if(best&&best.d===0&&unicoDia){x.p=best.q;x.por='fecha'}
    if(x.p)usadas.add(x.p.id)});
  items.forEach(x=>{cuenta[x.por||'sin']++;x.sel=x.p?x.p.id:''});
  items.sort((a,b)=>(!!b.p-!!a.p)||(a.date+a.hora).localeCompare(b.date+b.hora));
  return cuenta}
async function igActualizar(){const d=FX.ig.doc;if(!d||!d.token)return alert('Conecta Instagram primero.');
  const desde=Date.now()-FX.ig.dias*IG_DIA;fxStatus('Leyendo publicaciones de Instagram…','warn');
  try{const media=[];let r=await igGet(igNodo()+'/media',{fields:'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count',limit:'50'},d.token),pag=0;
    while(true){(r.data||[]).forEach(m=>media.push(m));const ult=r.data&&r.data[r.data.length-1];pag++;
      if(!ult||Date.parse(ult.timestamp)<desde||!(r.paging&&r.paging.next)||pag>=10)break;r=await igGet(r.paging.next)}
    const recientes=media.filter(m=>Date.parse(m.timestamp)>=desde&&m.media_product_type!=='STORY');
    if(!recientes.length){fxStatus('No hay publicaciones en los últimos '+FX.ig.dias+' días.');return}
    const items=[];let i=0;
    for(const m of recientes){i++;fxStatus('Leyendo estadísticas '+i+' de '+recientes.length+'…','warn');
      const o=await igInsights(m.id,d.token,IG_MET_POST);const f=igFechaLocal(m.timestamp);
      items.push({date:f.date,hora:f.hora,format:igFormato(m),link:m.permalink||'',desc:m.caption||'',m:igMetricasPost(o,m)})}
    const c=igEmparejar(items);
    FX.ig.estado={...(FX.ig.estado||{}),username:d.username||'',ultimaSyncMs:Date.now(),fuente:'app',publicaciones:items.length,error:''};
    await cref('ig_estado').doc('ultimo').set(FX.ig.estado).catch(()=>{});
    IMPS=items;OTR='';stV();
    const p=$('#modal .md p');if(p)p.insertAdjacentHTML('afterend',`<p class=fxnote>Emparejadas por enlace: ${c.enlace} · por copy: ${c.copy} · por fecha: ${c.fecha} · sin pareja: ${c.sin}. Revisa cada fila antes de importar: puedes cambiar la pieza o elegir «Omitir».</p>`);
    fxStatus('Revisa las coincidencias y pulsa Importar')}
  catch(e){fxStatus('No se pudo actualizar: '+igMsgError(e),'err');
    if(e.code===190)cref('ig_estado').doc('ultimo').set({...(FX.ig.estado||{}),error:igMsgError(e),errorMs:Date.now()}).catch(()=>{})}}

// ---- Historias: solo dan métricas mientras están activas (24 h) ----
async function igCapturarHistorias(){const d=FX.ig.doc;if(!d||!d.token)return alert('Conecta Instagram primero.');
  fxStatus('Leyendo historias activas…','warn');
  try{const r=await igGet(igNodo()+'/stories',{fields:'id,media_type,permalink,timestamp'},d.token);const L=r.data||[];
    await igCargarHist();
    for(const s of L){const o=await igInsights(s.id,d.token,IG_MET_STORY),f=igFechaLocal(s.timestamp),prev=FX.ig.hist.find(h=>h.id===s.id);
      const datos={mediaId:s.id,fecha:f.date,hora:f.hora,permalink:s.permalink||'',tipo:s.media_type||'',metricas:o,actualizadoMs:Date.now(),fuente:'app'};
      if(prev)await cref('ig_historias').doc(s.id).update(datos);else await cref('ig_historias').doc(s.id).set({...datos,piezaId:''})}
    FX.ig.estado={...(FX.ig.estado||{}),ultimaSyncMs:Date.now(),fuente:'app',error:''};
    await cref('ig_estado').doc('ultimo').set(FX.ig.estado).catch(()=>{});
    await igCargarHist();fxStatus(L.length?L.length+' historia(s) activas capturadas':'No hay historias activas ahora');R()}
  catch(e){fxStatus('No se pudieron leer las historias: '+igMsgError(e),'err')}}
// Una pieza «historia» puede ser una secuencia de varias historias.
// Vistas = la mayor de la secuencia (la primera suele ser la que más ve); respuestas y compartidos se suman.
async function igAsignarHistoria(hid,pid){const h=FX.ig.hist.find(x=>x.id===hid);if(!h)return;
  try{await cref('ig_historias').doc(hid).update({piezaId:pid});h.piezaId=pid;
    if(pid){const seq=FX.ig.hist.filter(x=>x.piezaId===pid),mx=k=>Math.max(0,...seq.map(x=>+(x.metricas||{})[k]||0)),sm=k=>seq.reduce((s,x)=>s+(+(x.metricas||{})[k]||0),0);
      await fxRun(cref('pieces').doc(pid).update({'m.ig.views':mx('views')||mx('reach'),'m.ig.likes':0,'m.ig.comments':sm('replies'),'m.ig.saves':0,'m.ig.shares':sm('shares'),estado:'Publicado'}),'Historia asignada ('+seq.length+' en la secuencia)')}
    else fxStatus('Historia sin asignar');R()}catch(e){fxStatus('No se pudo asignar: '+e.message,'err')}}

// ---- Vista Resumen → Instagram ----
function igV(){if(FX.ig.cargadoKey!==(S.u&&S.b?S.u.uid+'|'+S.b.id:'')){igCargar();return '<div class=fxwrap><p class=fxnote>Cargando…</p></div>'}
  if(!FX.ig.histCargado){FX.ig.histCargado=true;igCargarHist().then(()=>fxSafeRender())}
  const d=FX.ig.doc,e=FX.ig.estado||{},dueno=igEsDueno(),ahora=Date.now();
  const vence=d&&d.expiraMs?Math.ceil((d.expiraMs-ahora)/IG_DIA):null;
  let con='';
  if(dueno&&!d)con=`<details class=fxsec open><summary>Conectar Instagram a «${esc(S.b.name)}»</summary>
    <ol class=fxnote style="padding-left:18px"><li>En developers.facebook.com abre tu app → Instagram → «Configuración de la API con inicio de sesión de Instagram».</li>
    <li>En «Roles de la app → Probadores de Instagram» agrega esta cuenta y acepta la invitación en Instagram (Configuración → Apps y sitios web).</li>
    <li>En «Generar tokens de acceso» entra con esta cuenta y copia el token.</li><li>Pégalo aquí. Se guarda solo en tu cuenta: tus colaboradores no lo ven.</li></ol>
    <label>Token de acceso<input id=ig_tok type=password autocomplete=off placeholder="Pega aquí el token"></label>
    <label>ID de la cuenta de Instagram (si Meta lo muestra en el paso 2)<input id=ig_id placeholder="Ej: 17841400000000000"></label>
    <div class=row><button class=gold onclick="igConectar()">Conectar Instagram</button></div></details>`;
  else if(dueno&&d)con=`<div class=fxcards><div class=fxcard2><small>Cuenta conectada</small><b>@${esc(d.username||'')}</b><span>${esc(d.tipo||'')}</span></div>
    <div class=fxcard2><small>Token</small><b>${vence==null?'—':vence<=0?'Vencido':vence+' días'}</b><span>${vence!=null&&vence<=0?'Genera uno nuevo y vuelve a conectar':'Se renueva solo al abrir la app o con la tarea de GitHub'}</span></div>
    <div class=fxcard2><small>Última actualización</small><b>${e.ultimaSyncMs?fd(new Date(e.ultimaSyncMs)):'Nunca'}</b><span>${e.fuente==='github'?'tarea automática':e.fuente==='app'?'desde la app':''}</span></div></div>
    ${e.error?`<p class=fxnote style="color:#f87171">${esc(e.error)}</p>`:''}
    <div class=fxtools><label>Publicaciones de los últimos<select onchange="FX.ig.dias=+this.value"><option value=7 ${FX.ig.dias===7?'selected':''}>7 días</option><option value=30 ${FX.ig.dias===30?'selected':''}>30 días</option><option value=60 ${FX.ig.dias===60?'selected':''}>60 días</option><option value=90 ${FX.ig.dias===90?'selected':''}>90 días</option></select></label></div>
    <div class=row><button class=gold onclick="igActualizar()">Actualizar publicaciones</button><button onclick="igCapturarHistorias()">Capturar historias activas</button><button class=danger onclick="igDesconectar()">Desconectar</button></div>`;
  else con=`<p class=fxnote>La conexión con Instagram la gestiona el propietario de la marca. ${e.ultimaSyncMs?'Última actualización: '+fd(new Date(e.ultimaSyncMs))+'.':''}</p>`;
  const hist=FX.ig.hist;const piezasH=S.P.filter(p=>p.format==='historia').sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const lista=hist.length?hist.map(h=>{const m=h.metricas||{},cand=piezasH.filter(p=>dd(p.date,h.fecha)<=1);
    return `<div class=fxpc><div class=r1><b class=fxt2>${fd(h.fecha)} · ${esc(h.hora||'')}</b><span class=fxtag>${esc(h.tipo||'')}</span></div>
    <div class=fxmeta>Vistas ${m.views!=null?numTxt(m.views):'—'} · Alcance ${m.reach!=null?numTxt(m.reach):'—'} · Respuestas ${m.replies!=null?numTxt(m.replies):'—'} · Compartidos ${m.shares!=null?numTxt(m.shares):'—'}${m.navigation!=null?' · Navegación '+numTxt(m.navigation):''}</div>
    <div class=fxmeta>Capturada ${h.actualizadoMs?fd(new Date(h.actualizadoMs)):''} ${h.fuente==='github'?'(tarea automática)':''}</div>
    <div class=row><select onchange="igAsignarHistoria('${h.id}',this.value)"><option value="">Sin asignar a una pieza</option>${cand.map(p=>`<option value="${p.id}" ${h.piezaId===p.id?'selected':''}>${fd(p.date)} · ${esc((p.tema||'Sin tema').slice(0,40))}</option>`).join('')}</select>${h.permalink?`<button onclick="window.open('${esc(h.permalink)}','_blank','noopener')">Abrir en Instagram</button>`:''}</div></div>`}).join('')
    :'<p class=empty>Aún no hay historias capturadas. Instagram solo entrega sus métricas mientras están activas (24 h).</p>';
  return `<div class=fxwrap>${con}
    <h3 class=fxh>Historias capturadas</h3>
    <p class=fxnote>Una pieza «Historia» puede ser una secuencia: asigna cada historia a su pieza. Vistas = la mayor de la secuencia; respuestas y compartidos se suman.</p>
    ${lista}</div>`}

// Al abrir una marca propia se carga la conexión (y se renueva el token si toca).
const _pickIG=pick;
pick=function(id){_pickIG(id);FX.ig.histCargado=false;if(S.u&&S.b)igCargar()};
