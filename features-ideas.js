// ===== Banco de Ideas 2.0 =====
// Compatibilidad: las ideas antiguas (solo `t` y `usada`) siguen funcionando.
// Firestore guarda solo texto, referencias y metadatos de imagen; los archivos viven en IndexedDB.

const IDEA_EST=['Guardada','En desarrollo','Convertida en publicación','Archivada'];
const IDEA_OBJ=['Alcance','Interacción (guardados y compartidos)','Autoridad','Consultas','Ventas','Comunidad','Otro'];
const IDEA_MAX_IMG=3, IDEA_MAX_BYTES=5*1024*1024, IDEA_TIPOS=['image/png','image/jpeg','image/webp'];

function ideaTit(i){return i.titulo||i.t||'Sin título'}
function ideaEst(i){return i.estado||(i.usada?'Convertida en publicación':'Guardada')}
function ideaImgs(i){return Array.isArray(i.imagenes)?i.imagenes:[]}
function ideaRefs(i){return Array.isArray(i.referencias)?i.referencias:[]}
const fxFecha=c=>c&&c.toDate?fd(c.toDate()):'';
const fxPhIdea={reel:'Hook: …\nQué mostraría o diría: …\nDesarrollo: …\nCierre o CTA: …',carrusel:'Slide 1 (Hook): …\nSlides centrales (una línea por slide): …\nSlide final / CTA: …',historia:'Historia 1: …\nHistoria 2: …\nInteracción / CTA: …'};
const fxPhDefault='Escribe libremente. Puede ser una frase, una lista o un esquema.';

function ideaBuscable(i){return [ideaTit(i),i.desc,i.adaptacion,i.borrador,i.porQue,i.utilidad,ideaRefs(i).map(r=>[r.titulo,r.nota].join(' ')).join(' '),(i.etiquetas||[]).join(' ')].join(' ')}
function ideaFiltradas(){const f=FX.fi,q=nz(f.q);
  let L=S.I.filter(i=>{
    if(f.estado&&ideaEst(i)!==f.estado)return false;
    if(f.formato==='sin'){if(i.formato)return false}else if(f.formato&&i.formato!==f.formato)return false;
    if(f.usada==='si'&&!i.usada)return false;if(f.usada==='no'&&i.usada)return false;
    if(f.img==='si'&&!ideaImgs(i).length)return false;if(f.img==='no'&&ideaImgs(i).length)return false;
    if(q&&!nz(ideaBuscable(i)).includes(q))return false;return true});
  if(f.orden==='antigua')L=L.slice().reverse();
  else if(f.orden==='alfabetico')L=L.slice().sort((a,b)=>ideaTit(a).localeCompare(ideaTit(b),'es'));
  return L}

function ideasV(){const f=FX.fi;
  return `<div class=fxwrap>
  <div class=fxcap><input id=ni placeholder="Captura rápida: escribe una idea y presiona Enter" onkeydown="if(event.key==='Enter')ideaQuick()"><button class=gold onclick="ideaQuick()">Agregar</button><button onclick="ideaFicha(null)">+ Ficha completa</button></div>
  <div class=fxtools>
    <input placeholder="Buscar en título, notas, referencias, borrador…" value="${esc(f.q)}" oninput="FX.fi.q=this.value;fxIdeaRefresh()">
    <select onchange="FX.fi.estado=this.value;fxIdeaRefresh()"><option value="">Todos los estados</option>${IDEA_EST.map(e=>`<option ${f.estado===e?'selected':''}>${e}</option>`).join('')}</select>
    <select onchange="FX.fi.formato=this.value;fxIdeaRefresh()"><option value="">Todos los formatos</option><option value="sin" ${f.formato==='sin'?'selected':''}>Sin definir</option>${Object.entries(FMT).map(([k,v])=>`<option value=${k} ${f.formato===k?'selected':''}>${v.n}</option>`).join('')}</select>
    <select onchange="FX.fi.usada=this.value;fxIdeaRefresh()"><option value="">Usadas y sin usar</option><option value="si" ${f.usada==='si'?'selected':''}>Solo usadas</option><option value="no" ${f.usada==='no'?'selected':''}>Sin usar</option></select>
    <select onchange="FX.fi.img=this.value;fxIdeaRefresh()"><option value="">Con y sin imagen</option><option value="si" ${f.img==='si'?'selected':''}>Con imagen</option><option value="no" ${f.img==='no'?'selected':''}>Sin imagen</option></select>
    <select onchange="FX.fi.orden=this.value;fxIdeaRefresh()"><option value="reciente" ${f.orden==='reciente'?'selected':''}>Más recientes</option><option value="antigua" ${f.orden==='antigua'?'selected':''}>Más antiguas</option><option value="alfabetico" ${f.orden==='alfabetico'?'selected':''}>Alfabético</option></select>
  </div>
  <div class=fxtools><div class=fxseg><button class="${f.vista==='tarjetas'?'on':''}" onclick="FX.fi.vista='tarjetas';R()">Tarjetas</button><button class="${f.vista==='compacta'?'on':''}" onclick="FX.fi.vista='compacta';R()">Compacta</button></div><span class=fxnote id=fxcnt>${ideaFiltradas().length} de ${S.I.length} ideas</span></div>
  <div id=fxlist>${fxIdeaList()}</div></div>`}
function fxIdeaList(){
  if(!S.I.length)return `<div class=fxempty><p>Aún no tienes ideas en esta marca.</p><p>Escribe una arriba y presiona Enter, o usa «+ Ficha completa» para desarrollarla con referencias, imágenes y un borrador.</p></div>`;
  const L=ideaFiltradas();
  if(!L.length)return '<p class=empty>Ninguna idea coincide con los filtros.</p>';
  return FX.fi.vista==='compacta'?L.map(fxIdeaRow).join(''):`<div class=fxgrid>${L.map(fxIdeaCard).join('')}</div>`}
function fxIdeaRefresh(){const l=document.getElementById('fxlist'),c=document.getElementById('fxcnt');if(!l)return;
  l.innerHTML=fxIdeaList();if(c)c.textContent=ideaFiltradas().length+' de '+S.I.length+' ideas';fxHydrate()}
function fxIdeaCard(i){const F=FMT[i.formato],im=ideaImgs(i),cov=im.find(x=>x.modo==='local')||im[0];
  let th;
  if(!cov)th='<div class="fxthumb ph"><span>Sin imagen</span></div>';
  else if(cov.modo==='url')th=`<div class=fxthumb><img src="${esc(cov.url)}" alt="${esc(cov.alt||'')}" loading=lazy referrerpolicy=no-referrer onerror="this.parentNode.innerHTML='<span>Vista previa no disponible (el enlace bloquea la imagen)</span>'"></div>`;
  else th=`<div class=fxthumb data-asset="${cov.assetId}" data-idea="${i.id}"><span>Cargando…</span></div>`;
  return `<div class="fxcard${i.usada?' u':''}">${th}<div class=fxbody>
    <div class=r1><b class=fxt>${esc(ideaTit(i))}</b>${F?`<span class=fxtag style="--c:${F.c}">${F.n}</span>`:''}</div>
    <div class=fxmeta>${esc(ideaEst(i))}${(i.etiquetas||[]).length?' · '+i.etiquetas.map(esc).join(', '):''}${im.length?' · '+im.length+' imagen'+(im.length>1?'es':''):''}</div>
    <p class=fxdesc>${esc(((i.adaptacion||i.desc||'').split('\n')[0])||'Sin adaptación todavía')}</p>
    <div class=row><button onclick="ideaFicha('${i.id}')">Abrir ficha</button><button class=gold onclick="ideaConvertM('${i.id}')">Convertir</button><label class=fxck><input type=checkbox ${i.usada?'checked':''} onchange="ideaUsada('${i.id}',this.checked)"> Usada</label></div>
  </div></div>`}
function fxIdeaRow(i){const F=FMT[i.formato];return `<div class="ir${i.usada?' u':''}"><span class=fxt2>${esc(ideaTit(i))}</span><small class=fxmeta>${fxFecha(i.creada)} · ${esc(ideaEst(i))}${F?' · '+F.n:''}</small><button onclick="ideaFicha('${i.id}')">Abrir</button><button class=gold onclick="ideaConvertM('${i.id}')">Convertir</button></div>`}

// Carga miniaturas locales solo cuando aparecen en pantalla.
function fxHydrate(){const els=document.querySelectorAll('.fxthumb[data-asset]');
  const load=el=>{if(el.dataset.done)return;el.dataset.done=1;
    fxIdbGet(fxKey(el.dataset.idea,el.dataset.asset)).then(b=>{
      if(!b){el.innerHTML='<span>Imagen local no disponible en este dispositivo</span>';return}
      el.innerHTML=`<img alt="" src="${URL.createObjectURL(b)}">`}).catch(()=>{el.innerHTML='<span>No se pudo leer la imagen</span>'})};
  if('IntersectionObserver' in window){const io=new IntersectionObserver(en=>en.forEach(e=>{if(e.isIntersecting){load(e.target);io.unobserve(e.target)}}));els.forEach(e=>io.observe(e))}
  else els.forEach(load)}

function ideaQuick(){const el=$('#ni');const v=el.value.trim();if(!v)return;el.value='';
  fxRun(cref('ideas').add({t:v,titulo:v,usada:false,estado:'Guardada',creada:firebase.firestore.FieldValue.serverTimestamp()}),'Idea guardada')
    .catch(()=>{el.value=v})}
function ideaUsada(id,on){const i=S.I.find(x=>x.id===id)||{};let est=ideaEst(i);
  if(on)est='Convertida en publicación';else if(est==='Convertida en publicación')est='Guardada';
  fxRun(cref('ideas').doc(id).update({usada:on,estado:est})).catch(()=>{})}

// ---- Ficha completa ----
function ideaFicha(id){if(!S.b)return;const i=id?S.I.find(x=>x.id===id):null;if(id&&!i)return alert('No encuentro la idea.');
  FX.cur={id:id||null,imgs:i?ideaImgs(i).slice():[]};
  const v=k=>esc((i&&i[k])||'');const lst=k=>esc(((i&&i[k])||[]).join(', '));
  const fmtSel=(i&&i.formato)||'';const ini=i?ideaEst(i):'Guardada';
  const pubs=i&&(i.contentIds||[]).length?`<p class=fxnote>Publicaciones creadas desde esta idea: ${(i.contentIds||[]).map((pid,k)=>{const p=S.P.find(x=>x.id===pid);return p?`<a href="#" onclick="event.preventDefault();closeM();edit('${pid}')">${esc(p.tema||'Sin tema')} (${fd(p.date)})</a>`:''}).filter(Boolean).join(' · ')||'ninguna disponible'}</p>`:'';
  $('#modal').innerHTML=`<div class=ov><div class="md fxmd fxficha">
  <h2>${id?'Ficha de idea':'Nueva idea'}</h2>
  ${i?`<p class=fxnote>Estado: ${esc(ideaEst(i))}</p>`:''}${pubs}
  <details open><summary>1. Idea principal</summary>
    <label>Título de la idea<input id=fi_t value="${v('titulo')||v('t')}"></label>
    <label>Descripción o idea base<textarea id=fi_d>${v('desc')}</textarea></label>
    <div class=r2><label>Formato sugerido<select id=fi_f onchange="fxPhPh(this.value)"><option value="">Sin definir</option>${Object.entries(FMT).map(([k,x])=>`<option value=${k} ${fmtSel===k?'selected':''}>${x.n}</option>`).join('')}</select></label>
    <label>Estado<select id=fi_e>${IDEA_EST.map(e=>`<option ${ini===e?'selected':''}>${e}</option>`).join('')}</select></label></div>
    <label>Etiquetas (separadas por coma)<input id=fi_etq value="${lst('etiquetas')}"></label>
  </details>
  <details open><summary>2. Inspiración y material visual</summary>
    <div class=fxdrop tabindex=0 onclick="$('#fi_file').click()" ondragover="event.preventDefault()" ondrop="event.preventDefault();fxAddFiles(event.dataTransfer.files)">Arrastra imágenes aquí o toca para elegir · PNG, JPEG o WEBP · máx. 5 MB · hasta ${IDEA_MAX_IMG} por idea</div>
    <input type=file id=fi_file accept="image/png,image/jpeg,image/webp" multiple hidden onchange="fxAddFiles(this.files);this.value=''">
    <p class=fxnote>Las imágenes subidas son <b>locales</b>: «Imagen local: solo en este dispositivo». Otros dispositivos y colaboradores no las verán. Para verlas en otro lugar, usa una URL pública.</p>
    <div id=fi_imgs>${fxImgsHTML()}</div>
    <div class=fxurl><input id=fi_url placeholder="Imagen por URL (https://…)"><input id=fi_urlalt placeholder="Texto alternativo"><button type=button onclick="fxAddUrl()">+ Añadir por URL</button></div>
    <p class=fxnote>Una URL pública puede ser vista por cualquiera que tenga el enlace.</p>
    <h4>Referencias externas</h4>
    <div id=fi_refs>${fxRefsHTML()}</div>
    <label>¿Por qué guardé esta referencia? (qué llamó la atención)<textarea id=fi_pq>${v('porQue')}</textarea></label>
  </details>
  <details open><summary>3. Adaptación a mi marca</summary>
    <label>¿Cómo adaptaría esta idea a mi nicho?<textarea id=fi_ad>${v('adaptacion')}</textarea></label>
    <label>¿Qué elemento quiero aprovechar de la referencia?<textarea id=fi_ut>${v('utilidad')}</textarea></label>
    <label>¿Cuál es el objetivo de este contenido?<input id=fi_ob list=dl_obj value="${v('objetivo')}"></label>
    <datalist id=dl_obj>${IDEA_OBJ.map(o=>`<option value="${esc(o)}">`).join('')}</datalist>
    <label>¿A quién quiero llegar? ${S.b.publico?`<small>(perfil: ${esc(S.b.publico.slice(0,80))})</small>`:''}<input id=fi_pu value="${v('publico')}"></label>
    <div class=r2><label>Enfoque<select id=fi_en><option value="">—</option>${Object.entries(ENF).map(([k,x])=>`<option value=${k} ${(i&&i.enfoque)===k?'selected':''}>${x.n}</option>`).join('')}</select></label>
    <label>Etapa del embudo<select id=fi_em><option value="">—</option>${Object.entries(EMB).map(([k,x])=>`<option value=${k} ${(i&&i.embudo)===k?'selected':''}>${x.n}</option>`).join('')}</select></label></div>
    <div class=r2><label>Pilar<input id=fi_pi value="${v('pilar')}"></label><label>Categoría estratégica<input id=fi_ca value="${v('categoria')}"></label></div>
  </details>
  <details open><summary>4. Borrador puntual</summary>
    <p class=fxnote>Borrador rápido, no la versión definitiva. Es texto libre: no tiene que seguir la estructura.</p>
    <textarea id=fi_bo style="min-height:180px" placeholder="${esc(fxPhIdea[fmtSel]||fxPhDefault)}">${v('borrador')}</textarea>
    <div class=row><button type=button onclick="fxCopy($('#fi_bo').value,'Borrador copiado')">Copiar borrador</button></div>
    <div class=r2><label>Hook provisional<input id=fi_hk value="${v('hookProv')}"></label><label>CTA provisional<input id=fi_ct value="${v('ctaProv')}"></label></div>
  </details>
  <div class=row><button class=gold onclick="ideaSave(true)">Guardar idea</button><button onclick="ideaSave(false)">Guardar y seguir</button><button onclick="fxFichaConvert()">Convertir en publicación</button></div>
  <div class=row>${id?`<button onclick="ideaDup('${id}')">Duplicar idea</button><button onclick="ideaArchive('${id}')">Archivar</button><button class=danger onclick="ideaDel('${id}')">Eliminar</button>`:''}<button onclick="closeM()">Cerrar</button></div>
  </div></div>`}
function fxPhPh(f){const t=$('#fi_bo');if(t)t.placeholder=fxPhIdea[f]||fxPhDefault}
function fxCopy(t,msg){const ok=()=>fxStatus(msg||'Copiado');
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(t).then(ok).catch(()=>fxStatus('No se pudo copiar','err'));
  else{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){fxStatus('No se pudo copiar','err')}a.remove()}}

function fxImgsHTML(){return FX.cur.imgs.length?FX.cur.imgs.map(m=>{
  const thumb=m.modo==='url'?`<img src="${esc(m.url)}" alt="${esc(m.alt||'')}" loading=lazy referrerpolicy=no-referrer onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'Vista previa no disponible'}))">`:`<span>Cargando…</span>`;
  return `<div class=fximg><div class="fxthumb"${m.modo==='local'?` data-asset="${m.assetId}" data-idea="${FX.cur.id||''}"`:''}>${thumb}</div>
  <input placeholder="Texto descriptivo (alt)" value="${esc(m.alt||'')}" onchange="fxSetAlt('${m.assetId}',this.value)">
  <small class=fxnote>${m.modo==='local'?'Imagen local: solo en este dispositivo':'Imagen por URL'}</small>
  <div class=row><button type=button onclick="fxOpenImg('${m.assetId}')">Ampliar</button><button type=button onclick="fxDlImg('${m.assetId}')">Descargar original</button><button type=button class=danger onclick="fxDelImg('${m.assetId}')">Quitar</button></div></div>`}).join(''):'<p class=fxnote>Aún no hay imágenes.</p>'}
function fxRefreshImgs(){const el=$('#fi_imgs');if(el){el.innerHTML=fxImgsHTML();fxHydrate()}}

// Crea la idea si aún no existe, para poder guardar sus imágenes.
async function fxEnsureId(){if(FX.cur.id)return FX.cur.id;const d=fxIdeaData();if(!d)return null;
  if(!$('#fi_t').value.trim()){alert('Escribe primero un título para la idea.');return null}
  const r=await fxRun(cref('ideas').add({...d,creada:firebase.firestore.FieldValue.serverTimestamp()}),'Idea creada');FX.cur.id=r.id;return r.id}

async function fxAddFiles(files){const list=[...files];if(!list.length||!S.b)return;
  const room=IDEA_MAX_IMG-FX.cur.imgs.length;if(room<=0)return alert(`Una idea admite hasta ${IDEA_MAX_IMG} imágenes. Quita una para añadir otra.`);
  const ok=[];for(const f of list.slice(0,room)){
    if(!IDEA_TIPOS.includes(f.type))return alert('Formato no admitido: '+f.name+'. Usa PNG, JPEG o WEBP.');
    if(f.size>IDEA_MAX_BYTES)return alert(f.name+' pesa más de 5 MB. Compríme la imagen e intenta de nuevo.');
    ok.push(f)}
  if(list.length>room)alert('Solo se añadieron '+room+' de '+list.length+' (máximo '+IDEA_MAX_IMG+' por idea).');
  const id=await fxEnsureId();if(!id)return;
  for(const f of ok){const assetId=fxId();
    try{await fxIdbPut(fxKey(id,assetId),f)}catch(e){return alert('No se pudo guardar la imagen en este navegador: '+e.message+'. Revisa el espacio disponible o si estás en modo privado.')}
    FX.cur.imgs.push({assetId,modo:'local',alt:'',nombre:String(f.name).slice(0,80)})}
  await fxRun(cref('ideas').doc(id).update({imagenes:FX.cur.imgs}),'Imagen guardada en este dispositivo');
  fxRefreshImgs()}
async function fxAddUrl(){const u=$('#fi_url').value.trim(),alt=$('#fi_urlalt').value.trim();
  if(!/^https?:\/\//i.test(u))return alert('La URL debe empezar con https:// o http://');
  if(FX.cur.imgs.length>=IDEA_MAX_IMG)return alert(`Una idea admite hasta ${IDEA_MAX_IMG} imágenes.`);
  const id=await fxEnsureId();if(!id)return;
  FX.cur.imgs.push({assetId:fxId(),modo:'url',url:u,alt});
  await fxRun(cref('ideas').doc(id).update({imagenes:FX.cur.imgs}),'Imagen por URL guardada');
  $('#fi_url').value='';$('#fi_urlalt').value='';fxRefreshImgs()}
function fxSetAlt(assetId,val){const m=FX.cur.imgs.find(x=>x.assetId===assetId);if(m)m.alt=val.trim()}
async function fxDelImg(assetId){const m=FX.cur.imgs.find(x=>x.assetId===assetId);if(!m)return;
  if(!confirm('¿Quitar esta imagen'+(m.modo==='local'?' de este dispositivo':'')+'? La idea no se elimina.'))return;
  if(m.modo==='local'&&FX.cur.id)await fxIdbDel(fxKey(FX.cur.id,assetId)).catch(()=>{});
  FX.cur.imgs=FX.cur.imgs.filter(x=>x.assetId!==assetId);
  if(FX.cur.id)await fxRun(cref('ideas').doc(FX.cur.id).update({imagenes:FX.cur.imgs}),'Imagen quitada').catch(()=>{});
  fxRefreshImgs()}
async function fxDlImg(assetId){const m=FX.cur.imgs.find(x=>x.assetId===assetId);if(!m)return;
  if(m.modo==='url')return window.open(m.url,'_blank','noopener');
  const b=await fxIdbGet(fxKey(FX.cur.id,assetId)).catch(()=>null);if(!b)return alert('Esta imagen ya no está en este dispositivo.');
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=m.nombre||'imagen';document.body.appendChild(a);a.click();a.remove()}
async function fxOpenImg(assetId){const m=FX.cur.imgs.find(x=>x.assetId===assetId);if(!m)return;
  if(m.modo==='url')return window.open(m.url,'_blank','noopener');
  const b=await fxIdbGet(fxKey(FX.cur.id,assetId)).catch(()=>null);if(!b)return alert('Esta imagen ya no está en este dispositivo.');
  window.open(URL.createObjectURL(b),'_blank')}

function fxRefsHTML(){const R=FX.cur.refs&&FX.cur.refs.length?FX.cur.refs:[{}];
  return R.map((r,k)=>`<div class=fxref data-ref><input data-f=titulo placeholder="Título de referencia" value="${esc(r.titulo||'')}"><input data-f=url placeholder="URL (https://…)" value="${esc(r.url||'')}"><input data-f=plataforma placeholder="Plataforma o procedencia" value="${esc(r.plataforma||'')}"><input data-f=nota placeholder="Nota opcional" value="${esc(r.nota||'')}"><div class=row><button type=button onclick="fxOpenRef(${k})">Abrir</button><button type=button class=danger onclick="fxDelRef(${k})">Eliminar</button></div></div>`).join('')+'<button type=button onclick="fxAddRef()">+ Añadir otra referencia</button>'}
function fxCollectRefs(filtrar){const L=[...document.querySelectorAll('[data-ref]')].map(r=>({titulo:r.querySelector('[data-f=titulo]').value.trim(),url:r.querySelector('[data-f=url]').value.trim(),plataforma:r.querySelector('[data-f=plataforma]').value.trim(),nota:r.querySelector('[data-f=nota]').value.trim()}));
  return filtrar?L.filter(r=>r.titulo||r.url||r.nota||r.plataforma):L}
function fxAddRef(){FX.cur.refs=fxCollectRefs(false);FX.cur.refs.push({});$('#fi_refs').innerHTML=fxRefsHTML()}
function fxDelRef(k){FX.cur.refs=fxCollectRefs(false);FX.cur.refs.splice(k,1);$('#fi_refs').innerHTML=fxRefsHTML()}
function fxOpenRef(k){const r=fxCollectRefs(false)[k];if(r&&fxDir(r.url))window.open(r.url,'_blank','noopener');else alert('Esa referencia no tiene un enlace http(s) válido.')}

// Lee el formulario completo. Devuelve null si hay un dato inválido.
function fxIdeaData(){const g=i=>($('#'+i)?.value||'').trim();
  const refs=fxCollectRefs(true);
  const mala=refs.find(r=>r.url&&!fxDir(r.url));
  if(mala){alert('La URL de la referencia «'+(mala.titulo||mala.url)+'» debe empezar con https:// o http://');return null}
  const titulo=g('fi_t');const est=g('fi_e')||'Guardada';
  return fxClean({titulo:titulo,t:titulo,desc:$('#fi_d').value,formato:g('fi_f'),estado:est,usada:est==='Convertida en publicación',
    etiquetas:g('fi_etq').split(',').map(s=>s.trim()).filter(Boolean),referencias:refs,porQue:$('#fi_pq').value,utilidad:$('#fi_ut').value,
    adaptacion:$('#fi_ad').value,objetivo:g('fi_ob'),publico:g('fi_pu'),enfoque:g('fi_en'),embudo:g('fi_em'),pilar:g('fi_pi'),categoria:g('fi_ca'),
    borrador:$('#fi_bo').value,hookProv:g('fi_hk'),ctaProv:g('fi_ct'),imagenes:FX.cur.imgs,updatedAt:firebase.firestore.FieldValue.serverTimestamp()})}

async function ideaSave(cerrar){const d=fxIdeaData();if(!d)return null;
  if(!$('#fi_t').value.trim())return alert('Escribe un título para la idea.'),null;
  try{if(FX.cur.id)await fxRun(cref('ideas').doc(FX.cur.id).update(d));
    else{const r=await fxRun(cref('ideas').add({...d,creada:firebase.firestore.FieldValue.serverTimestamp()}));FX.cur.id=r.id}
    if(cerrar)closeM();return FX.cur.id}catch(e){return null}}
async function fxFichaConvert(){const id=await ideaSave(false);if(id)ideaConvertM(id)}
function ideaArchive(id){fxRun(cref('ideas').doc(id).update({estado:'Archivada',updatedAt:firebase.firestore.FieldValue.serverTimestamp()}),'Idea archivada').then(()=>closeM()).catch(()=>{})}
function ideaDel(id){if(!confirm('¿Eliminar esta idea y sus imágenes guardadas en este dispositivo? Las publicaciones creadas desde ella se conservan.'))return;
  fxRun(cref('ideas').doc(id).delete(),'Idea eliminada').then(()=>fxIdbDelPrefix(fxKeyPre(id))).then(()=>closeM()).catch(()=>{})}
async function ideaDup(id){const i=S.I.find(x=>x.id===id);if(!i)return;
  const {id:_a,contentIds,usada,estado,creada,imagenes,...rest}=i;
  try{const copias=[];
    const nuevo=await fxRun(cref('ideas').add({...rest,titulo:ideaTit(i)+' (copia)',t:ideaTit(i)+' (copia)',estado:'Guardada',usada:false,contentIds:[],imagenes:[],creada:firebase.firestore.FieldValue.serverTimestamp()}),'Idea duplicada');
    for(const m of ideaImgs(i)){if(m.modo==='local'){const b=await fxIdbGet(fxKey(id,m.assetId)).catch(()=>null);
        if(b){const a=fxId();await fxIdbPut(fxKey(nuevo.id,a),b);copias.push({...m,assetId:a})}}
      else copias.push(m)}
    await fxRun(cref('ideas').doc(nuevo.id).update({imagenes:copias}));
    ideaFicha(nuevo.id)}catch(e){}}

// ---- Convertir idea en publicación (una sola escritura atómica) ----
function fxConvBuild(i,f,tplId){const tpl=tplId?fxFindTpl(tplId):null;const ref=ideaRefs(i).find(r=>r.url)||{};
  const b={tema:ideaTit(i),idea:i.desc||'',enfoque:i.enfoque||'',embudo:i.embudo||'',pilar:i.pilar||'',categoria:i.categoria||'',objetivo:i.objetivo||'',hook:i.hookProv||'',cta:i.ctaProv||'',ref:ref.url||'',guion:i.borrador||'',tipo:'',angulo:'',tipogancho:'',keyword:'',libre:'',tags:''};
  if(tpl){const relleno={tipo:tpl.tipo,angulo:tpl.angulo,tipogancho:tpl.tipogancho,hook:tpl.hook,cta:tpl.cta,keyword:tpl.keyword,libre:tpl.libre,tags:tpl.tags,objetivo:tpl.objetivo,pilar:tpl.pilar,categoria:tpl.categoria,enfoque:tpl.enfoque,embudo:tpl.embudo};
    Object.keys(relleno).forEach(k=>{if(!b[k]&&relleno[k])b[k]=relleno[k]})}
  if(!b.guion&&tpl&&tpl.guion)b.guion=tpl.guion;return b}
function fxConvPreview(b){const L=[['Tema',b.tema],['Idea',b.idea],['Enfoque',ENF[b.enfoque]?.n||b.enfoque],['Pilar',b.pilar],['Categoría',b.categoria],['Etapa del embudo',EMB[b.embudo]?.n||b.embudo],['Objetivo',b.objetivo],['Hook provisional',b.hook],['CTA provisional',b.cta],['Referencia',b.ref],['Borrador → Guion o Estructura',b.guion]].filter(x=>x[1]);
  return '<b>Se transferirá (editable después):</b><ul>'+(L.map(x=>`<li><b>${x[0]}:</b> ${esc(String(x[1]).slice(0,120))}</li>`).join('')||'<li>Nada: la idea todavía no tiene campos.</li>')+'</ul><p class=fxnote>Las imágenes se quedan en la ficha de la idea; no se copian a la publicación. La idea queda enlazada.</p>'}
function ideaConvertM(id){const i=S.I.find(x=>x.id===id);if(!i||!S.b)return alert('No encuentro la idea.');
  const t=new Date();t.setDate(t.getDate()+1);const prev=(i.contentIds||[]).length;
  $('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>Convertir en publicación</h2>
  <p class=fxnote>Crea una publicación a partir de «${esc(ideaTit(i))}».${prev?`<br><b>Esta idea ya tiene ${prev} publicación(es).</b> Se creará otra; no se duplica nada automáticamente.`:''}</p>
  <div class=r2><label>Fecha<input type=date id=cv_d value="${ds(t)}"></label><label>Hora<input type=time id=cv_h></label></div>
  <label>Formato<select id=cv_f onchange="fxConvRefresh('${id}')">${Object.entries(FMT).map(([k,x])=>`<option value=${k} ${(i.formato||'reel')===k?'selected':''}>${x.n}</option>`).join('')}</select></label>
  <label>Plantilla (opcional: rellena solo los campos vacíos)<select id=cv_p onchange="fxConvRefresh('${id}')"><option value="">Sin plantilla</option>${fxAllTpl().map(x=>`<option value="${x.id}">${esc(x.nombre)}${x.ejemplo?' (ejemplo)':''}</option>`).join('')}</select></label>
  <div class=fxprev id=cv_prev>${fxConvPreview(fxConvBuild(i,i.formato||'reel',''))}</div>
  <div class=row><button class=gold id=cv_go onclick="ideaConvertGo('${id}')">Crear publicación</button><button onclick="closeM()">Cancelar</button></div></div></div>`}
function fxConvRefresh(id){const i=S.I.find(x=>x.id===id);if(!i)return;$('#cv_prev').innerHTML=fxConvPreview(fxConvBuild(i,$('#cv_f').value,$('#cv_p').value))}
async function ideaConvertGo(id){const i=S.I.find(x=>x.id===id);if(!i)return;
  const g=k=>($('#'+k)?.value||'').trim();const date=g('cv_d'),f=g('cv_f');if(!date)return alert('Elige una fecha.');
  const b=fxConvBuild(i,f,g('cv_p'));
  const pieza=fxClean({date,hora:g('cv_h'),format:f,tipo:b.tipo,enfoque:b.enfoque,embudo:b.embudo,pilar:b.pilar,categoria:b.categoria,objetivo:b.objetivo,tema:b.tema,idea:b.idea,angulo:b.angulo,tipogancho:b.tipogancho,hook:b.hook,cta:b.cta,keyword:b.keyword,libre:b.libre,ref:b.ref,desc:'',tags:b.tags,guion:b.guion,
    estado:(b.guion&&EST[f][1])?EST[f][1]:EST[f][0],links:{ig:'',tt:'',yt:''},m:{},ideaId:id,creada:firebase.firestore.FieldValue.serverTimestamp()});
  const lote=db.batch(),pr=cref('pieces').doc();
  lote.set(pr,pieza);
  lote.update(cref('ideas').doc(id),{contentIds:firebase.firestore.FieldValue.arrayUnion(pr.id),estado:'Convertida en publicación',usada:true,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
  try{await fxRun(lote.commit(),'Publicación creada desde la idea');closeM();S.v='mes';S.d=pd(date);R()}
  catch(e){}}
