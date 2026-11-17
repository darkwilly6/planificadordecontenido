// ===== Producción por lotes =====
// Tablero por etapas reales de cada formato, sesión de grabación, edición masiva
// con vista previa y duplicación de semana con detección de coincidencias.

const FX_LOTE=400;

// Siguiente etapa real de la pieza según su formato (no se inventa un flujo único).
function fxSiguiente(p){const L=EST[p.format]||[];const i=L.indexOf(p.estado);
  if(i<0)return 'Revisar estado';return L[i+1]||'Publicado'}

function fxProdPiezas(){const f=FX.prod;
  return S.P.filter(p=>p.estado!=='Publicado'&&(!f.desde||p.date>=f.desde)&&(!f.hasta||p.date<=f.hasta)&&(!f.fmt||p.format===f.fmt))
    .sort((a,b)=>(a.date+(a.hora||'')).localeCompare(b.date+(b.hora||'')))}

function prodV(){const f=FX.prod;
  if(!f.desde){f.desde=fxHoy();const d=new Date();d.setDate(d.getDate()+30);f.hasta=ds(d)}
  const L=fxProdPiezas(),cols={};
  L.forEach(p=>{const n=fxSiguiente(p);(cols[n]=cols[n]||[]).push(p)});
  const orden=[...FX_ESTADOS_ORDEN,'Revisar estado'];
  const claves=Object.keys(cols).sort((a,b)=>orden.indexOf(a)-orden.indexOf(b));
  const sesion=L.filter(p=>p.format==='reel'&&p.estado==='Guionizado');
  return `<div class=fxwrap>
  <div class=fxbar><button onclick="S.v='semana';R()">← Volver al calendario</button></div>
  <h3 class=fxh>Producción por etapas</h3>
  <p class=fxnote>Cada tarjeta muestra la etapa real de su formato. «Pendiente: X» indica el siguiente paso. Avanzar no cambia tu flujo: solo pasa a la siguiente etapa de ese formato.</p>
  <div class=fxtools>
    <label>Desde<input type=date value="${f.desde}" onchange="FX.prod.desde=this.value;R()"></label>
    <label>Hasta<input type=date value="${f.hasta}" onchange="FX.prod.hasta=this.value;R()"></label>
    <select onchange="FX.prod.fmt=this.value;R()"><option value="">Todos los formatos</option>${Object.entries(FMT).map(([k,v])=>`<option value=${k} ${f.fmt===k?'selected':''}>${v.n}</option>`).join('')}</select>
  </div>
  <div class=fxkan>${claves.length?claves.map(k=>`<div class=fxcol><h4>Pendiente: ${esc(k)} <small>${cols[k].length}</small></h4>${cols[k].map(fxProdCard).join('')}</div>`).join(''):'<p class=empty>No hay piezas pendientes en este rango.</p>'}</div>
  <h3 class=fxh>Sesión de grabación <small>(reels listos para grabar: ${sesion.length})</small></h3>
  ${sesion.length?`<div class=row><button onclick="fxSesionCopia()">Copiar lista</button><button onclick="fxSesionImprime()">Imprimir ficha</button></div>`+sesion.map(p=>`<div class=fxpc><div class=fxt2>${esc(p.tema||'Sin tema')}</div><div class=fxmeta>${fd(p.date)}${p.hora?' · '+fh(p.hora):''}</div><div class=row>${(p.guion||'').trim()?`<button class=gold onclick="tpPiece('${p.id}')">▶ Teleprompter</button>`:'<span class=fxnote>Sin guion todavía</span>'}<button onclick="edit('${p.id}')">Abrir</button></div></div>`).join(''):'<p class=empty>No hay reels en etapa Guionizado dentro de este rango.</p>'}
  <div id=fxbulk>${fxBulkHTML()}</div>
  </div>`}

function fxProdCard(p){const F=FMT[p.format]||FMT.reel,nx=fxSiguiente(p),on=FX.prod.sel.includes(p.id);
  const f=pd(p.date);
  return `<div class=fxpc><label class=fxck><input type=checkbox ${on?'checked':''} onchange="fxSelPiece('${p.id}',this.checked)"> ${f.getDate()} ${MESES[f.getMonth()].slice(0,3)}${p.hora?' · '+fh(p.hora):''}</label>
  <div class=fxt2>${esc(p.tema||p.idea||'Sin tema')}</div>
  <div class=fxmeta><span class=fxtag style="--c:${F.c}">${F.n}</span> ${esc(p.estado||'')}${nx!=='Revisar estado'?' → '+esc(nx):''}</div>
  <div class=row>${nx==='Revisar estado'?'':`<button onclick="fxAdvance('${p.id}')">Avanzar a ${esc(nx)}</button>`}<button onclick="edit('${p.id}')">Abrir</button>${p.format==='reel'&&(p.guion||'').trim()?`<button onclick="tpPiece('${p.id}')">▶ Teleprompter</button>`:''}</div></div>`}
function fxAdvance(id){const p=S.P.find(x=>x.id===id);if(!p)return;const nx=fxSiguiente(p);if(nx==='Revisar estado')return;
  fxRun(cref('pieces').doc(id).update({estado:nx}),'Etapa actualizada: '+nx).catch(()=>{})}

function fxSesionTexto(){const L=fxProdPiezas().filter(p=>p.format==='reel'&&p.estado==='Guionizado');
  return 'Sesión de grabación · '+S.b.name+'\n\n'+L.map(p=>'• '+fd(p.date)+(p.hora?' · '+fh(p.hora):'')+' — '+(p.tema||'Sin tema')+(p.hook?'\n   Hook: '+p.hook:'')).join('\n')}
function fxSesionCopia(){fxCopy(fxSesionTexto(),'Lista de sesión copiada')}
function fxSesionImprime(){const L=fxProdPiezas().filter(p=>p.format==='reel'&&p.estado==='Guionizado');
  const w=window.open('','_blank');if(!w)return alert('Tu navegador bloqueó la ventana. Permite ventanas emergentes para imprimir.');
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Sesión de grabación</title><style>body{font-family:Arial,sans-serif;color:#111;padding:24px}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}</style></head><body><h1>Sesión de grabación · ${esc(S.b.name)}</h1><p>${L.length} reel(s) · generado ${fd(new Date())}</p><table><tr><th>Fecha</th><th>Hora</th><th>Tema</th><th>Hook</th></tr>${L.map(p=>`<tr><td>${esc(fd(p.date))}</td><td>${esc(p.hora?fh(p.hora):'')}</td><td>${esc(p.tema||'Sin tema')}</td><td>${esc(p.hook||'')}</td></tr>`).join('')}</table></body></html>`);
  w.document.close();setTimeout(()=>{w.focus();w.print()},300)}

// ---- Edición masiva ----
function fxSelPiece(id,on){const s=new Set(FX.prod.sel);on?s.add(id):s.delete(id);FX.prod.sel=[...s];
  const el=document.getElementById('fxbulk');if(el)el.outerHTML=`<div id=fxbulk>${fxBulkHTML()}</div>`}
function fxBulkHTML(){const n=FX.prod.sel.length;if(!n)return '';
  const ps=FX.prod.sel.map(id=>S.P.find(p=>p.id===id)).filter(Boolean);
  const fmts=[...new Set(ps.map(p=>p.format))];
  return `<div class=fxbulk><b>${n} seleccionada(s)</b>
  <div class=row><select id=bk_a onchange="fxBulkUI()"><option value="">Elige un cambio…</option><option value=fecha>Mover fecha (días)</option><option value=hora>Cambiar hora</option><option value=pilar>Cambiar pilar</option><option value=categoria>Cambiar categoría</option><option value=tipo>Cambiar tipo</option><option value=enfoque>Cambiar enfoque</option><option value=embudo>Cambiar etapa del embudo</option>${fmts.length===1?'<option value=estado>Cambiar estado</option>':''}</select><span id=bk_in></span></div>
  <p class=fxnote id=bk_prev>${fmts.length>1?'Las piezas son de formatos distintos: el estado no se puede cambiar en lote.':'Revisa la vista previa antes de aplicar.'}</p>
  <div class=row><button class=gold id=bk_go disabled onclick="fxBulkApply()">Aplicar</button><button class=danger onclick="fxBulkDel()">Eliminar selección</button><button onclick="FX.prod.sel=[];R()">Limpiar selección</button></div></div>`}
function fxBulkUI(){const a=$('#bk_a').value,h=$('#bk_in');
  const ops={tipo:TIPO,enfoque:ENF,embudo:EMB};
  if(a==='fecha')h.innerHTML='<input type=number id=bk_v placeholder="Días (+ o −)" oninput="fxBulkPrev()" style="width:130px">';
  else if(a==='hora')h.innerHTML='<input type=time id=bk_v oninput="fxBulkPrev()">';
  else if(a==='pilar'||a==='categoria')h.innerHTML=`<input id=bk_v placeholder="Nuevo valor" oninput="fxBulkPrev()">`;
  else if(ops[a])h.innerHTML=`<select id=bk_v onchange="fxBulkPrev()"><option value="">Elige…</option>${Object.entries(ops[a]).map(([k,x])=>`<option value=${k}>${x.n}</option>`).join('')}</select>`;
  else if(a==='estado'){const ps=FX.prod.sel.map(id=>S.P.find(p=>p.id===id)).filter(Boolean);const f=ps[0]?.format;
    h.innerHTML=`<select id=bk_v onchange="fxBulkPrev()"><option value="">Elige…</option>${(EST[f]||[]).map(e=>`<option>${e}</option>`).join('')}</select>`}
  else h.innerHTML='';
  fxBulkPrev()}
function fxBulkCambio(p,a,v){switch(a){
  case 'fecha':{const d=pd(p.date);d.setDate(d.getDate()+ +v);return {date:ds(d)}}
  case 'hora':return {hora:v};case 'pilar':return {pilar:v};case 'categoria':return {categoria:v};
  case 'tipo':return {tipo:v};case 'enfoque':return {enfoque:v};case 'embudo':return {embudo:v};case 'estado':return {estado:v};
  default:return null}}
function fxBulkPrev(){const a=$('#bk_a')?.value,el=$('#bk_v'),v=el?el.value.trim():'',go=$('#bk_go'),pv=$('#bk_prev');
  const ps=FX.prod.sel.map(id=>S.P.find(p=>p.id===id)).filter(Boolean);
  let ok=!!v&&!!a;let txt='';
  if(a==='fecha'){const n=+v;ok=Number.isInteger(n)&&n!==0;
    if(ok&&ps[0]){const d=pd(ps[0].date);d.setDate(d.getDate()+n);txt=`Se moverán ${ps.length} pieza(s) ${n>0?'+':''}${n} día(s). Ejemplo: ${fd(ps[0].date)} → ${fd(ds(d))}.`}}
  else if(a&&v)txt=`Se cambiará «${a}» en ${ps.length} pieza(s) a «${v}». No se borra nada más.`;
  if(pv&&txt)pv.textContent=txt;if(go)go.disabled=!ok||!ps.length}
async function fxBulkApply(){const a=$('#bk_a').value,v=$('#bk_v').value.trim();
  const ps=FX.prod.sel.map(id=>S.P.find(p=>p.id===id)).filter(Boolean);
  const plan=ps.map(p=>({id:p.id,u:fxBulkCambio(p,a,a==='fecha'?v:v)})).filter(x=>x.u);
  if(!plan.length)return;
  if(!confirm(`Se modificarán ${plan.length} pieza(s). ¿Continuar?`))return;
  let hechas=0;
  try{for(let i=0;i<plan.length;i+=FX_LOTE){const lote=db.batch();
      plan.slice(i,i+FX_LOTE).forEach(x=>lote.update(cref('pieces').doc(x.id),x.u));
      await fxRun(lote.commit(),'Cambios aplicados');hechas+=Math.min(FX_LOTE,plan.length-i)}
    FX.prod.sel=[];R()}
  catch(e){alert('Se aplicaron '+hechas+' de '+plan.length+' antes de un error: '+e.message);FX.prod.sel=[];R()}}
function fxBulkDel(){const ps=FX.prod.sel.map(id=>S.P.find(p=>p.id===id)).filter(Boolean),n=ps.length;if(!n)return;
  if(confirm(`¿Descargar un respaldo en Excel de estas ${n} piezas antes de eliminarlas?`))expX(ps,'-respaldo-seleccion');
  const t=prompt(`Vas a eliminar ${n} pieza(s). Esta acción no se puede deshacer.\nPara confirmar, escribe el número ${n}:`);
  if(t===null)return;if(t.trim()!==String(n))return alert('No se eliminó nada: el número no coincide.');
  (async()=>{let hechas=0;try{for(let i=0;i<ps.length;i+=FX_LOTE){const lote=db.batch();
      ps.slice(i,i+FX_LOTE).forEach(p=>lote.delete(cref('pieces').doc(p.id)));
      await fxRun(lote.commit(),'Piezas eliminadas');hechas+=Math.min(FX_LOTE,ps.length-i)}}
    catch(e){alert('Se eliminaron '+hechas+' de '+n+': '+e.message)}
    FX.prod.sel=[];R()})()}

// ---- Duplicar semana ----
function dupSemM(){if(!S.b)return;
  const src=wkP().sort((a,b)=>(a.date+(a.hora||'')).localeCompare(b.date+(b.hora||'')));
  if(!src.length)return alert('Esta semana no tiene contenido para duplicar.');
  const nx=lun(S.d);nx.setDate(nx.getDate()+7);
  FX.dup={src:src.map(p=>p.id),dest:ds(nx),guion:false,refs:false,pol:'omitir',set:{}};
  fxDupRender()}
function fxDupFecha(p){const D=FX.dup,a=lun(S.d),b=pd(D.dest);const diff=Math.round((b-pd(ds(a)))/864e5);
  const d=pd(p.date);d.setDate(d.getDate()+diff);return ds(d)}
function fxDupRows(){const D=FX.dup;return D.src.map(id=>S.P.find(p=>p.id===id)).filter(Boolean).map(p=>{
  const dd=fxDupFecha(p);const conf=S.P.some(q=>q.date===dd&&q.format===p.format&&(q.hora||'')===(p.hora||''));
  const pordefecto=!conf||D.pol==='crear';const incl=(p.id in D.set)?D.set[p.id]:pordefecto;
  return {p,dd,conf,incl}})}
function fxDupRender(){const D=FX.dup,rows=fxDupRows(),nc=rows.filter(r=>r.conf).length;
  $('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>Duplicar semana</h2>
  <p class=fxnote>Copiará las piezas de la semana actual a la semana destino. Las copias empiezan en «Idea»: no llevan estadísticas, enlaces publicados ni estado final.</p>
  <label>Lunes de la semana destino<input type=date id=dp_d value="${D.dest}" onchange="FX.dup.dest=this.value;FX.dup.set={};fxDupRender()"></label>
  <div class=row><label class=fxck><input type=checkbox ${D.guion?'checked':''} onchange="FX.dup.guion=this.checked"> Copiar guion o estructura</label><label class=fxck><input type=checkbox ${D.refs?'checked':''} onchange="FX.dup.refs=this.checked"> Copiar referencia</label></div>
  <label>Si ya existe una pieza con la misma fecha, formato y hora<select onchange="FX.dup.pol=this.value;FX.dup.set={};fxDupRender()"><option value=omitir ${D.pol==='omitir'?'selected':''}>Omitir la coincidencia</option><option value=crear ${D.pol==='crear'?'selected':''}>Crear otra pieza</option><option value=revisar ${D.pol==='revisar'?'selected':''}>Revisar manualmente (desmarcada)</option></select></label>
  <p class=fxnote>${nc} posible(s) coincidencia(s). Desmarca cualquier fila que no quieras copiar.</p>
  <div class=fxlist>${rows.map(r=>`<label class="fxck fxdrow${r.conf?' warn':''}"><input type=checkbox ${r.incl?'checked':''} onchange="FX.dup.set['${r.p.id}']=this.checked"> <span>${esc(fd(r.dd))}${r.p.hora?' · '+fh(r.p.hora):''} · ${esc((FMT[r.p.format]||FMT.reel).n)} — ${esc(r.p.tema||r.p.idea||'Sin tema')}${r.conf?' <b>(coincide)</b>':''}</span></label>`).join('')}</div>
  <div class=row><button class=gold onclick="fxDupApply()">Duplicar ${rows.filter(r=>r.incl).length} pieza(s)</button><button onclick="closeM()">Cancelar</button></div></div></div>`}
async function fxDupApply(){const D=FX.dup,rows=fxDupRows().filter(r=>r.incl);
  if(!rows.length)return alert('No hay piezas seleccionadas.');
  const hecho=[];
  try{for(let i=0;i<rows.length;i+=FX_LOTE){const lote=db.batch();
    rows.slice(i,i+FX_LOTE).forEach(({p,dd})=>{lote.set(cref('pieces').doc(),fxClean({
      date:dd,hora:p.hora||'',format:p.format,tipo:p.tipo||'',enfoque:p.enfoque||'',embudo:p.embudo||'',pilar:p.pilar||'',categoria:p.categoria||'',
      objetivo:p.objetivo||'',tema:p.tema||'',idea:p.idea||'',angulo:p.angulo||'',tipogancho:p.tipogancho||'',hook:p.hook||'',cta:p.cta||'',
      keyword:p.keyword||'',libre:p.libre||'',tags:p.tags||'',desc:'',guion:D.guion?(p.guion||''):'',ref:D.refs?(p.ref||''):'',
      estado:EST[p.format][0],links:{ig:'',tt:'',yt:''},m:{}}))});
    await fxRun(lote.commit(),'Semana duplicada');hecho.push(...rows.slice(i,i+FX_LOTE))}
    closeM();S.v='semana';S.d=pd(D.dest);R()}
  catch(e){alert('Se duplicaron '+hecho.length+' de '+rows.length+' piezas antes de un error: '+e.message);closeM();S.v='semana';S.d=pd(D.dest);R()}}
