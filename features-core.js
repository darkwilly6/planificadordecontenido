// ===== Núcleo de funciones nuevas =====
// Se carga después del script principal. No cambia ningún dato existente:
// solo agrega colecciones nuevas bajo users/{uid}/brands/{marca}/...
// (plantillas, movimientos, gastos). Las ideas y piezas conservan sus campos.

const FX={T:[],M:[],G:[],pre:null,rs:'general',hall:[],
  fi:{q:'',estado:'',formato:'',usada:'',img:'',orden:'reciente',vista:'tarjetas'},
  prod:{desde:'',hasta:'',fmt:'',sel:[]},
  qf:{per:'30',desde:'',hasta:'',red:'todas',fmt:'',tipo:'',enf:'',pilar:'',cat:'',emb:'',met:'views'},
  inf:{rango:'mensual',desde:'',hasta:'',redes:['ig','tt','yt'],bloques:{portada:1,resumen:1,publicaciones:1,plataformas:1,top:1,graficos:1,hallazgos:1,objetivos:1,recomendaciones:1,cobertura:1},obs:''}
};

const FX_ESTADOS_ORDEN=['Idea','Guionizado','Estructurado','Ilustrado','Grabado','Creada','Editado','Programado','Publicado'];
const fxHoy=()=>ds(new Date());
const fxId=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const fxDocs=s=>s.docs.map(d=>({id:d.id,...d.data()}));
// Firestore rechaza `undefined`: convertir a cadena vacía o eliminar.
const fxClean=o=>{const r={};Object.keys(o).forEach(k=>{const v=o[k];if(v===undefined)r[k]='';else r[k]=v});return r};
const fxDir=u=>/^https?:\/\//i.test(String(u||'').trim());

// ---- Mensajes de estado (Guardando / Guardado / Error / Sin conexión) ----
function fxStatus(t,cls){let d=document.getElementById('fxst');if(!d){d=document.createElement('div');d.id='fxst';document.body.appendChild(d)}
  d.className='fxst'+(cls?' '+cls:'');d.textContent=t;d.style.display='block';clearTimeout(d._t);
  if(cls!=='err')d._t=setTimeout(()=>{d.style.display='none'},2600)}
window.addEventListener('offline',()=>fxStatus('Sin conexión: los cambios se enviarán al volver la red','warn'));
window.addEventListener('online',()=>fxStatus('Conexión restablecida'));
// Solo se anuncia "Guardado" cuando Firestore confirma la escritura.
async function fxRun(p,ok){fxStatus('Guardando…');try{const r=await p;fxStatus(ok||'Guardado');return r}
  catch(e){fxStatus('Error: '+(e.message||e),'err');throw e}}

// Re-dibuja solo si el usuario no está escribiendo en un campo (evita perder texto).
function fxSafeRender(){if(!S.u||!S.b)return;const a=document.activeElement;
  const typing=a&&document.getElementById('app')?.contains(a)&&/INPUT|TEXTAREA|SELECT/.test(a.tagName);
  if(!typing&&!$('#modal').innerHTML)R()}

// ---- Suscripciones a las colecciones nuevas, al cambiar de marca ----
const _pick=pick;
pick=function(id){FX.T=[];FX.M=[];FX.G=[];_pick(id);if(!S.u||!S.b)return;
  up.push(cref('plantillas').onSnapshot(s=>{FX.T=fxDocs(s);fxSafeRender()},e=>fxStatus('Error al leer plantillas: '+e.message,'err')));
  up.push(cref('movimientos').onSnapshot(s=>{FX.M=fxDocs(s);fxSafeRender()},e=>fxStatus('Error al leer movimientos: '+e.message,'err')));
  up.push(cref('gastos').onSnapshot(s=>{FX.G=fxDocs(s);fxSafeRender()},e=>fxStatus('Error al leer gastos: '+e.message,'err')));
};

// ---- Almacenamiento local de imágenes (IndexedDB). Firestore nunca guarda binarios. ----
const FX_DB=()=>new Promise((res,rej)=>{const r=indexedDB.open('calendario-contenido-imagenes',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('img');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function fxIdbTx(mode,fn){const db=await FX_DB();return new Promise((res,rej)=>{const t=db.transaction('img',mode);
  const out=fn(t.objectStore('img'));t.oncomplete=()=>res(out&&out.result!==undefined?out.result:undefined);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error||new Error('Almacenamiento lleno o bloqueado'))})}
const fxKeyPre=ideaId=>S.u.uid+'|'+S.b.id+'|'+ideaId+'|';
const fxKey=(ideaId,assetId)=>fxKeyPre(ideaId)+assetId;
const fxIdbPut=(k,blob)=>fxIdbTx('readwrite',st=>st.put(blob,k));
const fxIdbGet=k=>fxIdbTx('readonly',st=>st.get(k));
const fxIdbDel=k=>fxIdbTx('readwrite',st=>st.delete(k));
async function fxIdbDelPrefix(pre){const db=await FX_DB();return new Promise((res,rej)=>{const t=db.transaction('img','readwrite');
  const rq=t.objectStore('img').openCursor(IDBKeyRange.bound(pre,pre+'￿'));
  rq.onsuccess=()=>{const c=rq.result;if(c){c.delete();c.continue()}};t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}

// ---- Plantillas ----
const FX_EJ=[
 {id:'ej1',nombre:'Reel educativo',descripcion:'Explica un concepto en 30–60 segundos.',formato:'reel',tipo:'nicho',enfoque:'solucion',embudo:'tofu',pilar:'Educación',hook:'Nadie te explicó esto, pero…',cta:'Guarda este video',libre:'Guardar o comentar',guion:'Hook: [dato o pregunta que sorprende]\nDesarrollo: [explicación en 3 pasos]\nCierre/CTA: [acción concreta]'},
 {id:'ej2',nombre:'Reel detrás de cámaras',descripcion:'Muestra el proceso real de tu marca.',formato:'reel',tipo:'nicho',enfoque:'mentalidad',embudo:'tofu',pilar:'Proceso',hook:'Así se hace esto por dentro',cta:'Sigue para ver el siguiente paso',libre:'Seguir',guion:'Hook: [momento del proceso]\nQué mostraría: [escenas]\nCierre/CTA: [pregunta a la audiencia]'},
 {id:'ej3',nombre:'Carrusel problema-solución',descripcion:'Plantea un problema común y su solución.',formato:'carrusel',tipo:'nicho',enfoque:'problema',embudo:'mofu',pilar:'Solución',hook:'¿Te pasa esto?',cta:'Escribe “quiero ayuda”',libre:'Comentar palabra clave',guion:'Slide 1 (Hook): [problema]\nSlide 2: [por qué pasa]\nSlide 3: [solución paso 1]\nSlide 4: [solución paso 2]\nSlide final/CTA: [acción]'},
 {id:'ej4',nombre:'Carrusel tutorial',descripcion:'Enseña un proceso paso a paso.',formato:'carrusel',tipo:'nicho',enfoque:'solucion',embudo:'tofu',pilar:'Tutorial',hook:'Cómo hacerlo en 4 pasos',cta:'Guarda para después',libre:'Guardar',guion:'Slide 1 (Hook): [resultado final]\nSlides 2–4: [un paso por slide]\nSlide final/CTA: [recordatorio y acción]'},
 {id:'ej5',nombre:'Historia interactiva',descripcion:'Usa encuesta o pregunta para involucrar.',formato:'historia',tipo:'nicho',enfoque:'mentalidad',embudo:'mofu',pilar:'Comunidad',hook:'Elige una opción',cta:'Responde en la encuesta',libre:'Responder',guion:'Historia 1: [pregunta o encuesta]\nHistoria 2: [resultado y comentario]\nInteracción/CTA: [enlace o pregunta]'},
 {id:'ej6',nombre:'Testimonio',descripcion:'Una experiencia real de cliente (con su permiso).',formato:'reel',tipo:'viral',enfoque:'producto',embudo:'bofu',pilar:'Prueba social',hook:'Esto me pasó antes de comprar',cta:'Escribe para saber más',libre:'Mensaje directo',guion:'Hook: [situación previa]\nDesarrollo: [qué cambió]\nCierre/CTA: [invitación]'},
 {id:'ej7',nombre:'Presentación de producto',descripcion:'Muestra qué es, para quién y por qué.',formato:'reel',tipo:'nicho',enfoque:'producto',embudo:'bofu',pilar:'Producto',hook:'Presento [producto]',cta:'Consulta disponibilidad',libre:'Enlace o mensaje',guion:'Hook: [nombre y beneficio]\nDesarrollo: [para quién, cómo se usa]\nCierre/CTA: [precio o siguiente paso]'},
 {id:'ej8',nombre:'Respuesta a objeciones',descripcion:'Responde una duda frecuente antes de comprar.',formato:'carrusel',tipo:'nicho',enfoque:'problema',embudo:'bofu',pilar:'Objeciones',hook:'“Es caro” — te explico',cta:'Escribe tu duda',libre:'Comentar',guion:'Slide 1 (Hook): [objeción]\nSlide 2: [lo que suele pasar]\nSlide 3: [respuesta honesta]\nSlide final/CTA: [invitación a preguntar]'}
].map(t=>({...t,ejemplo:true}));
const fxAllTpl=()=>[...FX_EJ,...FX.T.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es'))];
const fxFindTpl=id=>fxAllTpl().find(t=>t.id===id);

function plantillasM(){if(!S.b)return alert('Crea o elige una marca primero.');fxTplList('')}
function fxTplList(fmt){const L=fxAllTpl().filter(t=>!fmt||t.formato===fmt);
  $('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>Plantillas</h2>
  <p class=fxnote>Una plantilla guarda la estructura de una publicación. No copia estadísticas, enlaces publicados, fechas, estado ni relaciones de variante. Las de «Ejemplo» son sugerencias generales, no estrategias garantizadas.</p>
  <div class=row><select onchange="fxTplList(this.value)"><option value="">Todos los formatos</option>${Object.entries(FMT).map(([k,v])=>`<option value=${k} ${fmt===k?'selected':''}>${v.n}</option>`).join('')}</select><button class=gold onclick="fxTplForm(null)">+ Nueva plantilla</button></div>
  <div class=fxlist>${L.length?L.map(fxTplCard).join(''):'<p class=empty>No hay plantillas para este formato.</p>'}</div>
  <div class=row><button onclick=closeM()>Cerrar</button></div></div></div>`}
function fxTplCard(t){const F=FMT[t.formato]||FMT.reel;
  return `<div class=gcard><div class=r1><b>${esc(t.nombre)}</b><span class=hr2>${esc(F.n)}</span></div>${t.ejemplo?'<span class=fxtag>Ejemplo</span>':''}<p class=fxnote>${esc(t.descripcion||'')}</p><div class=row><button class=gold onclick="fxUseTpl('${t.id}')">Usar</button>${t.ejemplo?'':`<button onclick="fxTplForm('${t.id}')">Editar</button><button class=danger onclick="fxTplDel('${t.id}')">Eliminar</button>`}<button onclick="fxTplDup('${t.id}')">Duplicar</button></div></div>`}
function fxUseTpl(id){const t=fxFindTpl(id);if(!t)return;closeM();FX.pre=t;const d=new Date();d.setDate(d.getDate()+1);edit(null,ds(d))}

function fxTplForm(id){const t=id?(FX.T.find(x=>x.id===id)||{}):{formato:'reel',tipo:'nicho'};const v=k=>esc(t[k]||'');
  const opt=(o,val)=>`<option value="">—</option>${Object.entries(o).map(([k,x])=>`<option value=${k} ${val===k?'selected':''}>${x.n}</option>`).join('')}`;
  $('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>${id?'Editar plantilla':'Nueva plantilla'}</h2>
  <label>Nombre<input id=pt_n value="${v('nombre')}"></label>
  <label>Descripción<input id=pt_d value="${v('descripcion')}"></label>
  <div class=r2><label>Formato<select id=pt_f>${Object.entries(FMT).map(([k,x])=>`<option value=${k} ${t.formato===k?'selected':''}>${x.n}</option>`).join('')}</select></label><label>Tipo<select id=pt_t>${opt(TIPO,t.tipo)}</select></label></div>
  <div class=r2><label>Enfoque<select id=pt_e>${opt(ENF,t.enfoque)}</select></label><label>Etapa del embudo<select id=pt_m>${opt(EMB,t.embudo)}</select></label></div>
  <div class=r2><label>Pilar<input id=pt_p value="${v('pilar')}"></label><label>Categoría estratégica<input id=pt_c value="${v('categoria')}"></label></div>
  <label>Objetivo<input id=pt_o value="${v('objetivo')}"></label>
  <label>Ángulo<input id=pt_a value="${v('angulo')}"></label>
  <label>Tipo de gancho<input id=pt_g value="${v('tipogancho')}"></label>
  <label>Hook (editable al usarla)<input id=pt_h value="${v('hook')}"></label>
  <div class=r2><label>CTA<input id=pt_ct value="${v('cta')}"></label><label>Keyword<input id=pt_k value="${v('keyword')}"></label></div>
  <label>Tipo de CTA<input id=pt_l value="${v('libre')}"></label>
  <label>Hashtags<input id=pt_tg value="${v('tags')}"></label>
  <label>Estructura o guion base<textarea id=pt_gu style="min-height:160px">${v('guion')}</textarea></label>
  <div class=row><button class=gold onclick="fxTplSave('${id||''}')">Guardar</button><button onclick="plantillasM()">Cancelar</button></div></div></div>`}
async function fxTplSave(id){const g=i=>($('#'+i)?.value||'').trim();const nombre=g('pt_n');if(!nombre)return alert('Escribe un nombre para la plantilla.');
  const d=fxClean({nombre,descripcion:g('pt_d'),formato:g('pt_f'),tipo:g('pt_t'),enfoque:g('pt_e'),embudo:g('pt_m'),pilar:g('pt_p'),categoria:g('pt_c'),objetivo:g('pt_o'),angulo:g('pt_a'),tipogancho:g('pt_g'),hook:g('pt_h'),cta:g('pt_ct'),keyword:g('pt_k'),libre:g('pt_l'),tags:g('pt_tg'),guion:$('#pt_gu').value});
  try{if(id)await fxRun(cref('plantillas').doc(id).update(d));else await fxRun(cref('plantillas').add({...d,creada:firebase.firestore.FieldValue.serverTimestamp()}));plantillasM()}catch(e){}}
function fxTplDel(id){const t=FX.T.find(x=>x.id===id);if(!t)return;
  if(!confirm('¿Eliminar la plantilla «'+t.nombre+'»? Las publicaciones que ya creaste con ella no cambian.'))return;
  fxRun(cref('plantillas').doc(id).delete(),'Plantilla eliminada').then(()=>plantillasM()).catch(()=>{})}
function fxTplDup(id){const t=fxFindTpl(id);if(!t)return;const{id:_i,ejemplo,...rest}=t;
  fxRun(cref('plantillas').add({...rest,nombre:t.nombre+' (copia)',creada:firebase.firestore.FieldValue.serverTimestamp()}),'Plantilla duplicada').then(()=>plantillasM()).catch(()=>{})}

// Rellena el editor de piezas con una plantilla (solo campos de contenido).
function fxFill(t){if(t.formato)setE('format',t.formato);
  if(t.tipo)setE('tipo',t.tipo);if(t.enfoque)setE('enfoque',t.enfoque);if(t.embudo)setE('embudo',t.embudo);
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v)el.value=v};
  set('f_pilar',t.pilar);set('f_cat',t.categoria);set('f_obj',t.objetivo);set('f_ang',t.angulo);set('f_tg',t.tipogancho);
  set('f_hook',t.hook);set('f_cta',t.cta);set('f_key',t.keyword);set('f_libre',t.libre);set('f_tags',t.tags);set('f_gu',t.guion);
  if(t.guion){const d=document.getElementById('f_gu');d&&d.closest('details')&&(d.closest('details').open=true)}}

// Lee la pieza abierta en el editor para guardarla como plantilla (sin métricas ni enlaces).
function fxTplFromPiece(){const g=i=>($('#'+i)?.value||'').trim();
  const nombre=prompt('Nombre de la plantilla:',g('f_tema')||'Mi plantilla');if(!nombre||!nombre.trim())return;
  const d=fxClean({nombre:nombre.trim(),descripcion:'',formato:E.format||'reel',tipo:E.tipo||'',enfoque:E.enfoque||'',embudo:E.embudo||'',pilar:g('f_pilar'),categoria:g('f_cat'),objetivo:g('f_obj'),angulo:g('f_ang'),tipogancho:g('f_tg'),hook:g('f_hook'),cta:g('f_cta'),keyword:g('f_key'),libre:g('f_libre'),tags:g('f_tags'),guion:$('#f_gu').value});
  fxRun(cref('plantillas').add({...d,creada:firebase.firestore.FieldValue.serverTimestamp()}),'Plantilla guardada').catch(()=>{})}

// ---- Editor de piezas: idea de origen, guardar como plantilla y plantilla al crear ----
const _edit=edit;
edit=function(id,date){const pre=FX.pre;FX.pre=null;_edit(id,date);
  const md=document.querySelector('#modal .md');if(!md)return;
  if(!id&&pre)fxFill(pre);
  if(id){const p=S.P.find(x=>x.id===id);
    if(p&&p.ideaId){const it=S.I.find(i=>i.id===p.ideaId);
      md.querySelector('h2').insertAdjacentHTML('afterend',`<p class=fxlink><a href="#" onclick="event.preventDefault();closeM();ideaFicha('${p.ideaId}')">↩ Idea de origen: ${esc(it?ideaTit(it):'(idea eliminada)')}</a></p>`)}}
  const row=[...md.querySelectorAll('.row')].find(r=>r.querySelector('.gold'));
  if(row){const b=document.createElement('button');b.type='button';b.textContent='Guardar como plantilla';b.onclick=fxTplFromPiece;row.appendChild(b)}};

// ---- Vistas nuevas dentro de body() y las barras de semana/guiones ----
const _body=body;
body=function(){const v=S.v;
  if(v==='prod')return prodV();
  if(v==='semana')return toolbar()+fxSemBar()+semV();
  if(v==='guiones')return `<div class=fxbar><button onclick="S.v='prod';R()">Producción por etapas</button></div>`+_body();
  return _body()};
function fxSemBar(){return `<div class=fxbar><button onclick=dupSemM()>Duplicar semana</button><button onclick="S.v='prod';R()">Producción por etapas</button></div>`}
