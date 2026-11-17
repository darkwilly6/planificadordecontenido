// ===== Qué funciona + Objetivos y retorno comercial =====
// Todo se calcula en el navegador desde los datos de la marca. Nada se inventa:
// los campos vacíos se muestran como «Sin datos», nunca como 0.

// Umbrales configurables (documentados en la especificación).
const QF_MIN=5;       // mínimo de piezas comparables por segmento
const QF_OPP=1.2;     // margen práctico: +20 % para hablar de oportunidad
const QF_FUERTE=10;   // a partir de aquí, "Patrón con más evidencia"
const QF_RED={ig:'Instagram',tt:'TikTok',yt:'YouTube Shorts'};
const QF_MET={views:'Alcance/vistas',interacciones:'Interacciones',likes:'Likes',comments:'Comentarios',saves:'Guardados',shares:'Compartidos'};

const pctTxt=x=>x.toFixed(1).replace('.',',')+' %';
const numTxt=x=>Math.round(x).toLocaleString('es');
const difTxt=r=>(r>=1?'+':'−')+Math.abs(Math.round((r-1)*100))+' %';

function qfRango(){const f=FX.qf,hoy=new Date();let a,b=hoy;
  if(f.per==='mes'){a=new Date(hoy.getFullYear(),hoy.getMonth(),1);b=new Date(hoy.getFullYear(),hoy.getMonth()+1,0)}
  else if(f.per==='personal'){a=pd(f.desde||fxHoy());b=pd(f.hasta||fxHoy());if(a>b){const t=a;a=b;b=t}}
  else{const n=+f.per||30;a=new Date(hoy);a.setDate(a.getDate()-(n-1))}
  return {a:ds(a),b:ds(b)}}
function qfBase(){const f=FX.qf,r=qfRango();
  return S.P.filter(p=>p.estado==='Publicado'&&p.date>=r.a&&p.date<=r.b&&(!f.fmt||p.format===f.fmt)&&(!f.tipo||p.tipo===f.tipo)&&(!f.enf||p.enfoque===f.enf)&&(!f.emb||p.embudo===f.emb)&&(!f.pilar||p.pilar===f.pilar)&&(!f.cat||p.categoria===f.cat))}

// Métricas de una pieza en una red. "tiene" = hay algún valor mayor que 0.
// Limitación conocida: un 0 real y un campo vacío se guardan igual; se tratan como "sin datos".
function qfM(p,r){const m=(p.m&&p.m[r])||{};const v={views:+m.views||0,likes:+m.likes||0,comments:+m.comments||0,saves:+m.saves||0,shares:+m.shares||0};
  v.interacciones=v.likes+v.comments+v.saves+v.shares;v.tiene=v.views>0||v.interacciones>0;return v}

// Totales y tasa ponderada: tasa = interacciones / alcance, solo con alcance > 0 (no se mezclan denominadores).
function qfStats(list,r){const D=list.map(p=>({p,m:qfM(p,r)})).filter(x=>x.m.tiene);
  const con=D.filter(x=>x.m.views>0);const sum=k=>D.reduce((s,x)=>s+x.m[k],0);
  const inter=con.reduce((s,x)=>s+x.m.interacciones,0),vis=con.reduce((s,x)=>s+x.m.views,0);
  return {total:list.length,n:D.length,sin:list.length-D.length,views:sum('views'),interacciones:sum('interacciones'),likes:sum('likes'),comments:sum('comments'),saves:sum('saves'),shares:sum('shares'),nRate:con.length,tasa:con.length&&vis>0?inter/vis*100:null}}

const QF_DIM={
  formato:{n:'Formato',v:p=>p.format||'',l:v=>(FMT[v]||{}).n||'Sin formato',o:Object.keys(FMT),acc:(k)=>`Crea 2 ${(FMT[k]||{n:'publicaciones'}).n}s sobre temas que ya funcionaron y compara sus resultados en 30 días.`},
  tipo:{n:'Tipo',v:p=>p.tipo||'',l:v=>(TIPO[v]||{}).n||'Sin tipo',o:Object.keys(TIPO),acc:(k)=>`Planifica 2 contenidos de tipo ${(TIPO[k]||{n:''}).n} y compara sus resultados después de 30 días.`},
  enfoque:{n:'Enfoque',v:p=>p.enfoque||'',l:v=>(ENF[v]||{}).n||'Sin enfoque',o:Object.keys(ENF),acc:(k)=>`Planifica 2 contenidos con enfoque ${(ENF[k]||{n:''}).n} y compara sus resultados después de 30 días.`},
  embudo:{n:'Etapa del embudo',v:p=>p.embudo||'',l:v=>(EMB[v]||{}).n||'Sin etapa',o:Object.keys(EMB),acc:(k)=>`Planifica 2 contenidos ${(EMB[k]||{n:''}).n} y compara sus resultados después de 30 días.`},
  pilar:{n:'Pilar',v:p=>p.pilar||'',l:v=>v||'Sin pilar',o:null,acc:(k)=>`Planifica 2 contenidos del pilar «${k}» y compara sus resultados.`},
  categoria:{n:'Categoría estratégica',v:p=>p.categoria||'',l:v=>v||'Sin categoría',o:null,acc:(k)=>`Planifica 2 contenidos de la categoría «${k}» y compara sus resultados.`},
  dia:{n:'Día de publicación',v:p=>String((pd(p.date).getDay()+6)%7),l:v=>({0:'Lunes',1:'Martes',2:'Miércoles',3:'Jueves',4:'Viernes',5:'Sábado',6:'Domingo'})[v]||'',o:['0','1','2','3','4','5','6'],acc:()=>'Prueba 2 publicaciones en este día y compara. Un día no explica el resultado por sí solo.'},
  franja:{n:'Franja horaria',v:p=>p.hora?(+p.hora.slice(0,2)<12?'m':+p.hora.slice(0,2)<18?'t':'n'):'',l:v=>({m:'Mañana (antes de 12:00)',t:'Tarde (12:00–17:59)',n:'Noche (18:00 en adelante)'})[v]||'Sin hora',o:['m','t','n'],acc:()=>'Programa 2 piezas en esta franja y compara. El horario se relaciona con el resultado, pero no lo causa por sí solo.'}
};
function qfGrupos(list,dim){const d=QF_DIM[dim],g={};list.forEach(p=>{const k=d.v(p);(g[k]=g[k]||[]).push(p)});return g}

function qfGrafico(dim,list,r){const d=QF_DIM[dim],g=qfGrupos(list,dim);
  const keys=d.o?d.o:Object.keys(g).sort((a,b)=>a.localeCompare(b,'es'));
  const rows=keys.map(k=>({k,label:d.l(k),s:qfStats(g[k]||[],r)}));
  const max=Math.max(1,...rows.map(x=>x.s.tasa||0));
  return `<div class=fxchart><h4>${d.n}</h4>${rows.map(x=>`<div class=fxbarrow><span class=fxbl>${esc(x.label)}</span><div class=fxbt><i style="width:${x.s.tasa!=null?(x.s.tasa/max*100).toFixed(1):0}%"></i></div><span class=fxbv>${x.s.tasa!=null?pctTxt(x.s.tasa):'Sin datos'} · ${x.s.total} pieza(s)${x.s.total-x.s.n?' · '+(x.s.total-x.s.n)+' sin métricas':''}</span></div>`).join('')||'<p class=empty>Sin datos.</p>'}</div>`}

function qfHooks(list,r){const met=FX.qf.met;
  const val=x=>met==='views'?x.m.views:met==='interacciones'?x.m.interacciones:x.m[met]||0;
  return list.filter(p=>(p.hook||'').trim()).map(p=>({p,m:qfM(p,r)})).filter(x=>x.m.tiene).sort((a,b)=>val(b)-val(a)).slice(0,10)}

// Motor de hallazgos: reglas deterministas. Cada hallazgo muestra evidencia, muestra y prudencia.
function qfHallazgos(list,r){
  if(r==='todas')return [{t:'info',titulo:'Elige una red para comparar',texto:'Las tasas de interacción solo se comparan dentro de una misma red. Con «Todas las redes» verás totales descriptivos.',ids:[],acc:null}];
  const rg=qfRango(),per=`${fd(rg.a)} – ${fd(rg.b)}`;
  const con=list.filter(p=>qfM(p,r).views>0);
  if(con.length<QF_MIN)return [{t:'info',titulo:'Muestra insuficiente',texto:`Hay ${con.length} publicación(es) con alcance registrado en ${QF_RED[r]} durante ${per}. Se necesitan al menos ${QF_MIN} para comparar. Reúne más información antes de concluir algo.`,ids:[],acc:null}];
  const out=[];
  ['formato','embudo','enfoque','tipo','franja','dia','pilar','categoria'].forEach(dim=>{const d=QF_DIM[dim],g=qfGrupos(con,dim);
    Object.keys(g).filter(k=>k!=='').forEach(k=>{const A=qfStats(g[k],r);if(A.nRate<QF_MIN||A.tasa==null)return;
      const B=qfStats(con.filter(p=>d.v(p)!==k),r);if(B.nRate<QF_MIN||!B.tasa)return;
      const ratio=A.tasa/B.tasa,lbl=d.l(k),ids=g[k].map(p=>p.id);
      const conf=(A.nRate>=QF_FUERTE&&B.nRate>=QF_FUERTE)?'Patrón con más evidencia':'Señal inicial';
      const ev=`Tasa por alcance: ${pctTxt(A.tasa)} en ${A.nRate} piezas frente a ${pctTxt(B.tasa)} en ${B.nRate} del resto · ${QF_RED[r]} · ${per}.`;
      if(ratio>=QF_OPP)out.push({t:'op',titulo:`«${lbl}» parece rendir mejor (${difTxt(ratio)})`,texto:`En los datos disponibles, ${d.n.toLowerCase()} «${lbl}» tiene más interacción por alcance que el resto de tu contenido.`,ev,conf,ids,acc:d.acc(k),dim,k});
      else if(ratio<=1/QF_OPP)out.push({t:'baja',titulo:`«${lbl}» parece rendir menos (${difTxt(ratio)})`,texto:`En los datos disponibles, ${d.n.toLowerCase()} «${lbl}» tiene menos interacción por alcance. Puede ser casualidad: antes de descartarlo, prueba otro hook o enfoque.`,ev,conf,ids,acc:'Antes de descartarlo, prueba 2 piezas con un hook o enfoque distinto y compara.',dim,k})})});
  ['formato','embudo','enfoque','tipo'].forEach(dim=>{const d=QF_DIM[dim];
    (d.o||[]).forEach(k=>{const n=list.filter(p=>d.v(p)===k).length;
      if(n===0)out.push({t:'cob',titulo:`No has publicado contenido «${d.l(k)}» en este período`,texto:'Sin esa etapa o formato no puedes comparar su rendimiento. Equilibrar la planificación te da datos nuevos.',ev:`${n} piezas publicadas de ${d.l(k)} · ${per}.`,conf:'Muestra insuficiente',ids:[],acc:d.acc(k),dim,k})})});
  return out}

function qfActBtn(i){const h=FX.hall[i];return `<div class=row>${h.ids.length?`<button onclick="fxHallAct(${i},'ver')">Ver publicaciones (${h.ids.length})</button>`:''}${h.dim&&h.t!=='info'?`<button class=gold onclick="fxHallAct(${i},'crear')">Crear publicación basada en este hallazgo</button>`:''}<button onclick="fxHallAct(${i},'idea')">Guardar como idea</button><button onclick="fxHallAct(${i},'exp')">Exportar hallazgo</button></div>`}

function fxHallAct(i,a){const h=FX.hall[i];if(!h)return;
  if(a==='ver'){const L=h.ids.map(id=>S.P.find(p=>p.id===id)).filter(Boolean).sort((x,y)=>(x.date||'').localeCompare(y.date||''));
    $('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>Publicaciones del hallazgo</h2><p class=fxnote>${esc(h.titulo)}</p>
    <div class=fxlist>${L.map(p=>`<div class=fxpc><div class=fxt2>${esc(p.tema||p.idea||'Sin tema')}</div><div class=fxmeta>${fd(p.date)}${p.hora?' · '+fh(p.hora):''}</div><div class=row><button onclick="closeM();edit('${p.id}')">Abrir</button></div></div>`).join('')}</div>
    <div class=row><button onclick="closeM()">Cerrar</button></div></div></div>`;return}
  if(a==='crear'){const t=new Date();t.setDate(t.getDate()+1);const pre={};
    if(h.dim==='formato')pre.formato=h.k;if(h.dim==='enfoque')pre.enfoque=h.k;if(h.dim==='embudo')pre.embudo=h.k;if(h.dim==='tipo')pre.tipo=h.k;
    if(h.dim==='pilar')pre.pilar=h.k;if(h.dim==='categoria')pre.categoria=h.k;
    FX.pre=pre;edit(null,ds(t));return}
  if(a==='idea'){fxRun(cref('ideas').add({titulo:'Hallazgo: '+h.titulo,t:'Hallazgo: '+h.titulo,desc:h.texto+'\n'+h.ev+(h.acc?'\nPrueba: '+h.acc:''),estado:'Guardada',usada:false,creada:firebase.firestore.FieldValue.serverTimestamp()}),'Idea guardada desde el hallazgo').catch(()=>{});return}
  if(a==='exp'){const txt=`${h.titulo}\n${h.texto}\n${h.ev}\nConfianza: ${h.conf||'—'}\n${h.acc?'Prueba sugerida: '+h.acc:''}\n`;
    const bl=new Blob([txt],{type:'text/plain;charset=utf-8'}),u=URL.createObjectURL(bl),x=document.createElement('a');x.href=u;x.download='hallazgo.txt';document.body.appendChild(x);x.click();x.remove()}}

function qfV(){const f=FX.qf,L=qfBase(),r=f.red,rg=qfRango();
  const pubs=S.P.filter(p=>p.estado==='Publicado');
  const pilares=[...new Set(pubs.map(p=>p.pilar).filter(Boolean))].sort();
  const cats=[...new Set(pubs.map(p=>p.categoria).filter(Boolean))].sort();
  const sel=(k,lbl,opts,val)=>`<label>${lbl}<select onchange="FX.qf.${k}=this.value;R()"><option value="">Todos</option>${opts.map(([v,n])=>`<option value="${esc(v)}" ${val===v?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
  let tarjetas='',extra='';
  if(r!=='todas'){const s=qfStats(L,r);const media=s.n?s.interacciones/s.n:0;
    const dest=L.filter(p=>qfM(p,r).tiene&&qfM(p,r).interacciones>=2*media&&media>0).length;
    tarjetas=`<div class=fxcards>
      <div class=fxcard2><small>Publicaciones analizadas</small><b>${s.n}</b><span>de ${s.total} publicadas · ${s.sin} sin métricas</span></div>
      <div class=fxcard2><small>Alcance/vistas</small><b>${s.n?numTxt(s.views):'Sin datos'}</b><span>${QF_RED[r]}</span></div>
      <div class=fxcard2><small>Interacciones</small><b>${s.n?numTxt(s.interacciones):'Sin datos'}</b><span>likes + comentarios + guardados + compartidos</span></div>
      <div class=fxcard2><small>Tasa de interacción</small><b>${s.tasa!=null?pctTxt(s.tasa):'No disponible'}</b><span>por alcance/vistas · ${s.nRate} piezas con alcance</span></div>
      <div class=fxcard2><small>Contenidos destacados</small><b>${dest}</b><span>interacciones ≥ 2× el promedio</span></div></div>`;
    extra=`<h3 class=fxh>Gráficos por dimensión · ${QF_RED[r]}</h3>${['formato','embudo','enfoque','tipo','franja','dia','pilar','categoria'].map(d=>qfGrafico(d,L,r)).join('')}`;
  }else{
    tarjetas=`<div class=fxtable><table><tr><th>Red</th><th>Con datos</th><th>Alcance/vistas</th><th>Interacciones</th><th>Likes</th><th>Comentarios</th><th>Guardados</th><th>Compartidos</th></tr>${['ig','tt','yt'].map(k=>{const s=qfStats(L,k);return `<tr><td>${QF_RED[k]}</td><td>${s.n} de ${s.total}</td><td>${s.n?numTxt(s.views):'Sin datos'}</td><td>${s.n?numTxt(s.interacciones):'Sin datos'}</td><td>${s.n?numTxt(s.likes):'Sin datos'}</td><td>${s.n?numTxt(s.comments):'Sin datos'}</td><td>${s.n?numTxt(s.saves):'Sin datos'}</td><td>${s.n?numTxt(s.shares):'Sin datos'}</td></tr>`}).join('')}</table></div><p class=fxnote>Las tasas de interacción no se mezclan entre redes. Elige una red arriba para ver tasas, gráficos y hallazgos.</p>`;
  }
  const hall=qfHallazgos(L,r);FX.hall=hall;
  const hooks=r==='todas'?'<p class=fxnote>Elige una red para ver los hooks.</p>':(()=>{const H=qfHooks(L,r);return H.length?H.map((x,k)=>`<div class=lr><b>#${k+1}</b><div class=fxt2>${esc(x.p.hook)}</div><div class=val>${numTxt(qfMetric(x.m))}</div></div>`).join(''):'<p class=empty>Aún no hay hooks con métricas en este período.</p>'})();
  return `<div class=fxwrap>
  <p class=fxnote>Analiza tus publicaciones publicadas del período. Los hallazgos muestran evidencia y limitaciones: <b>no prometen causa</b>.</p>
  <div class=fxtools>
    <label>Período<select onchange="FX.qf.per=this.value;R()"><option value=7 ${f.per==='7'?'selected':''}>Últimos 7 días</option><option value=30 ${f.per==='30'?'selected':''}>Últimos 30 días</option><option value=60 ${f.per==='60'?'selected':''}>Últimos 60 días</option><option value=90 ${f.per==='90'?'selected':''}>Últimos 90 días</option><option value=mes ${f.per==='mes'?'selected':''}>Mes actual</option><option value=personal ${f.per==='personal'?'selected':''}>Personalizado</option></select></label>
    ${f.per==='personal'?`<label>Desde<input type=date value="${f.desde}" onchange="FX.qf.desde=this.value;R()"></label><label>Hasta<input type=date value="${f.hasta||fxHoy()}" onchange="FX.qf.hasta=this.value;R()"></label>`:''}
    <label>Red<select onchange="FX.qf.red=this.value;R()"><option value=todas ${r==='todas'?'selected':''}>Todas (totales)</option><option value=ig ${r==='ig'?'selected':''}>Instagram</option><option value=tt ${r==='tt'?'selected':''}>TikTok</option><option value=yt ${r==='yt'?'selected':''}>YouTube Shorts</option></select></label>
    ${sel('fmt','Formato',Object.entries(FMT).map(([k,v])=>[k,v.n]),f.fmt)}
    ${sel('tipo','Tipo',Object.entries(TIPO).map(([k,v])=>[k,v.n]),f.tipo)}
    ${sel('enf','Enfoque',Object.entries(ENF).map(([k,v])=>[k,v.n]),f.enf)}
    ${sel('emb','Etapa',Object.entries(EMB).map(([k,v])=>[k,v.n]),f.emb)}
    ${sel('pilar','Pilar',pilares.map(x=>[x,x]),f.pilar)}
    ${sel('cat','Categoría',cats.map(x=>[x,x]),f.cat)}
    <label>Ordenar hooks por<select onchange="FX.qf.met=this.value;R()">${Object.entries(QF_MET).map(([k,v])=>`<option value=${k} ${f.met===k?'selected':''}>${v}</option>`).join('')}</select></label>
  </div>
  <p class=fxnote>Período: ${fd(rg.a)} – ${fd(rg.b)} · ${L.length} publicación(es) publicadas con esos filtros.</p>
  ${tarjetas}
  <h3 class=fxh>Hallazgos y oportunidades</h3>
  <p class=fxnote>Umbrales: mínimo ${QF_MIN} piezas por segmento; oportunidad con +20 % o más frente al resto. Muestra y evidencia en cada tarjeta.</p>
  ${hall.map((h,i)=>`<div class="fxhall ${h.t}"><div class=r1><b>${esc(h.titulo)}</b>${h.conf?`<span class=fxtag>${esc(h.conf)}</span>`:''}</div><p>${esc(h.texto)}</p>${h.ev?`<p class=fxnote>${esc(h.ev)}</p>`:''}${h.acc?`<p><b>Prueba sugerida:</b> ${esc(h.acc)}</p>`:''}${qfActBtn(i)}</div>`).join('')||'<p class=empty>No hay hallazgos todavía.</p>'}
  ${extra}
  <h3 class=fxh>Hooks que mejor funcionan</h3>
  ${hooks}
  </div>`}
function qfMetric(m){return FX.qf.met==='views'?m.views:FX.qf.met==='interacciones'?m.interacciones:m[FX.qf.met]||0}

// ===== Objetivos y retorno comercial =====
const OBJ_PRINC={reconocimiento:'Reconocimiento',comunidad:'Comunidad',consultas:'Generación de consultas',leads:'Leads',ventas:'Ventas',reservas:'Reservas',otro:'Otro'};
const OBJ_TIPOS={publicaciones:'Publicaciones publicadas',consultas:'Consultas',leads:'Leads',ventas:'Ventas confirmadas',ingresos:'Ingresos atribuidos',conversion:'Tasa consulta → venta'};
const OBJ_MOV={consulta:'Consulta',lead:'Lead',venta:'Venta',reserva:'Reserva',otro:'Otro'};
const OBJ_ATR={declarado:'Declarado por el cliente',enlace:'Enlace o código identificable',conversacion:'Conversación vinculada',manual:'Decisión manual mía',no:'Origen no confirmado (sin atribuir)'};
const OBJ_GASTO={anuncio:'Anuncio',edicion:'Edición',diseno:'Diseño',produccion:'Producción',otro:'Otro'};
const objMon=()=>(S.b&&S.b.objetivos&&S.b.objetivos.moneda)||'USD';
const objMoneyTxt=(n,m)=>`${m} ${(+n||0).toLocaleString('es',{maximumFractionDigits:2})}`;
const objMes=()=>ds(S.d).slice(0,7);

function objCalc(mes){const mon=objMon();
  const enMes=x=>(x.fecha||'').slice(0,7)===mes,mismo=x=>(x.moneda||mon)===mon;
  const movs=FX.M.filter(enMes),gas=FX.G.filter(enMes);
  const otra=movs.filter(x=>!mismo(x)).length+gas.filter(x=>!mismo(x)).length;
  const vivos=movs.filter(x=>x.estado!=='anulado'&&mismo(x));
  const conf=vivos.filter(x=>x.estado==='confirmado');
  const cnt=(arr,t)=>arr.filter(x=>x.tipo===t).reduce((s,x)=>s+(+x.cantidad||1),0);
  const consultas=cnt(vivos,'consulta'),ventas=cnt(conf,'venta'),leads=cnt(vivos,'lead');
  const ingresos=conf.reduce((s,x)=>s+(+x.importe||0),0);
  const atrib=conf.filter(x=>x.contentId&&x.atribucion!=='no'&&(+x.importe||0)>0);
  const ingAtr=atrib.reduce((s,x)=>s+(+x.importe||0),0);
  const gastosMon=gas.filter(mismo);const costos=gastosMon.reduce((s,x)=>s+(+x.monto||0),0);
  const pubs=S.P.filter(p=>p.estado==='Publicado'&&(p.date||'').slice(0,7)===mes).length;
  const conv=consultas>0?ventas/consultas*100:null;
  const roi=gastosMon.length&&costos>0?(ingAtr-costos)/costos*100:null;
  return {mon,otra,movs,vivos,conf,consultas,ventas,leads,ingresos,ingAtr,ingSin:ingresos-ingAtr,costos,gastosMon:gastosMon.length,pubs,conv,roi,atrib,pend:vivos.filter(x=>x.estado==='pendiente').length}}

// Valor real de una meta. null = sin registros (nunca se cuenta como cumplida).
function objReal(t,c){
  if(t==='publicaciones')return c.pubs;
  if(t==='consultas')return c.movs.some(x=>x.tipo==='consulta')?c.consultas:null;
  if(t==='leads')return c.movs.some(x=>x.tipo==='lead')?c.leads:null;
  if(t==='ventas')return c.movs.some(x=>x.tipo==='venta')?c.ventas:null;
  if(t==='ingresos')return c.conf.some(x=>+x.importe>0)?c.ingAtr:null;
  if(t==='conversion')return c.conv;return null}

function objV(){const b=S.b||{},o=b.objetivos||{},mes=objMes(),c=objCalc(mes),mon=c.mon;
  const metas=(o.metas||[]).filter(m=>m.periodo===mes);
  const piezas=S.P.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,200);
  const otrasMon=c.otra?`<p class=fxnote>${c.otra} registro(s) están en otra moneda y no se suman. Cambiar la moneda no convierte cifras anteriores.</p>`:'';
  const ranking=(()=>{const R={};c.conf.forEach(x=>{if(!x.contentId||x.atribucion==='no')return;const r=R[x.contentId]=R[x.contentId]||{ing:0,n:0};r.ing+=+x.importe||0;r.n+=(+x.cantidad||1)});
    return Object.entries(R).map(([id,v])=>({p:S.P.find(p=>p.id===id),...v})).filter(x=>x.p).sort((a,b)=>b.ing-a.ing||b.n-a.n).slice(0,10)})();
  const lista=(arr,fn)=>arr.length?arr.slice(0,15).map(fn).join(''):'<p class=empty>Sin registros este mes.</p>';
  return `<div class=fxwrap>
  <p class=fxnote>Esta sección es opcional. Mide consultas, ventas e ingresos <b>declarados por ti</b>. Un ingreso «atribuido» significa que tú lo asociaste a una publicación, no que la publicación lo causó.</p>

  <details class=fxsec><summary>1. Perfil de objetivos</summary>
    <div class=r2><label>Objetivo principal<select id=om_pr>${Object.entries(OBJ_PRINC).map(([k,v])=>`<option value=${k} ${o.principal===k?'selected':''}>${v}</option>`).join('')}</select></label>
    <label>Moneda de la marca (ISO 4217, ej. USD)<input id=om_mo value="${esc(mon)}" maxlength=3></label></div>
    <p class=fxnote>Cambiar la moneda no convierte cifras históricas: cada registro conserva la suya.</p>
    <label>Frecuencia prevista (publicaciones por semana, opcional)<input id=om_fr type=number min=0 value="${esc(o.frecuencia||'')}"></label>
    <div class=row><button class=gold onclick="objSavePerfil()">Guardar perfil</button></div>
  </details>

  <details class=fxsec open><summary>2. Metas del mes (${mes})</summary>
    ${metas.length?metas.map(m=>{const r=objReal(m.tipo,c),pc=r!=null&&m.valor>0?r/m.valor*100:null;
      return `<div class=fxpc><div class=r1><b>${OBJ_TIPOS[m.tipo]}</b><span class=fxtag>${pc==null?'Sin datos':pc>=100?'Cumplida':'En curso'}</span></div>
      <div class=fxmeta>Meta: ${m.tipo==='ingresos'?objMoneyTxt(m.valor,mon):m.tipo==='conversion'?m.valor+' %':numTxt(m.valor)} · Real: ${r==null?'Sin datos':m.tipo==='ingresos'?objMoneyTxt(r,mon):m.tipo==='conversion'?pctTxt(r):numTxt(r)}${pc!=null?' · '+Math.round(pc)+' % de la meta':''}</div>
      <div class=row><button class=danger onclick="objDelMeta('${m.id}')">Quitar meta</button></div></div>`}).join(''):'<p class=empty>No hay metas para este mes.</p>'}
    <div class=fxurl><select id=mt_t>${Object.entries(OBJ_TIPOS).map(([k,v])=>`<option value=${k}>${v}</option>`).join('')}</select><input id=mt_v type=number min=0 step=any placeholder="Valor de la meta"><button onclick="objAddMeta()">+ Añadir meta</button></div>
    <p class=fxnote>Sin registros, una meta aparece como «Sin datos», no como incumplida ni cumplida.</p>
  </details>

  <h3 class=fxh>3. Indicadores del mes</h3>
  ${otrasMon}
  <div class=fxcards>
    <div class=fxcard2><small>Publicaciones publicadas</small><b>${c.pubs}</b></div>
    <div class=fxcard2><small>Consultas registradas</small><b>${c.movs.some(x=>x.tipo==='consulta')?numTxt(c.consultas):'Sin datos'}</b><span>${c.pend} pendiente(s) de confirmar</span></div>
    <div class=fxcard2><small>Ventas confirmadas</small><b>${c.movs.some(x=>x.tipo==='venta')?numTxt(c.ventas):'Sin datos'}</b></div>
    <div class=fxcard2><small>Tasa consulta → venta</small><b>${c.conv!=null?pctTxt(c.conv):'No disponible'}</b><span>relación descriptiva del mes, no causal</span></div>
    <div class=fxcard2><small>Ingresos atribuidos</small><b>${objMoneyTxt(c.ingAtr,mon)}</b><span>confirmados, con publicación y atribución explícita</span></div>
    <div class=fxcard2><small>Ingresos sin atribuir</small><b>${objMoneyTxt(c.ingSin,mon)}</b><span>no vinculados a ninguna publicación</span></div>
    <div class=fxcard2><small>Costos registrados</small><b>${c.gastosMon?objMoneyTxt(c.costos,mon):'Sin datos'}</b><span>${c.gastosMon} gasto(s) del mes</span></div>
    <div class=fxcard2><small>ROI atribuible estimado</small><b>${c.roi!=null?pctTxt(c.roi):'No calculable'}</b><span>(ingresos atribuidos − costos) ÷ costos. Requiere costos mayores que 0.</span></div>
  </div>

  <h3 class=fxh>4. Publicaciones con más resultado atribuido</h3>
  ${ranking.length?ranking.map((x,k)=>`<div class=lr><b>#${k+1}</b><div class=fxt2>${esc(x.p.tema||'Sin tema')}</div><div class=val>${objMoneyTxt(x.ing,mon)} · ${numTxt(x.n)} consulta/venta</div><button onclick="edit('${x.p.id}')">Abrir</button></div>`).join(''):'<p class=empty>Aún no hay ingresos o consultas atribuidos a publicaciones.</p>'}

  <details class=fxsec open><summary>5. Registrar consulta, lead, venta o reserva</summary>
    <p class=fxnote>No pidas nombres completos ni datos privados de clientes. Usa notas breves.</p>
    <div class=r2><label>Fecha<input type=date id=mv_f value="${fxHoy()}"></label><label>Tipo<select id=mv_t>${Object.entries(OBJ_MOV).map(([k,v])=>`<option value=${k}>${v}</option>`).join('')}</select></label></div>
    <div class=r2><label>Cantidad (opcional)<input type=number min=1 id=mv_c placeholder="1"></label><label>Importe (opcional)<input type=number min=0 step=any id=mv_i></label></div>
    <div class=r2><label>Moneda<input id=mv_m maxlength=3 value="${esc(mon)}"></label><label>Estado<select id=mv_e><option value=confirmado>Confirmado</option><option value=pendiente>Pendiente</option><option value=anulado>Anulado</option></select></label></div>
    <label>Publicación de origen (opcional)<select id=mv_p><option value="">Sin atribuir</option>${piezas.map(p=>`<option value="${p.id}">${fd(p.date)} · ${esc((p.tema||'Sin tema').slice(0,50))}</option>`).join('')}</select></label>
    <label>Método de atribución<select id=mv_a>${Object.entries(OBJ_ATR).map(([k,v])=>`<option value=${k}>${v}</option>`).join('')}</select></label>
    <label>Nota breve (sin datos personales)<input id=mv_n maxlength=120></label>
    <div class=row><button class=gold onclick="objAddMov()">Guardar registro</button></div>
    <h4>Registros del mes</h4>
    ${lista(c.movs.slice().sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'')),x=>`<div class=fxpc><div class=fxt2>${fd(x.fecha)} · ${OBJ_MOV[x.tipo]||x.tipo} · ${esc(x.estado||'')}</div><div class=fxmeta>${x.importe?objMoneyTxt(x.importe,x.moneda||mon):'Sin importe'} · ${OBJ_ATR[x.atribucion]||'Sin atribuir'}${x.nota?' · '+esc(x.nota):''}</div><div class=row><button class=danger onclick="objDel('movimientos','${x.id}')">Eliminar</button></div></div>`)}
  </details>

  <details class=fxsec><summary>6. Gastos (opcional)</summary>
    <p class=fxnote>Un gasto de 0 significa «costo cero». Si no registras nada, la marca aparece como «Sin datos» y el ROI como «No calculable».</p>
    <div class=r2><label>Fecha<input type=date id=gs_f value="${fxHoy()}"></label><label>Tipo<select id=gs_t>${Object.entries(OBJ_GASTO).map(([k,v])=>`<option value=${k}>${v}</option>`).join('')}</select></label></div>
    <div class=r2><label>Monto (puede ser 0)<input type=number min=0 step=any id=gs_m></label><label>Moneda<input id=gs_mo maxlength=3 value="${esc(mon)}"></label></div>
    <label>Publicación asociada (opcional)<select id=gs_p><option value="">Costo general de la marca</option>${piezas.map(p=>`<option value="${p.id}">${fd(p.date)} · ${esc((p.tema||'Sin tema').slice(0,50))}</option>`).join('')}</select></label>
    <label>Descripción breve<input id=gs_d maxlength=120></label>
    <div class=row><button class=gold onclick="objAddGasto()">Guardar gasto</button></div>
    <h4>Gastos del mes</h4>
    ${lista(c.gastosMon?FX.G.filter(x=>(x.fecha||'').slice(0,7)===mes):[],x=>`<div class=fxpc><div class=fxt2>${fd(x.fecha)} · ${OBJ_GASTO[x.tipo]||x.tipo}</div><div class=fxmeta>${objMoneyTxt(x.monto,x.moneda||mon)}${x.descripcion?' · '+esc(x.descripcion):''}</div><div class=row><button class=danger onclick="objDel('gastos','${x.id}')">Eliminar</button></div></div>`)}
  </details>
  </div>`}

function objSavePerfil(){const mo=($('#om_mo').value||'').trim().toUpperCase();
  if(!/^[A-Z]{3}$/.test(mo))return alert('La moneda debe ser un código ISO de 3 letras, por ejemplo USD.');
  const o=S.b.objetivos||{};
  if(mo!==objMon()&&!confirm('Cambiar la moneda no convierte las cifras ya registradas. ¿Continuar?'))return;
  const nuevo={...o,principal:$('#om_pr').value,moneda:mo,frecuencia:+$('#om_fr').value||0,metas:o.metas||[]};
  fxRun(bref().doc(S.b.id).update({objetivos:nuevo}),'Perfil de objetivos guardado').catch(()=>{})}
function objAddMeta(){const t=$('#mt_t').value,v=+$('#mt_v').value;
  if(!(v>0))return alert('Escribe un valor de meta mayor que 0.');
  const o=S.b.objetivos||{};const metas=(o.metas||[]).concat([{id:fxId(),periodo:objMes(),tipo:t,valor:v}]);
  fxRun(bref().doc(S.b.id).update({objetivos:{...o,metas}}),'Meta guardada').catch(()=>{})}
function objDelMeta(id){if(!confirm('¿Quitar esta meta? Los registros no se eliminan.'))return;const o=S.b.objetivos||{};
  fxRun(bref().doc(S.b.id).update({objetivos:{...o,metas:(o.metas||[]).filter(m=>m.id!==id)}}),'Meta quitada').catch(()=>{})}
function objAddMov(){const g=i=>($('#'+i)?.value||'').trim();
  const fecha=g('mv_f'),tipo=g('mv_t'),imp=g('mv_i'),pid=g('mv_p'),atr=g('mv_a');
  if(!fecha)return alert('Elige una fecha.');if(imp&&+imp<0)return alert('El importe no puede ser negativo.');
  const d=fxClean({fecha,tipo,cantidad:+g('mv_c')||1,importe:imp?+imp:0,moneda:(g('mv_m')||objMon()).toUpperCase(),estado:g('mv_e'),
    contentId:pid,atribucion:pid?(atr==='no'?'manual':atr):'no',nota:g('mv_n'),origen:'manual',creada:firebase.firestore.FieldValue.serverTimestamp()});
  fxRun(cref('movimientos').add(d),'Registro guardado').then(()=>{$('#mv_c').value='';$('#mv_i').value='';$('#mv_n').value=''}).catch(()=>{})}
function objAddGasto(){const g=i=>($('#'+i)?.value||'').trim();
  const m=g('gs_m');if(m===''||+m<0)return alert('Escribe el monto del gasto (puede ser 0).');
  const pid=g('gs_p');
  const d=fxClean({fecha:g('gs_f'),tipo:g('gs_t'),monto:+m,moneda:(g('gs_mo')||objMon()).toUpperCase(),contentId:pid,descripcion:g('gs_d'),creada:firebase.firestore.FieldValue.serverTimestamp()});
  if(!d.fecha)return alert('Elige una fecha.');
  fxRun(cref('gastos').add(d),'Gasto guardado').then(()=>{$('#gs_m').value='';$('#gs_d').value=''}).catch(()=>{})}
function objDel(col,id){if(!confirm('¿Eliminar este registro? No se puede deshacer.'))return;
  fxRun(cref(col).doc(id).delete(),'Registro eliminado').catch(()=>{})}

// ---- Resumen con subpestañas: Vista general · Qué funciona · Objetivos · Informes ----
const _resumenV=resumenV;
resumenV=function(){const tabs=[['general','Vista general'],['funciona','Qué funciona'],['objetivos','Objetivos'],['informes','Informes']];
  const bar=`<div class=fxbar>${tabs.map(([k,n])=>`<button class="${FX.rs===k?'on':''}" onclick="FX.rs='${k}';R()">${n}</button>`).join('')}</div>`;
  const cuerpo=FX.rs==='funciona'?qfV():FX.rs==='objetivos'?objV():FX.rs==='informes'?infV():_resumenV();
  return bar+cuerpo};
