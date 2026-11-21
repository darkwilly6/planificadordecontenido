// ===== Informes profesionales =====
// Vista previa HTML, impresión / PDF con el navegador, imagen PNG de resumen y texto copiable.
// Todo se genera en el navegador a partir de los datos reales. Sin datos = "No disponible".

function infRango(){const I=FX.inf;let a,b;
  if(I.rango==='semanal'){a=lun(S.d);b=new Date(a);b.setDate(b.getDate()+6)}
  else if(I.rango==='mensual'){a=new Date(S.d.getFullYear(),S.d.getMonth(),1);b=new Date(S.d.getFullYear(),S.d.getMonth()+1,0)}
  else{a=pd(I.desde||fxHoy());b=pd(I.hasta||fxHoy());if(a>b){const t=a;a=b;b=t}}
  return {a:ds(a),b:ds(b),A:a,B:b,mensual:I.rango==='mensual',mes:ds(a).slice(0,7)}}
const infRangoTxt=r=>`${fd(r.a)} – ${fd(r.b)}`;
const infRedes=()=>FX.inf.redes.length?FX.inf.redes:['ig'];
const infSinDato=n=>n==null?'No disponible':n;

// Piezas del período: programadas y publicadas (la tabla de publicaciones) y solo publicadas (métricas).
function infDatos(){const r=infRango();
  const todas=S.P.filter(p=>p.date>=r.a&&p.date<=r.b).sort((a,b)=>(a.date+(a.hora||'')).localeCompare(b.date+(b.hora||'')));
  const pub=todas.filter(p=>p.estado==='Publicado');
  return {r,todas,pub}}

function infBody(){const D=infDatos(),r=D.r,I=FX.inf,B=I.bloques,redes=infRedes(),unica=redes.length===1?redes[0]:null,mon=objMon();
  const h=(t)=>`<h2>${esc(t)}</h2>`;
  let out='';
  if(B.portada)out+=`<div class="inf-portada sec"><div class=inf-marca>${esc(S.b.name)}</div>${S.b.product?`<div>${esc(S.b.product)}</div>`:''}<div class=inf-per>Período: ${esc(infRangoTxt(r))}</div><div class=fxnote>Generado el ${esc(fd(new Date()))}</div></div>`;

  if(B.resumen){const red=redes.map(k=>QF_RED[k]).join(', ');
    const conMet=D.pub.filter(p=>redes.some(k=>qfM(p,k).tiene)).length;
    out+=`<div class=sec>${h('Resumen ejecutivo')}<ul>
      <li>${D.todas.length} pieza(s) en el período: ${D.pub.length} publicada(s) y ${D.todas.length-D.pub.length} programada(s) o pendiente(s).</li>
      <li>${conMet} publicación(es) con métricas registradas en ${esc(red)}.</li>
      ${D.todas.length===0?'<li>No hay publicaciones en este período. Este informe no inventa cifras.</li>':''}
      <li>Los resultados describen lo registrado en la app; no prueban causalidad.</li></ul></div>`}

  if(B.publicaciones){const F=Object.keys(FMT);
    out+=`<div class=sec>${h('Publicaciones por formato y tipo')}<table><tr><th>Formato</th><th>Nicho</th><th>Viral</th><th>Sin tipo</th><th>Total</th><th>Publicadas</th></tr>${F.map(f=>{const L=D.todas.filter(p=>p.format===f);return `<tr><td>${esc(FMT[f].n)}</td><td>${L.filter(p=>p.tipo==='nicho').length}</td><td>${L.filter(p=>p.tipo==='viral').length}</td><td>${L.filter(p=>!p.tipo).length}</td><td>${L.length}</td><td>${L.filter(p=>p.estado==='Publicado').length}</td></tr>`}).join('')}</table></div>`}

  if(B.plataformas){out+=`<div class=sec>${h('Estadísticas por plataforma')}<table><tr><th>Red</th><th>Piezas con datos</th><th>Alcance/vistas</th><th>Interacciones</th><th>Likes</th><th>Comentarios</th><th>Guardados</th><th>Compartidos</th><th>Tasa (por alcance)</th></tr>${redes.map(k=>{const s=qfStats(D.pub,k);return `<tr><td>${esc(QF_RED[k])}</td><td>${s.n} de ${s.total}</td><td>${infSinDato(s.n?numTxt(s.views):null)}</td><td>${infSinDato(s.n?numTxt(s.interacciones):null)}</td><td>${infSinDato(s.n?numTxt(s.likes):null)}</td><td>${infSinDato(s.n?numTxt(s.comments):null)}</td><td>${infSinDato(s.n?numTxt(s.saves):null)}</td><td>${infSinDato(s.n?numTxt(s.shares):null)}</td><td>${s.tasa!=null?pctTxt(s.tasa):'No disponible'}</td></tr>`}).join('')}</table>
    <p class=fxnote>Las tasas se calculan por alcance/vistas; no se mezclan redes ni denominadores. Campos vacíos = «No disponible», no 0.</p></div>`}

  if(B.top){const sumV=p=>redes.reduce((s,k)=>s+qfM(p,k).views,0);
    const top=D.pub.filter(p=>redes.some(k=>qfM(p,k).tiene)).sort((a,b)=>sumV(b)-sumV(a)).slice(0,10);
    out+=`<div class=sec>${h('Top 10 de publicaciones')}${top.length?`<table><tr><th>#</th><th>Publicación</th><th>Fecha</th><th>Alcance/vistas</th><th>Enlace</th></tr>${top.map((p,k)=>{const enl=redes.map(r=>p.links&&p.links[r]&&fxDir(p.links[r])?`<a href="${esc(p.links[r])}">${QF_RED[r]}</a>`:null).filter(Boolean).join(' · ')||'Sin enlace registrado';return `<tr><td>${k+1}</td><td>${esc(p.tema||p.idea||'Sin tema')}</td><td>${esc(fd(p.date))}</td><td>${numTxt(sumV(p))}</td><td>${enl}</td></tr>`}).join('')}</table>`:'<p class=fxnote>No hay publicaciones con métricas en este período.</p>'}</div>`}

  if(B.graficos){const pubs=D.todas;
    out+=`<div class=sec>${h('Distribución por pilar, enfoque, formato y embudo')}${['pilar','enfoque','formato','embudo'].map(dim=>{const d=QF_DIM[dim],g=qfGrupos(pubs,dim);
      const keys=d.o?d.o:Object.keys(g).sort((a,b)=>a.localeCompare(b,'es'));const max=Math.max(1,...keys.map(k=>(g[k]||[]).length));
      return `<h3>${esc(d.n)}</h3>${keys.length?keys.map(k=>{const n=(g[k]||[]).length;return `<div class=inf-bar><span>${esc(d.l(k))}</span><div><i style="width:${(n/max*100).toFixed(0)}%"></i></div><b>${n}</b></div>`}).join(''):'<p class=fxnote>Sin datos.</p>'}`}).join('')}</div>`}

  if(B.hallazgos){
    let cuerpo;
    if(!unica)cuerpo='<p class=fxnote>Los hallazgos comparan tasas dentro de una sola red. Elige una red en el asistente para incluirlos.</p>';
    else{const hs=qfHallazgos(D.pub,unica);
      cuerpo=hs.map(x=>`<div class=inf-h><b>${esc(x.titulo)}</b><p>${esc(x.texto)}</p>${x.ev?`<p class=fxnote>${esc(x.ev)}</p>`:''}${x.conf?`<p class=fxnote>Confianza orientativa: ${esc(x.conf)}</p>`:''}</div>`).join('')||'<p class=fxnote>Sin hallazgos en este período.</p>'}
    out+=`<div class=sec>${h('Hallazgos de «Qué funciona»')}${cuerpo}</div>`}

  if(B.objetivos&&FX.perm&&FX.perm.cash){if(D.r.mensual){const c=objCalc(D.r.mes),mt=((S.b.objetivos||{}).metas||[]).filter(m=>m.periodo===D.r.mes);
    out+=`<div class=sec>${h('Objetivos comerciales del mes')}<table><tr><th>Indicador</th><th>Valor</th></tr>
    <tr><td>Ingresos atribuidos</td><td>${objMoneyTxt(c.ingAtr,mon)}</td></tr><tr><td>Ingresos sin atribuir</td><td>${objMoneyTxt(c.ingSin,mon)}</td></tr>
    <tr><td>Costos registrados</td><td>${c.gastosMon?objMoneyTxt(c.costos,mon):'No disponible'}</td></tr><tr><td>ROI atribuible estimado</td><td>${c.roi!=null?pctTxt(c.roi):'No calculable'}</td></tr></table>
    ${mt.length?`<table><tr><th>Meta</th><th>Meta</th><th>Real</th></tr>${mt.map(m=>{const rv=objReal(m.tipo,c);return `<tr><td>${esc(OBJ_TIPOS[m.tipo])}</td><td>${m.tipo==='ingresos'?objMoneyTxt(m.valor,mon):numTxt(m.valor)}</td><td>${rv==null?'Sin datos':m.tipo==='ingresos'?objMoneyTxt(rv,mon):m.tipo==='conversion'?pctTxt(rv):numTxt(rv)}</td></tr>`}).join('')}</table>`:'<p class=fxnote>No hay metas para este mes.</p>'}
    <p class=fxnote>Los ingresos son los que tú registraste como atribuidos. No prueban que la publicación los causó.</p></div>`}
    else out+=`<div class=sec>${h('Objetivos comerciales')}<p class=fxnote>Los objetivos comerciales se incluyen en informes mensuales.</p></div>`}

  const recs=[];if(B.recomendaciones){
    if(unica){qfHallazgos(D.pub,unica).forEach(x=>{if(x.acc)recs.push(x.acc)})}
    const sinM=D.pub.filter(p=>!redes.some(k=>qfM(p,k).tiene)).length;
    if(sinM)recs.push(`Completa las métricas de ${sinM} publicación(es) publicada(s) sin datos.`);
    if(!D.todas.length)recs.push('Planifica contenido para este período antes de volver a generar el informe.');
    out+=`<div class=sec>${h('Recomendaciones y próximos pasos')}${recs.length?'<ul>'+recs.slice(0,8).map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':'<p class=fxnote>Sin recomendaciones: no hay datos suficientes.</p>'}</div>`}

  if(B.cobertura){const sinM=D.pub.filter(p=>!redes.some(k=>qfM(p,k).tiene)).length,yt=D.pub.filter(p=>p.m&&p.m.yt&&qfM(p,'yt').tiene).length;
    out+=`<div class=sec>${h('Origen y cobertura de los datos')}<ul>
    <li>Métricas registradas en la app: manuales, importadas desde Excel o CSV de Meta, o sincronizadas con YouTube. La app no guarda el origen de cada cifra.</li>
    <li>YouTube sincronizado en ${yt} publicación(es).</li>
    <li>Publicaciones publicadas sin métricas en las redes elegidas: ${sinM} de ${D.pub.length}.</li>
    <li>Ventanas analizadas: ${esc(infRangoTxt(D.r))}.</li></ul></div>`}

  if(I.obs.trim())out+=`<div class=sec>${h('Observaciones y conclusiones')}<p style="white-space:pre-wrap">${esc(I.obs)}</p></div>`;
  return out}

function infV(){const I=FX.inf;
  return `<div class=fxwrap>
  <p class=fxnote>Genera un informe con los datos reales de «${esc(S.b.name)}». Imprímelo o guárdalo como PDF desde tu navegador.</p>
  <details class=fxsec open><summary>Asistente</summary>
    <div class=r2><label>Rango<select onchange="FX.inf.rango=this.value;R()"><option value=semanal ${I.rango==='semanal'?'selected':''}>Semanal (semana de la vista actual)</option><option value=mensual ${I.rango==='mensual'?'selected':''}>Mensual (mes de la vista actual)</option><option value=personal ${I.rango==='personal'?'selected':''}>Personalizado</option></select></label>
    <div>${I.rango==='personal'?`<label>Desde<input type=date value="${I.desde}" onchange="FX.inf.desde=this.value;R()"></label><label>Hasta<input type=date value="${I.hasta||fxHoy()}" onchange="FX.inf.hasta=this.value;R()"></label>`:''}</div></div>
    <p class=fxnote>Redes incluidas (con desglose por plataforma)</p>
    <div class=row>${['ig','tt','yt'].map(k=>`<label class=fxck><input type=checkbox ${I.redes.includes(k)?'checked':''} onchange="infRed('${k}',this.checked)"> ${QF_RED[k]}</label>`).join('')}</div>
    <p class=fxnote>Bloques del informe</p>
    <div class=fxcheckgrid>${[['portada','Portada de marca y período'],['resumen','Resumen ejecutivo'],['publicaciones','Publicaciones por formato y tipo'],['plataformas','Estadísticas por plataforma'],['top','Top 10 con enlaces'],['graficos','Gráficos por pilar, enfoque, formato y embudo'],['hallazgos','Hallazgos de «Qué funciona»'],['objetivos','Objetivos comerciales (mensual)'],['recomendaciones','Recomendaciones y próximos pasos'],['cobertura','Origen y cobertura de datos']].map(([k,n])=>`<label class=fxck><input type=checkbox ${I.bloques[k]?'checked':''} onchange="FX.inf.bloques.${k}=this.checked?1:0"> ${n}</label>`).join('')}</div>
    <label>Observaciones y conclusiones (tuyas)<textarea id=inf_obs oninput="FX.inf.obs=this.value" style="min-height:90px">${esc(I.obs)}</textarea></label>
    <div class=row><button onclick="R()">Actualizar vista previa</button><button class=gold onclick="infPrint()">Imprimir / Guardar como PDF</button><button onclick="infImg()">Exportar imagen (PNG)</button><button onclick="infTxt()">Copiar resumen</button></div>
    <p class=fxnote>La imagen PNG es un resumen de una página. El PDF se genera con «Guardar como PDF» de tu navegador.</p>
  </details>
  <h3 class=fxh>Vista previa</h3>
  <div class=inf-prev>${infBody()}</div>
  </div>`}
function infRed(k,on){const s=new Set(FX.inf.redes);on?s.add(k):s.delete(k);FX.inf.redes=['ig','tt','yt'].filter(x=>s.has(x));R()}

function infDoc(){return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe · ${esc(S.b.name)}</title><style>
  body{font-family:Montserrat,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;line-height:1.45}
  h2{font-size:16px;color:#8a6d12;border-bottom:2px solid #c9a227;padding-bottom:4px;margin:0 0 10px}
  h3{font-size:13px;margin:12px 0 4px}
  .inf-portada{padding:24px 0 12px;border-bottom:3px solid #c9a227;margin-bottom:12px}
  .inf-marca{font-size:26px;font-weight:700;color:#111}.inf-per{margin-top:6px;font-weight:600}
  .sec{margin-bottom:18px;page-break-inside:avoid}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}th,td{border-bottom:1px solid #ddd;padding:5px;text-align:left;vertical-align:top}th{background:#f6f1df}
  tr{page-break-inside:avoid}a{color:#8a6d12}
  .inf-bar{display:grid;grid-template-columns:150px 1fr 40px;gap:8px;align-items:center;font-size:12px;margin:3px 0}
  .inf-bar div{background:#eee;height:9px;border-radius:9px;overflow:hidden}.inf-bar i{display:block;height:100%;background:#c9a227}
  .inf-h{border:1px solid #e5dcb8;border-radius:8px;padding:8px 10px;margin:6px 0;page-break-inside:avoid}
  .fxnote{color:#555;font-size:11px}
  @page{size:A4;margin:14mm}
  @media print{body{padding:0}}
  </style></head><body>${infBody()}</body></html>`}
function infPrint(){const w=window.open('','_blank');if(!w)return alert('Tu navegador bloqueó la ventana. Permite ventanas emergentes para imprimir o guardar como PDF.');
  w.document.open();w.document.write(infDoc());w.document.close();setTimeout(()=>{w.focus();w.print()},400)}

function infTxt(){const D=infDatos(),redes=infRedes();
  const L=[`Informe · ${S.b.name}${S.b.product?' · '+S.b.product:''}`,`Período: ${infRangoTxt(D.r)}`,'',
    `Publicaciones en el período: ${D.todas.length} (publicadas: ${D.pub.length}).`];
  redes.forEach(k=>{const s=qfStats(D.pub,k);L.push(`${QF_RED[k]}: ${s.n} con datos · alcance/vistas ${s.n?numTxt(s.views):'no disponible'} · tasa ${s.tasa!=null?pctTxt(s.tasa):'no disponible'}`)});
  if(FX.inf.obs.trim())L.push('','Observaciones: '+FX.inf.obs.trim());
  fxCopy(L.join('\n'),'Resumen copiado')}

function infImg(){const D=infDatos(),redes=infRedes(),c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');
  x.fillStyle='#0a0a0a';x.fillRect(0,0,c.width,c.height);
  x.strokeStyle='#d4af37';x.lineWidth=4;x.strokeRect(30,30,1020,1290);
  const wrap=(t,px,y,max,lh,font,col)=>{x.font=font;x.fillStyle=col;let line='',yy=y;
    String(t).split(' ').forEach(w=>{const test=line?line+' '+w:w;if(x.measureText(test).width>max&&line){x.fillText(line,px,yy);line=w;yy+=lh}else line=test});
    if(line){x.fillText(line,px,yy);yy+=lh}return yy};
  let y=120;
  y=wrap('✦ '+S.b.name,80,y,920,64,'700 56px Arial','#d4af37');
  y=wrap('Período: '+infRangoTxt(D.r),80,y+10,920,48,'400 34px Arial','#f3efe4');
  y+=40;
  y=wrap(`${D.todas.length} publicaciones · ${D.pub.length} publicadas`,80,y,920,52,'600 40px Arial','#f3efe4');
  redes.forEach(k=>{const s=qfStats(D.pub,k);y=wrap(`${QF_RED[k]}: ${s.n} con datos · alcance ${s.n?numTxt(s.views):'no disponible'} · tasa ${s.tasa!=null?pctTxt(s.tasa):'no disponible'}`,80,y+16,920,46,'400 30px Arial','#9a9486')});
  const hs=redes.length===1?qfHallazgos(D.pub,redes[0]).slice(0,3):[];
  y+=50;y=wrap('Hallazgos',80,y,920,56,'700 36px Arial','#d4af37');
  if(!redes.length||redes.length>1)y=wrap('Elige una red para incluir hallazgos.',80,y+10,920,44,'400 30px Arial','#9a9486');
  else if(!hs.length)y=wrap('Sin hallazgos en este período.',80,y+10,920,44,'400 30px Arial','#9a9486');
  hs.forEach(h=>{y=wrap('• '+h.titulo,80,y+14,920,44,'400 30px Arial','#f3efe4')});
  wrap('Los datos describen lo registrado en la app. Sin datos = no disponible.',80,1240,920,40,'400 26px Arial','#9a9486');
  c.toBlob(b=>{if(!b)return fxStatus('No se pudo crear la imagen','err');const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='informe-'+(S.b.name||'marca').replace(/[^\w-]+/g,'_')+'.png';document.body.appendChild(a);a.click();a.remove();fxStatus('Imagen descargada')},'image/png')}
