// ===== CRM de trazabilidad por pieza =====
// Lead → Agenda → Agenda calificada → Venta → Cash (pagos recibidos).
// Colecciones bajo la marca: crm_leads, crm_agendas, crm_ventas, crm_pagos.
// Permisos: leads/agendas requieren «ver leads»; ventas/pagos/movimientos/gastos requieren «ver dinero».
// Las reglas de Firestore hacen cumplir estos permisos; aquí solo se reflejan.

FX.L=[];FX.A=[];FX.V=[];FX.Pg=[];FX.crmKey=null;FX.crmSubs=[];
FX.perm=FX.perm||{leads:true,cash:true};
FX.crm={tab:'embudo',per:'mes',q:''};

const CRM_CANAL={dm:'Mensaje directo',formulario:'Formulario',comentario:'Comentario con palabra clave',whatsapp:'WhatsApp',llamada:'Llamada o contacto directo',referido:'Referido por cliente',otro:'Otro'};
const CRM_AG_TIPO={demo:'Demostración de producto',asesoria:'Asesoría comercial',reunion:'Reunión de ventas',consulta:'Consulta inicial',propuesta:'Presentación de propuesta',otro:'Otro'};
const CRM_AG_EST={programada:'Programada',confirmada:'Confirmada',realizada:'Realizada',cancelada:'Cancelada',no_asistio:'No asistió',reprogramada:'Reprogramada'};
const CRM_CAL={pendiente:'Pendiente de calificación',calificada:'Calificada',no_calificada:'No calificada'};
const CRM_CRIT={necesidad:'Necesidad',interes:'Interés',compatibilidad:'Compatibilidad',presupuesto:'Presupuesto',disponibilidad:'Disponibilidad',autoridad:'Autoridad de decisión'};
const CRM_PAGO={recibido:'Recibido',pendiente:'Pendiente',anulado:'Anulado'};
const crmTS=()=>firebase.firestore.FieldValue.serverTimestamp();
const crmMoney=n=>objMoneyTxt(n,objMon());

// ---- Suscripciones según permisos ----
function fxSubCRM(){
  if(!S.u||!S.b){FX.crmSubs.forEach(f=>f());FX.crmSubs=[];FX.crmKey=null;return}
  const p=FX.perm||{};const key=S.b.id+'|'+(S.b.owner||'')+'|'+!!p.leads+'|'+!!p.cash;
  if(key===FX.crmKey)return;FX.crmKey=key;
  FX.crmSubs.forEach(f=>f());FX.crmSubs=[];FX.L=[];FX.A=[];FX.V=[];FX.Pg=[];FX.M=[];FX.G=[];
  const sub=(col,set)=>FX.crmSubs.push(cref(col).onSnapshot(s=>{set(fxDocs(s));fxSafeRender()},
    e=>fxStatus('No se pudo leer '+col+': '+e.message,'err')));
  if(p.leads){sub('crm_leads',d=>FX.L=d);sub('crm_agendas',d=>FX.A=d)}
  if(p.cash){sub('crm_ventas',d=>FX.V=d);sub('crm_pagos',d=>FX.Pg=d);sub('movimientos',d=>FX.M=d);sub('gastos',d=>FX.G=d)}
}

// ---- Código de rastreo por pieza (palabra clave o código corto) y enlace UTM ----
const crmCodigo=p=>(p.keyword||'').trim()?String(p.keyword).trim().toUpperCase():'P-'+String(p.id).slice(-5).toUpperCase();
const crmSlug=s=>String(s||'marca').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'marca';
function crmUTM(p){const base=(S.b&&S.b.crmUrl)||'';if(!/^https?:\/\//i.test(base))return '';
  return base+(base.includes('?')?'&':'?')+'utm_source=instagram&utm_medium=social&utm_campaign='+crmSlug(S.b.name)+'&utm_content='+encodeURIComponent(crmCodigo(p))}
// Acepta un código, una palabra clave o un enlace con utm_content.
function crmBuscarCodigo(txt){let c=String(txt||'').trim();if(!c)return [];
  const m=c.match(/[?&]utm_content=([^&#]+)/i);if(m)c=decodeURIComponent(m[1]);
  c=c.toUpperCase();return S.P.filter(p=>crmCodigo(p)===c)}

// Identificador para detectar duplicados (una persona = un lead).
function crmNorm(c){c=String(c||'').trim().toLowerCase();if(!c)return '';
  const dig=c.replace(/\D/g,'');
  if(/^[+\d\s().-]+$/.test(c)&&dig.length>=7)return 'tel:'+dig.slice(-8);
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c))return 'mail:'+c;
  return 'user:'+c.replace(/^@/,'').replace(/\s+/g,'')}

// ---- Cálculos ----
function crmRango(){const p=FX.crm.per;
  if(p==='todo')return{a:'0000-01-01',b:'9999-12-31',txt:'Todo el historial'};
  if(p==='mes'){const m=ds(S.d).slice(0,7);return{a:m+'-01',b:m+'-31',txt:MESES[S.d.getMonth()]+' '+S.d.getFullYear()}}
  const n=+p||90,a=new Date();a.setDate(a.getDate()-(n-1));return{a:ds(a),b:fxHoy(),txt:'Últimos '+n+' días'}}
const crmEn=(f,r)=>!!f&&f>=r.a&&f<=r.b;
const crmLead=id=>FX.L.find(l=>l.id===id);
const crmPiezaDe=x=>{const l=x&&x.leadId&&crmLead(x.leadId);return (l&&l.piezaId)||(x&&x.piezaId)||''};
const crmCashVenta=v=>FX.Pg.filter(p=>p.ventaId===v.id&&p.estado==='recibido').reduce((s,p)=>s+(+p.importe||0),0);
const crmMon=v=>(v.moneda||objMon())===objMon();
function crmCalc(r,filtroPieza){const fp=x=>filtroPieza===undefined||crmPiezaDe(x)===filtroPieza;
  const L=FX.L.filter(l=>crmEn(l.fecha,r)&&(filtroPieza===undefined||(l.piezaId||'')===filtroPieza));
  const A=FX.A.filter(a=>crmEn(a.fecha,r)&&fp(a));
  const V=FX.V.filter(v=>v.estado!=='anulada'&&crmMon(v)&&crmEn(v.fecha,r)&&fp(v));
  const vendido=V.reduce((s,v)=>s+(+v.total||0),0);
  const cash=FX.Pg.filter(p=>{if(p.estado!=='recibido'||!crmEn(p.fecha,r))return false;const v=FX.V.find(x=>x.id===p.ventaId);return v&&v.estado!=='anulada'&&crmMon(v)&&fp(v)}).reduce((s,p)=>s+(+p.importe||0),0);
  const pendiente=V.reduce((s,v)=>s+Math.max(0,(+v.total||0)-crmCashVenta(v)),0);
  const otraMon=FX.V.filter(v=>v.estado!=='anulada'&&!crmMon(v)&&crmEn(v.fecha,r)).length;
  return {L,A,V,vendido,cash,pendiente,otraMon,
    realizadas:A.filter(a=>a.estado==='realizada').length,
    calificadas:A.filter(a=>a.calificacion==='calificada').length,
    noCalificadas:A.filter(a=>a.calificacion==='no_calificada').length,
    noAsistio:A.filter(a=>a.estado==='no_asistio').length}}
const crmPct=(a,b)=>b>0?pctTxt(a/b*100):'No disponible';

// ---- Vista principal ----
function crmV(){
  if(!S.b)return '';
  if(!FX.perm.leads)return '<div class=fxwrap><p class=empty>No tienes permiso para ver los leads de esta marca.</p></div>';
  const t=FX.crm.tab,cash=FX.perm.cash;
  const tabs=[['embudo','Embudo'],['piezas','Por pieza'],['leads','Leads'],['agendas','Agendas']].concat(cash?[['ventas','Ventas']]:[]).concat(fxOwner()===S.u.uid?[['ajustes','Ajustes']]:[]);
  const per=`<label>Período<select onchange="FX.crm.per=this.value;R()">${[['mes','Mes de la vista ('+MESES[S.d.getMonth()]+')'],['30','Últimos 30 días'],['90','Últimos 90 días'],['todo','Todo el historial']].map(([k,n])=>`<option value=${k} ${FX.crm.per===k?'selected':''}>${n}</option>`).join('')}</select></label>`;
  const cuerpo=t==='piezas'?crmPiezasV():t==='leads'?crmLeadsV():t==='agendas'?crmAgendasV():t==='ventas'&&cash?crmVentasV():t==='ajustes'?crmAjustesV():crmEmbudoV();
  return `<div class=fxbar>${tabs.map(([k,n])=>`<button class="${t===k?'on':''}" onclick="FX.crm.tab='${k}';R()">${n}</button>`).join('')}</div>
  <div class=fxwrap><div class=fxtools>${per}<div class=row style="margin:0"><button class=gold onclick="crmLeadM(null)">+ Nuevo lead</button><button onclick="crmAgendaM(null)">+ Nueva agenda</button>${cash?'<button onclick="crmVentaM(null)">+ Nueva venta</button>':''}</div></div>${cuerpo}</div>`}

function crmEmbudoV(){const r=crmRango(),c=crmCalc(r),cash=FX.perm.cash;
  return `<p class=fxnote>${esc(r.txt)}. Un lead es una persona con interés comercial real (no un like ni un seguidor). Cash = dinero efectivamente recibido.</p>
  <div class=fxcards>
    <div class=fxcard2><small>Leads</small><b>${c.L.length}</b><span>${c.L.filter(l=>l.piezaId).length} atribuidos a una pieza</span></div>
    <div class=fxcard2><small>Agendas</small><b>${c.A.length}</b><span>${crmPct(c.A.length,c.L.length)} de los leads</span></div>
    <div class=fxcard2><small>Agendas realizadas</small><b>${c.realizadas}</b><span>${c.noAsistio} no asistieron</span></div>
    <div class=fxcard2><small>Agendas calificadas</small><b>${c.calificadas}</b><span>${crmPct(c.calificadas,c.A.length)} de las agendas · ${c.noCalificadas} no calificadas</span></div>
    ${cash?`<div class=fxcard2><small>Ventas</small><b>${c.V.length}</b><span>${crmMoney(c.vendido)} vendido · ${crmPct(c.V.length,c.calificadas)} de calificadas</span></div>
    <div class=fxcard2><small>Cash</small><b>${crmMoney(c.cash)}</b><span>pagos recibidos en el período</span></div>
    <div class=fxcard2><small>Pendiente de cobro</small><b>${crmMoney(c.pendiente)}</b><span>saldo de las ventas del período</span></div>
    <div class=fxcard2><small>Cash por lead</small><b>${c.L.length?crmMoney(c.cash/c.L.length):'No disponible'}</b><span>cash ÷ leads del período</span></div>`:''}
  </div>${cash&&c.otraMon?`<p class=fxnote>${c.otraMon} venta(s) en otra moneda no se suman.</p>`:''}
  <h3 class=fxh>Piezas con más resultado</h3>${crmTablaPiezas(5)}`}

function crmFilasPiezas(){const r=crmRango(),ids=new Set();
  FX.L.forEach(l=>crmEn(l.fecha,r)&&ids.add(l.piezaId||''));FX.A.forEach(a=>crmEn(a.fecha,r)&&ids.add(crmPiezaDe(a)));FX.V.forEach(v=>crmEn(v.fecha,r)&&ids.add(crmPiezaDe(v)));
  return [...ids].map(id=>({id,p:S.P.find(x=>x.id===id),c:crmCalc(r,id)}))
    .sort((a,b)=>(FX.perm.cash?(b.c.cash-a.c.cash):0)||(b.c.calificadas-a.c.calificadas)||(b.c.L.length-a.c.L.length))}
function crmTablaPiezas(lim){const F=crmFilasPiezas().slice(0,lim||999),cash=FX.perm.cash;
  if(!F.length)return '<p class=empty>Aún no hay leads ni ventas en este período.</p>';
  return `<div class=fxtable><table><tr><th>Pieza</th><th>Leads</th><th>Agendas</th><th>Calificadas</th>${cash?'<th>Ventas</th><th>Cash</th><th>Pendiente</th>':''}<th></th></tr>${F.map(x=>{const p=x.p;
    const nom=x.id===''?'<i>Sin atribuir</i>':p?`${esc(p.tema||p.idea||'Sin tema')}<br><small class=fxnote>${fd(p.date)} · ${esc((FMT[p.format]||{}).n||'')} · código ${esc(crmCodigo(p))}</small>`:'<i>Pieza eliminada</i>';
    return `<tr><td>${nom}</td><td>${x.c.L.length}</td><td>${x.c.A.length}</td><td>${x.c.calificadas}</td>${cash?`<td>${x.c.V.length} · ${crmMoney(x.c.vendido)}</td><td><b>${crmMoney(x.c.cash)}</b></td><td>${crmMoney(x.c.pendiente)}</td>`:''}<td>${p?`<div class=row style="margin:0"><button onclick="edit('${p.id}')">Abrir pieza</button>${typeof reutM==='function'?`<button onclick="reutM('${p.id}')">Replicar con otro ángulo</button>`:''}</div>`:''}</td></tr>`}).join('')}</table></div>`}
function crmPiezasV(){return `<p class=fxnote>Qué pieza trae leads, agendas calificadas${FX.perm.cash?' y dinero':''}. «Replicar con otro ángulo» programa una variante con nuevo tema o hook. Atribución: por código o enlace de la pieza, o elegida por ti al registrar.</p>${crmTablaPiezas()}`}

function crmLeadsV(){const r=crmRango(),q=nz(FX.crm.q);
  const L=FX.L.filter(l=>crmEn(l.fecha,r)&&(!q||nz([l.nombre,l.contacto,l.nota].join(' ')).includes(q))).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  return `<div class=fxtools><input placeholder="Buscar por nombre o contacto" value="${esc(FX.crm.q)}" oninput="FX.crm.q=this.value;clearTimeout(window.__crmT);window.__crmT=setTimeout(()=>{const a=document.activeElement;R();const b=document.querySelector('.fxtools input');if(b&&a&&a.placeholder===b.placeholder){b.focus();b.setSelectionRange(b.value.length,b.value.length)}},350)"></div>
  ${L.length?L.map(l=>{const p=S.P.find(x=>x.id===l.piezaId),ag=FX.A.filter(a=>a.leadId===l.id);
    return `<div class=fxpc><div class=r1><b class=fxt2>${esc(l.nombre||'Sin nombre')}</b><span class=fxtag>${ag.length} agenda(s)</span></div>
    <div class=fxmeta>${esc(l.contacto||'')} · ${(l.canales||[]).map(c=>esc(CRM_CANAL[c]||c)).join(', ')} · ${fd(l.fecha)}</div>
    <div class=fxmeta>Pieza: ${p?esc(p.tema||'Sin tema'):'Sin atribuir'}${l.atribucion==='codigo'?' (por código)':l.piezaId?' (elegida manualmente)':''}</div>
    <div class=row><button onclick="crmLeadM('${l.id}')">Editar lead</button><button onclick="crmAgendaM(null,'${l.id}')">Agendar</button>${FX.perm.cash?`<button onclick="crmVentaM(null,'${l.id}')">Registrar venta</button>`:''}<button class=danger onclick="crmDel('crm_leads','${l.id}')">Eliminar lead</button></div></div>`}).join(''):'<p class=empty>No hay leads en este período.</p>'}`}

function crmAgendasV(){const r=crmRango();
  const A=FX.A.filter(a=>crmEn(a.fecha,r)).sort((a,b)=>(b.fecha+(b.hora||'')).localeCompare(a.fecha+(a.hora||'')));
  return A.length?A.map(a=>{const l=crmLead(a.leadId);
    return `<div class=fxpc><div class=r1><b class=fxt2>${esc(l?l.nombre:'Lead eliminado')}</b><span class=fxtag>${esc(CRM_CAL[a.calificacion||'pendiente'])}</span></div>
    <div class=fxmeta>${fd(a.fecha)}${a.hora?' · '+fh(a.hora):''} · ${esc(CRM_AG_TIPO[a.tipo]||a.tipo||'')} · ${esc(CRM_AG_EST[a.estado]||a.estado||'')}</div>
    ${a.calificadoPor?`<div class=fxmeta>Calificó: ${esc(a.calificadoPor)}</div>`:''}
    <div class=row><button onclick="crmAgendaM('${a.id}')">Editar agenda</button><button class=danger onclick="crmDel('crm_agendas','${a.id}')">Eliminar agenda</button></div></div>`}).join(''):'<p class=empty>No hay agendas en este período.</p>'}

function crmVentasV(){const r=crmRango();
  const V=FX.V.filter(v=>crmEn(v.fecha,r)).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''));
  return V.length?V.map(v=>{const l=crmLead(v.leadId),c=crmCashVenta(v),pend=Math.max(0,(+v.total||0)-c);
    return `<div class=fxpc><div class=r1><b class=fxt2>${esc(v.concepto||'Venta')}${l?' · '+esc(l.nombre):''}</b><span class=fxtag>${v.estado==='anulada'?'Anulada':pend<=0?'Pagada':'Con saldo'}</span></div>
    <div class=fxmeta>${fd(v.fecha)} · Total ${objMoneyTxt(v.total,v.moneda||objMon())} · Cash ${objMoneyTxt(c,v.moneda||objMon())} · Pendiente ${objMoneyTxt(pend,v.moneda||objMon())}</div>
    <div class=row><button onclick="crmVentaM('${v.id}')">Editar venta y pagos</button><button class=danger onclick="crmDel('crm_ventas','${v.id}')">Eliminar venta</button></div></div>`}).join(''):'<p class=empty>No hay ventas en este período.</p>'}

function crmAjustesV(){const crit=(S.b.crmCriterios&&S.b.crmCriterios.length)?S.b.crmCriterios:Object.keys(CRM_CRIT);
  return `<details class=fxsec open><summary>Enlace de destino para UTM</summary>
  <p class=fxnote>Tu link en bio, landing, WhatsApp o Calendly. Cada pieza tendrá un enlace con su código en <b>utm_content</b>. Si tu formulario o herramienta guarda ese dato, al registrar el lead pegas el enlace y la pieza se detecta sola.</p>
  <label>URL de destino<input id=crm_url value="${esc(S.b.crmUrl||'')}" placeholder="https://…"></label></details>
  <details class=fxsec open><summary>Criterios de calificación de esta marca</summary>
  <p class=fxnote>Marca solo los que use tu negocio. El responsable comercial los revisa al calificar una agenda.</p>
  <div class=fxcheckgrid>${Object.entries(CRM_CRIT).map(([k,n])=>`<label class=fxck><input type=checkbox data-crit=${k} ${crit.includes(k)?'checked':''}> ${n}</label>`).join('')}</div></details>
  <div class=row><button class=gold onclick="crmAjustesSave()">Guardar ajustes</button></div>`}
function crmAjustesSave(){const u=($('#crm_url').value||'').trim();
  if(u&&!/^https?:\/\//i.test(u))return alert('La URL debe empezar con https:// o http://');
  const crit=[...document.querySelectorAll('[data-crit]')].filter(x=>x.checked).map(x=>x.dataset.crit);
  if(!crit.length)return alert('Elige al menos un criterio.');
  fxRun(bref().doc(S.b.id).update({crmUrl:u,crmCriterios:crit}),'Ajustes del CRM guardados').catch(()=>{})}

// ---- Formularios ----
const crmPiezaOpts=sel=>'<option value="">Sin atribuir</option>'+S.P.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,300).map(p=>`<option value="${p.id}" ${sel===p.id?'selected':''}>${fd(p.date)} · ${esc((p.tema||'Sin tema').slice(0,45))} · ${esc(crmCodigo(p))}</option>`).join('');
const crmLeadOpts=sel=>'<option value="">Elige un lead…</option>'+FX.L.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'','es')).map(l=>`<option value="${l.id}" ${sel===l.id?'selected':''}>${esc(l.nombre||'Sin nombre')} · ${esc(l.contacto||'')}</option>`).join('');

function crmLeadM(id){const l=id?crmLead(id):null;if(id&&!l)return;
  $('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>${l?'Editar lead':'Nuevo lead'}</h2>
  <p class=fxnote>Registra solo personas con interés comercial real. Una persona = un lead, aunque escriba por varios canales.</p>
  <div class=r2><label>Nombre<input id=cl_n value="${esc(l&&l.nombre||'')}"></label><label>Contacto principal (@usuario, teléfono o correo)<input id=cl_c value="${esc(l&&l.contacto||'')}"></label></div>
  <div class=r2><label>Canal${l?' (se añade a los anteriores)':''}<select id=cl_ca>${Object.entries(CRM_CANAL).map(([k,v])=>`<option value=${k}>${v}</option>`).join('')}</select></label><label>Fecha del primer contacto<input type=date id=cl_f value="${esc(l&&l.fecha||fxHoy())}"></label></div>
  <label>Código, palabra clave o enlace UTM (opcional: detecta la pieza)<input id=cl_cod value="${esc(l&&l.codigo||'')}" oninput="crmDetecta()"></label>
  <p class=fxnote id=cl_det></p>
  <label>Pieza que lo trajo<select id=cl_p>${crmPiezaOpts(l&&l.piezaId)}</select></label>
  <label>Nota breve<input id=cl_no maxlength=200 value="${esc(l&&l.nota||'')}"></label>
  <div class=row><button class=gold onclick="crmLeadSave('${id||''}')">Guardar lead</button><button onclick="closeM()">Cancelar</button></div></div></div>`}
function crmDetecta(){const L=crmBuscarCodigo($('#cl_cod').value),el=$('#cl_det');
  if(!$('#cl_cod').value.trim()){el.textContent='';return}
  if(L.length===1){$('#cl_p').value=L[0].id;el.textContent='Pieza detectada: '+(L[0].tema||'Sin tema')+' ('+fd(L[0].date)+')'}
  else if(L.length>1)el.textContent='Ese código coincide con '+L.length+' piezas: elige la correcta en la lista.';
  else el.textContent='Ningún código coincide. Puedes elegir la pieza a mano.'}
async function crmLeadSave(id){const g=k=>($('#'+k)?.value||'').trim();
  const nombre=g('cl_n'),contacto=g('cl_c'),norm=crmNorm(contacto),canal=g('cl_ca'),pid=g('cl_p'),cod=g('cl_cod');
  if(!nombre&&!contacto)return alert('Escribe al menos el nombre o un contacto.');
  const det=crmBuscarCodigo(cod);const atrib=pid?(det.length&&det.some(p=>p.id===pid)?'codigo':'manual'):'no';
  const base={nombre,contacto,contactoNorm:norm,fecha:g('cl_f')||fxHoy(),piezaId:pid,atribucion:atrib,codigo:cod,nota:g('cl_no'),actualizado:crmTS()};
  if(id){const l=crmLead(id);const can=[...new Set([...(l.canales||[]),canal])];
    try{await fxRun(cref('crm_leads').doc(id).update({...base,canales:can}),'Lead actualizado');closeM()}catch(e){}return}
  const dup=norm&&FX.L.find(l=>l.contactoNorm===norm);
  if(dup){if(!confirm('Ya existe el lead «'+(dup.nombre||dup.contacto)+'» con ese contacto. Una persona es un solo lead.\n\n¿Añadir este canal al lead existente en lugar de crear otro?'))return;
    try{await fxRun(cref('crm_leads').doc(dup.id).update({canales:[...new Set([...(dup.canales||[]),canal])],actualizado:crmTS()}),'Canal añadido al lead existente');closeM()}catch(e){}return}
  try{await fxRun(cref('crm_leads').add({...base,canales:[canal],creado:crmTS()}),'Lead guardado');closeM()}catch(e){}}

function crmAgendaM(id,leadId){const a=id?FX.A.find(x=>x.id===id):null;if(id&&!a)return;
  if(!FX.L.length)return alert('Primero registra un lead: una agenda siempre pertenece a una persona.');
  const crit=(S.b.crmCriterios&&S.b.crmCriterios.length)?S.b.crmCriterios:Object.keys(CRM_CRIT);const cr=(a&&a.criterios)||{};
  $('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>${a?'Editar agenda':'Nueva agenda'}</h2>
  <p class=fxnote>Solo es agenda si hay una cita programada. Preguntar por información no cuenta como agenda.</p>
  <label>Lead<select id=ca_l>${crmLeadOpts((a&&a.leadId)||leadId)}</select></label>
  <div class=r2><label>Fecha de la cita<input type=date id=ca_f value="${esc(a&&a.fecha||'')}"></label><label>Hora<input type=time id=ca_h value="${esc(a&&a.hora||'')}"></label></div>
  <div class=r2><label>Tipo<select id=ca_t>${Object.entries(CRM_AG_TIPO).map(([k,v])=>`<option value=${k} ${a&&a.tipo===k?'selected':''}>${v}</option>`).join('')}</select></label>
  <label>Estado<select id=ca_e>${Object.entries(CRM_AG_EST).map(([k,v])=>`<option value=${k} ${(a?a.estado:'programada')===k?'selected':''}>${v}</option>`).join('')}</select></label></div>
  <details class=fxsec open><summary>Calificación</summary>
  <p class=fxnote>La califica el responsable comercial según los criterios de la marca.</p>
  <div class=fxcheckgrid>${crit.map(k=>`<label class=fxck><input type=checkbox data-cr=${k} ${cr[k]?'checked':''}> ${CRM_CRIT[k]}</label>`).join('')}</div>
  <label>Resultado<select id=ca_c>${Object.entries(CRM_CAL).map(([k,v])=>`<option value=${k} ${((a&&a.calificacion)||'pendiente')===k?'selected':''}>${v}</option>`).join('')}</select></label></details>
  <label>Nota breve<input id=ca_n maxlength=200 value="${esc(a&&a.nota||'')}"></label>
  <div class=row><button class=gold onclick="crmAgendaSave('${id||''}')">Guardar agenda</button><button onclick="closeM()">Cancelar</button></div></div></div>`}
async function crmAgendaSave(id){const g=k=>($('#'+k)?.value||'').trim();
  const leadId=g('ca_l'),fecha=g('ca_f');if(!leadId)return alert('Elige el lead de esta agenda.');if(!fecha)return alert('Una agenda necesita fecha de cita.');
  const criterios={};document.querySelectorAll('[data-cr]').forEach(x=>{criterios[x.dataset.cr]=x.checked});
  const cal=g('ca_c');const prev=id?FX.A.find(x=>x.id===id):null;
  const d={leadId,fecha,hora:g('ca_h'),tipo:g('ca_t'),estado:g('ca_e'),calificacion:cal,criterios,nota:g('ca_n'),actualizado:crmTS()};
  if(cal!=='pendiente'&&(!prev||prev.calificacion!==cal)){d.calificadoPor=fxEmail()||S.u.uid;d.calificadoEl=crmTS()}
  try{if(id)await fxRun(cref('crm_agendas').doc(id).update(d),'Agenda actualizada');else await fxRun(cref('crm_agendas').add({...d,creado:crmTS()}),'Agenda guardada');closeM()}catch(e){}}

function crmVentaM(id,leadId){const v=id?FX.V.find(x=>x.id===id):null;if(id&&!v)return;const mon=objMon();
  const pagos=v?FX.Pg.filter(p=>p.ventaId===v.id).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')):[];
  const cash=v?crmCashVenta(v):0,pend=v?Math.max(0,(+v.total||0)-cash):0,m=(v&&v.moneda)||mon;
  $('#modal').innerHTML=`<div class=ov><div class="md fxmd"><h2>${v?'Venta y pagos':'Nueva venta'}</h2>
  <p class=fxnote>Venta = valor total vendido. Cash = pagos recibidos. Pendiente = lo que el cliente todavía debe.</p>
  <label>Lead<select id=cs_l>${crmLeadOpts((v&&v.leadId)||leadId)}</select></label>
  <label>Pieza (solo si no hay lead; si hay lead, cuenta la pieza del lead)<select id=cs_p>${crmPiezaOpts(v&&v.piezaId)}</select></label>
  <div class=r2><label>Fecha de la venta<input type=date id=cs_f value="${esc(v&&v.fecha||fxHoy())}"></label><label>Concepto<input id=cs_c maxlength=80 value="${esc(v&&v.concepto||'')}"></label></div>
  <div class=r2><label>Total vendido<input type=number min=0 step=any id=cs_t value="${v?esc(v.total):''}"></label><label>Moneda<input id=cs_m maxlength=3 value="${esc(m)}"></label></div>
  <label>Estado<select id=cs_e><option value=activa ${(!v||v.estado!=='anulada')?'selected':''}>Activa</option><option value=anulada ${v&&v.estado==='anulada'?'selected':''}>Anulada</option></select></label>
  <div class=row><button class=gold onclick="crmVentaSave('${id||''}')">Guardar venta</button><button onclick="closeM()">Cerrar</button></div>
  ${v?`<details class=fxsec open><summary>Pagos y cuotas</summary>
    <div class=fxcards><div class=fxcard2><small>Total</small><b>${objMoneyTxt(v.total,m)}</b></div><div class=fxcard2><small>Cash</small><b>${objMoneyTxt(cash,m)}</b></div><div class=fxcard2><small>Pendiente</small><b>${objMoneyTxt(pend,m)}</b></div></div>
    ${pagos.length?pagos.map(p=>`<div class=fxpc><div class=fxt2>${fd(p.fecha)} · ${objMoneyTxt(p.importe,m)}</div><div class=row><select onchange="crmPagoEstado('${p.id}',this.value,'${v.id}')">${Object.entries(CRM_PAGO).map(([k,n])=>`<option value=${k} ${p.estado===k?'selected':''}>${n}</option>`).join('')}</select><button class=danger onclick="crmPagoDel('${p.id}','${v.id}')">Eliminar pago</button></div></div>`).join(''):'<p class=fxnote>Aún no hay pagos registrados.</p>'}
    <div class=fxurl><input type=date id=cp_f value="${fxHoy()}"><input type=number min=0 step=any id=cp_i placeholder="Importe"><select id=cp_e><option value=recibido>Recibido</option><option value=pendiente>Pendiente (cuota programada)</option></select><button onclick="crmPagoAdd('${v.id}')">+ Registrar pago</button></div>
  </details>`:'<p class=fxnote>Guarda la venta para registrar sus pagos o cuotas.</p>'}
  </div></div>`}
async function crmVentaSave(id){const g=k=>($('#'+k)?.value||'').trim();
  const total=+g('cs_t'),mon=(g('cs_m')||objMon()).toUpperCase();
  if(!(total>0))return alert('Escribe el total vendido (mayor que 0).');if(!/^[A-Z]{3}$/.test(mon))return alert('Moneda: código de 3 letras, por ejemplo USD.');
  const leadId=g('cs_l'),d={leadId,piezaId:leadId?'':g('cs_p'),fecha:g('cs_f')||fxHoy(),concepto:g('cs_c'),total,moneda:mon,estado:g('cs_e')||'activa',actualizado:crmTS()};
  if(id){const c=crmCashVenta({id});if(c>total&&!confirm('Ya se recibieron '+crmMoney(c)+', más que el nuevo total. ¿Guardar igual?'))return}
  try{if(id){await fxRun(cref('crm_ventas').doc(id).update(d),'Venta actualizada');crmVentaM(id)}
    else{const r=await fxRun(cref('crm_ventas').add({...d,creado:crmTS()}),'Venta guardada');setTimeout(()=>crmVentaM(r.id),300)}}catch(e){}}
async function crmPagoAdd(ventaId){const v=FX.V.find(x=>x.id===ventaId);if(!v)return;
  const imp=+($('#cp_i').value||0),f=$('#cp_f').value,est=$('#cp_e').value;
  if(!(imp>0))return alert('Escribe el importe del pago.');if(!f)return alert('Elige la fecha del pago.');
  const yaPlan=FX.Pg.filter(p=>p.ventaId===ventaId&&p.estado!=='anulado').reduce((s,p)=>s+(+p.importe||0),0);
  if(yaPlan+imp>(+v.total||0)&&!confirm('Con este pago, los pagos superan el total de la venta. ¿Registrar igual?'))return;
  try{await fxRun(cref('crm_pagos').add({ventaId,fecha:f,importe:imp,estado:est,creado:crmTS()}),'Pago registrado');setTimeout(()=>crmVentaM(ventaId),300)}catch(e){}}
function crmPagoEstado(id,est,ventaId){fxRun(cref('crm_pagos').doc(id).update({estado:est}),'Pago actualizado').then(()=>setTimeout(()=>crmVentaM(ventaId),300)).catch(()=>{})}
function crmPagoDel(id,ventaId){if(!confirm('¿Eliminar este pago?'))return;fxRun(cref('crm_pagos').doc(id).delete(),'Pago eliminado').then(()=>setTimeout(()=>crmVentaM(ventaId),300)).catch(()=>{})}
function crmDel(col,id){const msg={crm_leads:'¿Eliminar este lead? Sus agendas y ventas quedarán sin lead.',crm_agendas:'¿Eliminar esta agenda?',crm_ventas:'¿Eliminar esta venta? Sus pagos dejarán de contar.'}[col]||'¿Eliminar?';
  if(!confirm(msg+' No se puede deshacer.'))return;
  if(col==='crm_ventas'){const lote=db.batch();lote.delete(cref('crm_ventas').doc(id));FX.Pg.filter(p=>p.ventaId===id).forEach(p=>lote.delete(cref('crm_pagos').doc(p.id)));fxRun(lote.commit(),'Venta eliminada').catch(()=>{});return}
  fxRun(cref(col).doc(id).delete(),'Eliminado').catch(()=>{})}

// ---- Rastreo dentro del editor de cada pieza ----
const _editCRM=edit;
edit=function(id,date){_editCRM(id,date);if(!id||!FX.perm.leads)return;const p=S.P.find(x=>x.id===id),md=document.querySelector('#modal .md');if(!p||!md)return;
  const c=crmCalc({a:'0000-01-01',b:'9999-12-31'},id),utm=crmUTM(p);
  const row=[...md.querySelectorAll('.row')].find(r=>r.querySelector('.gold'));
  const html=`<details class=fxsec><summary>Rastreo de ventas · ${c.L.length} lead(s)${FX.perm.cash?' · '+crmMoney(c.cash)+' cash':''}</summary>
    <p class=fxnote>Código de esta pieza: <b>${esc(crmCodigo(p))}</b>${p.keyword?' (es su palabra clave)':''}. Úsalo en ManyChat, formularios o al registrar el lead.</p>
    ${utm?`<p class=fxnote>Enlace UTM: ${esc(utm)}</p>`:'<p class=fxnote>Configura la URL de destino en CRM → Ajustes para generar el enlace UTM.</p>'}
    <div class=row><button type=button onclick="fxCopy(decodeURIComponent('${encodeURIComponent(crmCodigo(p))}'),'Código copiado')">Copiar código</button>${utm?`<button type=button onclick="fxCopy(decodeURIComponent('${encodeURIComponent(utm)}'),'Enlace copiado')">Copiar enlace UTM</button>`:''}</div>
    <div class=fxmeta>Agendas: ${c.A.length} · Calificadas: ${c.calificadas}${FX.perm.cash?' · Ventas: '+c.V.length+' ('+crmMoney(c.vendido)+') · Pendiente: '+crmMoney(c.pendiente):''}</div></details>`;
  if(row)row.insertAdjacentHTML('beforebegin',html)};

// ---- Pestaña CRM en la navegación ----
const _bodyCRM=body;
body=function(){if(S.v==='crm')return crmV();return _bodyCRM()};
