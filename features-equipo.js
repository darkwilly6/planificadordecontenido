// ===== Equipos y permisos (Etapa 5) =====
// Modelo: la marca vive en users/{propietario}/brands/{marca} (sin migración).
// Un colaborador tiene un documento users/{propietario}/brands/{marca}/miembros/{uid}
// con su rol: esa es la fuente de verdad. Las reglas (firestore.rules) hacen cumplir los
// permisos; la interfaz los refleja y, además, bloquea escrituras en modo lectura.

FX.rol='owner';FX.rolKey=null;FX.rolSub=null;FX.accMap={};FX.accUid=null;FX.accSub=null;FX.eqSubs=[];FX.miem=[];FX.invs=[];FX.invPend=null;FX.invChecked=false;FX.pendingPick=null;
FX.invId=null;try{FX.invId=new URLSearchParams(location.search).get('inv')}catch(e){}
const FX_ROL_TXT={owner:'Propietario',editor:'Editor',viewer:'Solo lectura'};
const fxOwner=()=>(S.b&&S.b.owner)||(S.u&&S.u.uid);
const fxEmail=()=>((auth.currentUser&&auth.currentUser.email)||'').toLowerCase();
const fxFechaMs=x=>x?(x.toDate?x.toDate().getTime():new Date(x).getTime()):0;
const fxFmtFecha=x=>{const ms=fxFechaMs(x);return ms?fd(new Date(ms)):''};
const fxRandId=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
const FX_NO_LEC='Solo lectura: no tienes permiso para cambiar esta marca.';

// ---- Bloqueo de escrituras en modo lectura (además de las reglas) ----
function fxRO(o){return new Proxy(o,{get(t,k){
  if(k==='add'||k==='set'||k==='update'||k==='delete')return()=>Promise.reject(new Error(FX_NO_LEC));
  const v=Reflect.get(t,k,t);if(typeof v!=='function')return v;
  return(...a)=>{const r=v.apply(t,a);return(r&&typeof r==='object'&&('doc' in r||'collection' in r||'update' in r))?fxRO(r):r}}})}
// cref (main) está definido dentro del bloque de inicio y usa la versión original de bref:
// se redefine aquí para que las escrituras vayan a la cuenta del propietario de la marca.
window.cref=function(n){return bref().doc(S.b.id).collection(n)};
// La colección de marcas apunta al propietario de la marca abierta.
window.bref=function(){const c=db.collection('users').doc(fxOwner()).collection('brands');return FX.rol==='viewer'?fxRO(c):c};
const _dbBatch=db.batch.bind(db);
db.batch=function(){if(FX.rol!=='viewer')return _dbBatch();const z=()=>{};
  return{set:z,update:z,delete:z,commit:()=>Promise.reject(new Error(FX_NO_LEC))}};

// ---- Marcas compartidas conmigo (índice en mi cuenta; las reglas protegen los datos) ----
function fxSubAcc(){if(!S.u||FX.accUid===S.u.uid)return;FX.accUid=S.u.uid;
  FX.accSub&&FX.accSub();
  FX.accSub=db.collection('users').doc(S.u.uid).collection('accesos').onSnapshot(s=>{
    const keys=new Set(s.docs.map(d=>d.id));
    s.docs.forEach(d=>{if(FX.accMap[d.id])return;const a=d.data();
      FX.accMap[d.id]={unsub:null,brand:null,retry:null};
      FX.accMap[d.id].unsub=fxWatchBrand(d.id,a,0)});
    Object.keys(FX.accMap).forEach(k=>{if(!keys.has(k))fxDropAcc(k,false)});
    fxRefreshShared()},()=>{});
}
// Escucha la marca del propietario. Si la lectura falla (por ejemplo, justo al aceptar,
// antes de que el servidor guarde la membresía), reintenta: NUNCA borra el acceso por un error.
function fxWatchBrand(key,a,intento){
  return db.collection('users').doc(a.ownerUid).collection('brands').doc(a.brandId).onSnapshot(b=>{
    const e=FX.accMap[key];if(!e)return;
    e.brand=b.exists?{id:b.id,...b.data(),owner:a.ownerUid,accKey:key}:null;
    fxRefreshShared()},()=>{
    const e=FX.accMap[key];if(!e)return;e.brand=null;fxRefreshShared();
    if(intento<6)e.retry=setTimeout(()=>{const x=FX.accMap[key];if(!x)return;x.unsub&&x.unsub();x.unsub=fxWatchBrand(key,a,intento+1)},1500*(intento+1))})}
function fxDropAcc(k,borrar){const e=FX.accMap[k];if(e){e.unsub&&e.unsub();e.retry&&clearTimeout(e.retry)}delete FX.accMap[k];
  if(borrar&&S.u)db.collection('users').doc(S.u.uid).collection('accesos').doc(k).delete().catch(()=>{});
  fxRefreshShared()}
function fxRefreshShared(){FX.shared=Object.values(FX.accMap).map(x=>x.brand).filter(Boolean);
  if(!S.u)return;
  S.brands=S.brands.filter(b=>!b.owner).concat(FX.shared);
  if(FX.pendingPick&&S.brands.some(b=>b.id===FX.pendingPick)){const id=FX.pendingPick;FX.pendingPick=null;closeM();pick(id);return}
  // Sin marca abierta (cuenta sin marcas propias) y llega una compartida: abrirla.
  if(!S.b&&FX.shared.length){const m=$('#modal'),h=m&&m.querySelector('h2');
    if(h&&h.textContent==='Nueva marca'&&![...m.querySelectorAll('input')].some(i=>i.value.trim()))closeM();
    if(!$('#modal').innerHTML){pick(FX.shared[0].id);return}}
  if(S.b&&S.b.owner&&!S.brands.some(b=>b.id===S.b.id)){pick(null);return}
  R()}

// ---- Rol en la marca abierta (documento de membresía) ----
function fxSubRol(){const k=S.b&&S.b.owner?S.b.owner+'/'+S.b.id:null;
  if(k===FX.rolKey)return;FX.rolKey=k;FX.rolSub&&FX.rolSub();FX.rolSub=null;
  if(!k){FX.rol='owner';return}
  FX.rol='viewer';
  FX.rolSub=db.collection('users').doc(S.b.owner).collection('brands').doc(S.b.id).collection('miembros').doc(S.u.uid).onSnapshot(d=>{
    // Solo se da por perdido el acceso cuando el SERVIDOR confirma que la membresía no existe.
    if(!d.exists&&d.metadata&&d.metadata.fromCache)return;
    if(!d.exists){FX.rol='viewer';const ak=S.b.accKey||(S.b.owner+'_'+S.b.id);
      fxStatus('Ya no tienes acceso a «'+(S.b.name||'esta marca')+'»','err');
      FX.rolSub&&FX.rolSub();FX.rolSub=null;FX.rolKey=null;fxDropAcc(ak,true);return}
    FX.rol=d.data().rol==='editor'?'editor':'viewer';R()},()=>{FX.rol='viewer';R()});
}

const _pick2=pick;
pick=function(id){
  const tgt=S.brands.find(x=>x.id===id)||S.brands[0];
  const tk=tgt&&tgt.owner?tgt.owner+'/'+tgt.id:null;
  if(tk!==FX.rolKey)FX.rol=tk?'viewer':'owner';
  _pick2(id);
  if(!S.u)return;
  fxSubAcc();fxSubRol();
  if(FX.invId&&!FX.invChecked&&auth.currentUser)fxAcceptFlow();
};

// ---- Invitación: aceptar (solo con correo verificado y correo igual al invitado) ----
function fxInfo(msg){$('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>Invitación</h2><p>${esc(msg)}</p><div class=row><button onclick="closeM()">Cerrar</button></div></div></div>`}
async function fxAcceptFlow(){FX.invChecked=true;const id=FX.invId,u=auth.currentUser;if(!id||!u)return;
  let inv=null,err=null;try{const d=await db.collection('invitaciones').doc(id).get();inv=d.exists?{id:d.id,...d.data()}:null}catch(e){err=e;inv=null}
  // Las reglas solo permiten leer la invitación con correo verificado: primero se pide verificar.
  if(!u.emailVerified){FX.invChecked=false;
    $('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>Verifica tu correo</h2><p>Para aceptar una invitación necesitas verificar tu correo. Pulsa «Reenviar verificación», abre el correo (revisa también spam) y luego pulsa «Ya verifiqué».</p>
    <div class=row><button onclick="fxResend()">Reenviar verificación</button><button class=gold onclick="fxYaVerifique()">Ya verifiqué</button><button onclick="closeM()">Cerrar</button></div></div></div>`;return}
  if(!inv)return fxInfo('No encuentro esta invitación'+(err?' ('+(err.code||err.message)+')':'')+'. Revisa que entres con el correo al que se envió la invitación, y que el enlace esté completo.');
  if(inv.recipientEmail!==fxEmail())return fxInfo(`Esta invitación es para ${inv.recipientEmail}. Estás con otro correo: cierra sesión y entra con el correo invitado.`);
  // Recuperación: ya aceptaste esta invitación con esta cuenta → se rehace tu acceso y se abre la marca.
  if(inv.status==='aceptada'&&inv.acceptedBy===u.uid){
    FX.pendingPick=inv.brandId;FX.invId=null;history.replaceState(null,'',location.pathname);
    try{await fxRun(db.collection('users').doc(u.uid).collection('accesos').doc(inv.ownerUid+'_'+inv.brandId).set({ownerUid:inv.ownerUid,brandId:inv.brandId,name:inv.brandName||'Marca compartida'}),'Abriendo «'+(inv.brandName||'la marca')+'»…')}catch(e){FX.pendingPick=null}
    return}
  if(inv.status!=='pendiente')return fxInfo(`Esta invitación ya está ${inv.status==='aceptada'?'aceptada':inv.status==='revocada'?'revocada':'vencida'}.`);
  if(fxFechaMs(inv.expiresAt)<=Date.now())return fxInfo('Esta invitación venció. Pide al propietario una nueva.');
  FX.invPend=inv;
  $('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>Invitación a marca</h2><p>Te invitaron a <b>${esc(inv.brandName||'una marca')}</b> como <b>${esc(FX_ROL_TXT[inv.rol]||inv.rol)}</b>.</p>
  <p class=fxnote>${inv.rol==='editor'?'Podrás crear y editar contenido de esta marca.':'Solo podrás ver el contenido y los informes de esta marca.'} No tendrás acceso a tus otras marcas ni a las de otras personas.</p>
  <div class=row><button class=gold onclick="fxAccept()">Aceptar invitación</button><button onclick="fxRechazar()">Ahora no</button></div></div></div>`}
function fxResend(){const u=auth.currentUser;u&&u.sendEmailVerification().then(()=>fxStatus('Correo de verificación enviado')).catch(e=>fxStatus('No se pudo enviar: '+e.message,'err'))}
async function fxYaVerifique(){const u=auth.currentUser;if(!u)return;
  try{await u.reload();await u.getIdToken(true)}catch(e){}
  if(u.emailVerified){closeM();FX.invChecked=false;fxAcceptFlow()}else fxStatus('Todavía no aparece verificado. Haz clic en el enlace del correo y vuelve a intentarlo.','warn')}
function fxRechazar(){closeM();FX.invId=null;FX.invPend=null;history.replaceState(null,'',location.pathname)}
async function fxAccept(){const inv=FX.invPend,u=auth.currentUser;if(!inv||!u)return;
  const lote=db.batch();
  lote.update(db.collection('invitaciones').doc(inv.id),{status:'aceptada',acceptedBy:u.uid,aceptadaEl:firebase.firestore.FieldValue.serverTimestamp()});
  lote.set(db.collection('users').doc(inv.ownerUid).collection('brands').doc(inv.brandId).collection('miembros').doc(u.uid),{uid:u.uid,email:fxEmail(),rol:inv.rol,invId:inv.id,unidoEl:firebase.firestore.FieldValue.serverTimestamp()});
  lote.set(db.collection('users').doc(u.uid).collection('accesos').doc(inv.ownerUid+'_'+inv.brandId),{ownerUid:inv.ownerUid,brandId:inv.brandId,name:inv.brandName||'Marca compartida'});
  // Se marca antes de guardar: la marca se abre en cuanto llegue, sin importar el orden de los datos.
  FX.pendingPick=inv.brandId;
  try{await fxRun(lote.commit(),'Te uniste a la marca');
    FX.invId=null;FX.invPend=null;history.replaceState(null,'',location.pathname);closeM();
    if(S.brands.some(b=>b.id===inv.brandId)){FX.pendingPick=null;pick(inv.brandId)}}
  catch(e){FX.pendingPick=null}}

// ---- Equipo en el perfil de marca ----
const _brandM=brandM;
brandM=function(ed){_brandM(ed);if(!ed||!S.b||!S.u)return;const md=document.querySelector('#modal .md');if(!md)return;
  const row=[...md.querySelectorAll('.row')].pop();
  if(fxOwner()===S.u.uid){
    row.insertAdjacentHTML('beforebegin',`<details class=fxsec open><summary>Equipo de esta marca</summary>
      <p class=fxnote>Tú eres la propietaria. Los editores crean y editan contenido; los lectores solo ven. Nadie puede cambiar la propiedad de la marca.</p>
      <div id=fx_miem></div><h4>Invitar a alguien</h4>
      <div class=r2><label>Correo<input id=fx_ie type=email autocomplete=off></label><label>Rol<select id=fx_ir><option value=editor>Editor</option><option value=viewer>Solo lectura</option></select></label></div>
      <div class=row><button class=gold onclick="fxInvite()">Crear invitación</button></div>
      <p class=fxnote>La app no envía correos. Copia el enlace y compártelo tú por WhatsApp o correo. El invitado debe verificar su correo para aceptar.</p>
      <div id=fx_invs></div></details>`);
    fxEquipoLoad()}
  else{
    md.querySelector('h2').insertAdjacentHTML('afterend',`<p class=fxnote>Marca compartida contigo como <b>${esc(FX_ROL_TXT[FX.rol]||'')}</b>. Solo el propietario cambia la identidad de la marca.</p>`);
    const b=document.createElement('button');b.textContent='Salir de esta marca';b.className='danger';b.onclick=fxLeave;row.appendChild(b)}
};
function fxEquipoLoad(){FX.eqSubs.forEach(f=>f());FX.eqSubs=[];const me=S.u.uid,mid=S.b.id;
  FX.eqSubs.push(db.collection('users').doc(me).collection('brands').doc(mid).collection('miembros').onSnapshot(s=>{FX.miem=fxDocs(s);fxRenderMiem()}));
  FX.eqSubs.push(db.collection('invitaciones').where('ownerUid','==',me).where('brandId','==',mid).onSnapshot(s=>{FX.invs=fxDocs(s);fxRenderInvs()}));
}
function fxRenderMiem(){const el=document.getElementById('fx_miem');if(!el)return;
  el.innerHTML=`<div class=fxmeta><b>Propietario:</b> tú (${esc(fxEmail())})</div>`+(FX.miem.length?FX.miem.map(m=>`<div class=fxpc>
    <div class=fxt2>${esc(m.email||'Sin correo')}</div><div class=fxmeta>${m.unidoEl?'Se unió el '+esc(fxFmtFecha(m.unidoEl)):''}</div>
    <div class=row><select onchange="fxSetRol('${m.id}',this.value)"><option value=editor ${m.rol==='editor'?'selected':''}>Editor</option><option value=viewer ${m.rol==='viewer'?'selected':''}>Solo lectura</option></select><button class=danger onclick="fxQuitar('${m.id}')">Quitar acceso</button></div></div>`).join(''):'<p class=fxnote>Todavía no hay colaboradores.</p>')}
function fxRenderInvs(){const el=document.getElementById('fx_invs');if(!el)return;
  el.innerHTML='<h4>Invitaciones</h4>'+(FX.invs.length?FX.invs.slice().sort((a,b)=>fxFechaMs(b.creadoEl)-fxFechaMs(a.creadoEl)).map(i=>{
    const venc=i.status==='pendiente'&&fxFechaMs(i.expiresAt)<=Date.now();const est=venc?'vencida':i.status;
    const link=location.origin+location.pathname+'?inv='+i.id;
    return `<div class=fxpc><div class=fxt2>${esc(i.recipientEmail)}</div><div class=fxmeta>${esc(FX_ROL_TXT[i.rol]||i.rol)} · ${esc(est)}${i.status==='pendiente'&&!venc?' · vence el '+esc(fxFmtFecha(i.expiresAt)):''}</div>
    <div class=row>${est==='pendiente'?`<button onclick="fxCopy('${link}','Enlace copiado')">Copiar enlace</button><button class=danger onclick="fxRevocar('${i.id}')">Revocar</button>`:''}</div></div>`}).join(''):'<p class=fxnote>No hay invitaciones.</p>')}
async function fxInvite(){const em=($('#fx_ie').value||'').trim().toLowerCase(),rol=$('#fx_ir').value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return alert('Escribe un correo válido.');
  if(em===fxEmail())return alert('No puedes invitarte a ti misma o a ti mismo: ya eres propietario.');
  if(FX.invs.some(i=>i.recipientEmail===em&&i.status==='pendiente'&&i.brandId===S.b.id&&fxFechaMs(i.expiresAt)>Date.now()))return alert('Ya hay una invitación pendiente para ese correo.');
  const id=fxRandId();
  try{await fxRun(db.collection('invitaciones').doc(id).set({ownerUid:S.u.uid,brandId:S.b.id,brandName:S.b.name||'Marca',recipientEmail:em,rol,status:'pendiente',invitedBy:S.u.uid,creadoEl:firebase.firestore.FieldValue.serverTimestamp(),expiresAt:new Date(Date.now()+14*864e5)}),'Invitación creada');
    $('#fx_ie').value='';fxCopy(location.origin+location.pathname+'?inv='+id,'Invitación creada. Enlace copiado')}catch(e){}}
function fxSetRol(uid,rol){fxRun(db.collection('users').doc(S.u.uid).collection('brands').doc(S.b.id).collection('miembros').doc(uid).update({rol}),'Rol actualizado').catch(()=>{})}
function fxQuitar(uid){if(!confirm('¿Quitar el acceso de esta persona? Ya no verá ni cambiará esta marca.'))return;
  fxRun(db.collection('users').doc(S.u.uid).collection('brands').doc(S.b.id).collection('miembros').doc(uid).delete(),'Acceso quitado').catch(()=>{})}
function fxRevocar(id){if(!confirm('¿Revocar esta invitación? El enlace dejará de funcionar.'))return;
  fxRun(db.collection('invitaciones').doc(id).update({status:'revocada',revocadaEl:firebase.firestore.FieldValue.serverTimestamp()}),'Invitación revocada').catch(()=>{})}
function fxLeave(){if(!S.b||!S.b.owner)return;if(!confirm('¿Salir de «'+(S.b.name||'esta marca')+'»? La marca sigue existiendo para su propietario.'))return;
  const lote=db.batch();
  lote.delete(db.collection('users').doc(S.b.owner).collection('brands').doc(S.b.id).collection('miembros').doc(S.u.uid));
  lote.delete(db.collection('users').doc(S.u.uid).collection('accesos').doc(S.b.accKey||(S.b.owner+'_'+S.b.id)));
  fxRun(lote.commit(),'Saliste de la marca').then(()=>{closeM();FX.rolKey=null;FX.rol='owner';pick(null)}).catch(()=>{})}

// ---- Reglas de interfaz según el rol ----
const FX_OK=/^(Mes|Semana|Lista|Ideas|Guiones|Resumen|Reutilizar.*|No publicados.*|Hoy|‹|›|Tema|Salir|\+ Marca|Perfil|Cerrar|Cancelar|Vista general|Qué funciona|Objetivos|Informes|Tarjetas|Compacta|Ampliar|Abrir.*|Ver .*|Copiar.*|Imprimir.*|Exportar imagen.*|Exportar hallazgo|Descargar original|Compartir.*|WhatsApp|Telegram|Correo|▶ Teleprompter|Producción por etapas|← Volver.*|Actualizar vista previa|Limpiar selección|Salir de esta marca)$/;
const FX_NO_EDITOR=/^(Eliminar semana|Guardar perfil|\+ Añadir meta|Quitar meta|Eliminar selección|Invitar.*|Crear invitación|Quitar acceso|Revocar)$/;
let fxGateQ=false;
function fxGate(){fxGateQ=false;const app=document.getElementById('app'),mod=document.getElementById('modal');if(!app)return;
  const ro=FX.rol==='viewer',ed=FX.rol==='editor';
  document.body.classList.toggle('fx-ro',ro);
  // Perfil de marca para no propietarios: solo lectura.
  const perfilLock=FX.rol!=='owner'&&S.b&&S.b.owner&&mod&&mod.querySelector('h2')&&mod.querySelector('h2').textContent==='Perfil de marca';
  [app,mod].forEach(root=>{if(!root)return;const enModal=root===mod;
    root.querySelectorAll('button').forEach(b=>{const t=(b.textContent||'').trim();
      let oculto=false;
      if(ro&&!FX_OK.test(t)&&!(b.className||'').includes('fxshow'))oculto=true;
      if(ed&&FX_NO_EDITOR.test(t))oculto=true;
      if(perfilLock&&enModal&&!/^(Cerrar|Cancelar|Salir de esta marca)$/.test(t))oculto=true;
      if(oculto){b.style.display='none';b.dataset.fxh='1'}
      else if(b.dataset.fxh){b.style.display='';delete b.dataset.fxh}});
    const campos=root.querySelectorAll('input,select,textarea');
    campos.forEach(el=>{const bloquear=(ro&&enModal)||(ro&&el.type==='checkbox')||(perfilLock&&enModal);
      if(bloquear){el.disabled=true;el.dataset.fxd='1'}else if(el.dataset.fxd){el.disabled=false;delete el.dataset.fxd}});
  });
  if(ro)app.querySelectorAll('.fxcap').forEach(e=>{e.style.display='none';e.dataset.fxh='1'});
  else app.querySelectorAll('.fxcap[data-fxh]').forEach(e=>{e.style.display='';delete e.dataset.fxh});
  // Lista de marcas: las compartidas llevan su rol.
  document.querySelectorAll('#bs option').forEach(o=>{const b=S.brands.find(x=>x.id===o.value);
    if(b&&b.owner){const t=b.name+' (compartida)';if(o.textContent!==t)o.textContent=t}});
}
function fxGateSoon(){if(fxGateQ)return;fxGateQ=true;setTimeout(fxGate,0)}
new MutationObserver(fxGateSoon).observe(document.body,{childList:true,subtree:true});

// Mensaje claro al abrir la app desde un enlace de invitación.
const _authUI=authUI;
authUI=function(){_authUI();if(FX.invId){const a=document.querySelector('#app .auth');
  if(a)a.insertAdjacentHTML('afterbegin','<p class=fxnote>Te invitaron a una marca. Entra o regístrate con el correo al que llegó la invitación.</p>')}};

// La limpieza automática de fechas es una escritura: no la hace un lector.
const _fixDatesOrig=fixDates;
fixDates=function(){if(FX.rol==='viewer')return;return _fixDatesOrig()};
