// ===== Ficha para análisis con IA (Claude, GPT u otra) =====
// Archivo Markdown con el período elegido en «Qué funciona»: resumen, hallazgos, piezas con
// métricas y contenido, secuencias de historias y un bloque JSON para análisis automático.
// No incluye tokens, correos ni nombres de leads (solo cantidades).

function fxFichaIA(){
  const r=qfRango(),L=qfBase().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const redes=['ig','tt','yt'].filter(k=>L.some(p=>qfM(p,k).tiene));
  const dias=Math.round((pd(r.b)-pd(r.a))/864e5)+1;
  const txt=s=>String(s==null?'':s).replace(/\s+/g,' ').trim();
  const celda=s=>txt(s).replace(/\|/g,'/');
  const et=(m,k)=>(m[k]&&m[k].n)||(k?String(k):'—');
  const crmDe=p=>{
    if(!FX.perm.leads)return null;
    const c=crmCalc({a:'0000-01-01',b:'9999-12-31'},p.id);
    const o={leads:c.L.length,agendas:c.A.length,agendas_calificadas:c.calificadas};
    if(FX.perm.cash){o.ventas=c.V.length;o.cash=c.cash;o.pendiente=c.pendiente}
    return o};
  const piezas=L.map(p=>({
    id:p.id,fecha:p.date,hora:p.hora||'',formato:et(FMT,p.format),tipo:et(TIPO,p.tipo),enfoque:et(ENF,p.enfoque),
    etapa_embudo:et(EMB,p.embudo),pilar:txt(p.pilar),categoria:txt(p.categoria),tema:txt(p.tema||p.idea),
    angulo:txt(p.angulo),tipo_gancho:txt(p.tipogancho),hook:txt(p.hook),cta:txt(p.cta),palabra_clave:txt(p.keyword),
    copy:txt(p.desc),hashtags:txt(p.tags),guion_o_estructura:String(p.guion||'').trim(),
    enlaces:Object.fromEntries(redes.map(k=>[k,(p.links&&p.links[k])||''])),
    metricas:redes.map(k=>{const m=qfM(p,k);return {red:QF_RED[k],con_datos:m.tiene,vistas:m.views,likes:m.likes,
      comentarios:m.comments,guardados:m.saves,compartidos:m.shares,
      tasa_por_alcance_pct:m.views>0?+(m.interacciones/m.views*100).toFixed(2):null}}),
    crm:crmDe(p)}))
    .sort((a,b)=>b.metricas.reduce((s,m)=>s+m.vistas,0)-a.metricas.reduce((s,m)=>s+m.vistas,0));
  const unica=redes.length===1?redes[0]:null;
  const hall=unica?qfHallazgos(L,unica):[];
  const seqs=igSecuencias().filter(s=>s.fecha>=r.a&&s.fecha<=r.b);
  const conDatos=L.filter(p=>redes.some(k=>qfM(p,k).tiene)).length;
  const st=unica?qfStats(L,unica):null;
  const md=[];
  md.push('# Ficha de contenido: '+(S.b.name||'Marca'));
  md.push('');
  md.push('- Período: '+fd(r.a)+' a '+fd(r.b)+' ('+dias+' días)');
  md.push('- Zona horaria: El Salvador');
  md.push('- Generada: '+fd(new Date()));
  md.push('- Redes con datos: '+(redes.map(k=>QF_RED[k]).join(', ')||'ninguna'));
  md.push('- Cómo leer los datos: "Sin datos" significa que no hay registro; no es cero.');
  md.push('');
  md.push('## Resumen');
  md.push('- Publicaciones publicadas: '+L.length);
  md.push('- Con métricas: '+conDatos);
  if(st)md.push('- Tasa de interacción por alcance (ponderada): '+(st.tasa!=null?st.tasa.toFixed(2)+' %':'Sin datos'));
  md.push('');
  md.push('## Hallazgos automáticos (con muestra)');
  if(hall.length){hall.forEach(h=>md.push('- '+h.titulo+'. '+h.texto+(h.ev?' ['+h.ev+']':'')+(h.conf?' Confianza: '+h.conf+'.':'')))}
  else md.push(unica?'- Sin hallazgos con la muestra mínima de '+QF_MIN+' piezas.':'- Elige una sola red en «Qué funciona» para ver hallazgos.');
  md.push('');
  md.push('## Piezas ordenadas por alcance');
  md.push('| # | Fecha | Formato | Tema | Hook | Vistas | Interacciones | Tasa | Leads | Cash |');
  md.push('|---|---|---|---|---|---|---|---|---|---|');
  piezas.forEach((p,i)=>{
    const v=p.metricas.reduce((s,m)=>s+m.vistas,0);
    const it=p.metricas.reduce((s,m)=>s+m.likes+m.comentarios+m.guardados+m.compartidos,0);
    const tasa=v>0?(it/v*100).toFixed(2)+' %':'Sin datos';
    md.push('| '+(i+1)+' | '+fd(p.fecha)+' | '+celda(p.formato)+' | '+celda(p.tema)+' | '+celda(p.hook)+' | '+(v||'Sin datos')+' | '+(it||'Sin datos')+' | '+tasa+' | '+(p.crm?p.crm.leads:'—')+' | '+(p.crm&&p.crm.cash!=null?p.crm.cash:'—')+' |');
  });
  md.push('');
  md.push('## Detalle por pieza');
  piezas.slice(0,150).forEach((p,i)=>{
    md.push('');
    md.push('### '+(i+1)+'. '+(p.tema||'Sin tema')+' ('+fd(p.fecha)+')');
    md.push('- Formato: '+p.formato+' · Tipo: '+p.tipo+' · Enfoque: '+p.enfoque+' · Etapa: '+p.etapa_embudo+' · Pilar: '+(p.pilar||'—')+' · Categoría: '+(p.categoria||'—'));
    if(p.angulo)md.push('- Ángulo: '+p.angulo);
    if(p.hook)md.push('- Hook: '+p.hook);
    if(p.tipo_gancho)md.push('- Tipo de gancho: '+p.tipo_gancho);
    if(p.cta)md.push('- CTA: '+p.cta);
    if(p.palabra_clave)md.push('- Palabra clave: '+p.palabra_clave);
    if(p.copy)md.push('- Copy: '+p.copy);
    if(p.guion_o_estructura)md.push('- Guion o estructura: '+p.guion_o_estructura.replace(/\n/g,' / '));
    p.metricas.forEach(m=>md.push('- '+m.red+': '+(m.con_datos
      ?'vistas '+m.vistas+', likes '+m.likes+', comentarios '+m.comentarios+', guardados '+m.guardados+', compartidos '+m.compartidos+(m.tasa_por_alcance_pct!=null?', tasa por alcance '+m.tasa_por_alcance_pct+' %':'')
      :'Sin datos')));
    if(p.crm){
      let c='- Resultados comerciales: leads '+p.crm.leads+', agendas '+p.crm.agendas+', agendas calificadas '+p.crm.agendas_calificadas;
      if(p.crm.ventas!=null)c+=', ventas '+p.crm.ventas+', cash '+p.crm.cash+', pendiente '+p.crm.pendiente;
      md.push(c);
    }
  });
  md.push('');
  md.push('## Historias (secuencias por día)');
  if(seqs.length){seqs.forEach(s=>md.push('- '+fd(s.fecha)+': '+s.n+' historia(s), vistas '+s.vistas+', respuestas '+s.respuestas+', compartidos '+s.compartidos+', navegación '+s.navegacion+(s.tasa!=null?', tasa de respuesta '+s.tasa.toFixed(2)+' %':'')+(s.piezaId?' (vinculada a una pieza)':' (sin vincular)')))}
  else md.push('- Sin historias capturadas en el período.');
  md.push('');
  md.push('## Datos para análisis automático');
  md.push('```json');
  md.push(JSON.stringify({
    marca:S.b.name,
    periodo:{desde:r.a,hasta:r.b,dias:dias},
    redes:redes,
    resumen:{publicaciones:L.length,con_metricas:conDatos,tasa_ponderada_pct:st&&st.tasa!=null?+st.tasa.toFixed(2):null},
    hallazgos:hall.map(h=>({titulo:h.titulo,texto:h.texto,evidencia:h.ev||'',confianza:h.conf||'',prueba_sugerida:h.acc||''})),
    piezas:piezas,
    historias:seqs.map(s=>({dia:s.fecha,historias:s.n,vistas:s.vistas,respuestas:s.respuestas,compartidos:s.compartidos,
      navegacion:s.navegacion,tasa_respuesta_pct:s.tasa!=null?+s.tasa.toFixed(2):null,vinculada:!!s.piezaId}))
  },null,1));
  md.push('```');
  return md.join('\n');
}

function fxFichaDescargar(){
  const md=fxFichaIA();
  const nombre='ficha-'+crmSlug(S.b.name)+'-'+fxHoy()+'.md';
  const u=URL.createObjectURL(new Blob([md],{type:'text/markdown;charset=utf-8'}));
  const a=document.createElement('a');a.href=u;a.download=nombre;document.body.appendChild(a);a.click();a.remove();
  fxStatus('Ficha descargada: '+nombre);
}
function fxFichaCopiar(){fxCopy(fxFichaIA(),'Ficha copiada: pégala en Claude o GPT')}

// ===== Guion y copy con Claude (sin API: se copia, se pega en tu chat y se regresa la respuesta) =====
const FX_PERSONA='Eres una estratega de contenido para Instagram profesional, con 5 años de experiencia, que trabaja con marcas de cualquier rubro.';
const FX_FMT_GUION={
  reel:'Duración: entre 60 y 70 segundos. Empieza con un gancho: un problema o una pregunta, en frase corta. Usa pocas palabras, palabras concretas y nada técnico. Háblale directo a la persona, para que se identifique y entienda que el mensaje es para ella. Cierra con una sola acción. Entrega el guion en bloques con el texto a decir.',
  carrusel:'Entre 5 y 7 slides. Usa 5 o 6 para explicar un concepto, un problema o cómo resolverlo. Usa 7 como máximo solo si es un paso a paso. Slide 1 = gancho: un problema o una pregunta, en texto corto. Cada slide central = una idea, con un ejemplo o un paso. Último slide = CTA con una acción concreta. Entrega solo el texto de cada slide. No sugieras imágenes.',
  historia:'Entre 3 y 7 historias. Historia 1 = gancho. Cada historia debe entenderse sola. La última invita a interactuar (encuesta, pregunta o enlace). Incluye al menos una interacción. Entrega solo el texto de cada historia.'
};
const fxTagsDe=s=>String(s||'').match(/#[\p{L}\p{N}_]+/gu)||[];

function fxPromptClaude(){
  const g=k=>(($('#'+k)||{}).value||'').trim();
  const f=E.format||'reel',b=S.b||{};
  const L=[
    FX_PERSONA+' Prepara el contenido de UNA publicación.','',
    'MARCA: '+(b.name||'')+(b.product?' · Producto: '+b.product:'')+(b.publico?' · Público: '+b.publico:'')+(b.voz?' · Voz: '+b.voz:''),
    'Hashtag ancla de la marca (siempre el primero del copy): '+(b.hashtags||'no configurado'),'',
    'PUBLICACIÓN',
    '- Formato: '+((FMT[f]||{}).n||f),
    '- Fecha: '+(g('f_date')||'sin fecha')+(g('f_hora')?' '+g('f_hora'):''),
    '- Tema: '+(g('f_tema')||'—'),
    '- Idea: '+(g('f_idea')||'—'),
    '- Ángulo: '+(g('f_ang')||'—'),
    '- Hook: '+(g('f_hook')||'—')+(g('f_tg')?' (tipo de gancho: '+g('f_tg')+')':''),
    '- CTA: '+(g('f_cta')||'—'),
    '- Palabra clave: '+(g('f_key')||'ninguna'),
    '- Enfoque: '+((ENF[E.enfoque]||{}).n||'—')+' · Etapa del embudo: '+((EMB[E.embudo]||{}).n||'—')+' · Pilar: '+(g('f_pilar')||'—')+' · Categoría: '+(g('f_cat')||'—'),
    '- Referencia: '+(g('f_ref')||'—'),
    '- Objetivo: '+(g('f_obj')||'—')
  ];
  if(g('f_gu'))L.push('- Guion o estructura ya escrito (mejóralo): '+g('f_gu'));
  L.push('','REGLAS DEL GUION',FX_FMT_GUION[f]||FX_FMT_GUION.reel,'');
  L.push('REGLAS DEL COPY');
  if(f==='historia'){L.push('Las historias NO llevan copy. Escribe "No aplica" en las secciones COPY y HASHTAGS.')}
  else{L.push(
    '1. Primera línea: la acción con la palabra clave en MAYÚSCULAS. Ejemplo: "Comenta TRADING si quieres que te pase la guía para poder retirar". Si la publicación no tiene palabra clave, esta línea se omite y la primera línea es el gancho.',
    '2. Después, una descripción breve, amigable, como un mensaje escrito a una persona. Usa palabras del tema para que Instagram (SEO) posicione la publicación.',
    '3. Repite EXACTAMENTE la primera línea en una línea aparte.',
    '4. Exactamente 5 hashtags: el primero es "'+(b.hashtags||'el hashtag ancla')+'"; los otros 4 propónlos según el tema. Sin repetir ninguno.');}
  L.push('','FORMATO DE RESPUESTA (usa exactamente estos encabezados):','=== GUION ===','(el guion o la estructura)','=== COPY ===','(el copy; si es historia: No aplica)','=== HASHTAGS ===','(los 5 hashtags; si es historia: No aplica)');
  return L.join('\n')}
function fxPrepararIA(){fxCopy(fxPromptClaude(),'Texto copiado: pégalo en tu chat de Claude')}

function fxParseIA(t){
  const sec=k=>{const m=String(t||'').match(new RegExp('===\\s*'+k+'\\s*===([\\s\\S]*?)(?=\\n===\\s*[A-ZÁÉÍÓÚ]+\\s*===|$)','i'));return m?m[1].trim():''};
  return {guion:sec('GUION'),copy:sec('COPY'),hashtags:sec('HASHTAGS')}}

function fxRevisarIA(){
  const p=fxParseIA(($('#fx_ia').value||''));const out=$('#fx_ia_res');const f=E.format||'reel';const w=[],ok=[];
  if(!p.guion)w.push('No encontré la sección === GUION ===.');
  if(f!=='historia'){
    const kw=($('#f_key').value||'').trim();
    if(!p.copy)w.push('No encontré la sección === COPY ===.');
    const tags=fxTagsDe(p.hashtags&&p.hashtags!=='No aplica'?p.hashtags:p.copy);
    if(tags.length!==5)w.push('Hashtags: '+tags.length+'. Deben ser exactamente 5.');else ok.push('5 hashtags');
    if(new Set(tags.map(x=>x.toLowerCase())).size!==tags.length)w.push('Hay hashtags repetidos.');
    const anc=fxTagsDe((S.b&&S.b.hashtags)||'')[0];
    if(anc&&tags[0]&&tags[0].toLowerCase()!==anc.toLowerCase())w.push('El primer hashtag debe ser el ancla de la marca: '+anc+'.');
    else if(anc&&tags[0])ok.push('ancla primero');
    const lineas=p.copy.split('\n').map(x=>x.trim()).filter(Boolean);
    if(kw){
      const kwU=kw.toUpperCase();
      if(!lineas[0]||!lineas[0].includes(kwU))w.push('La primera línea debe incluir la palabra clave en MAYÚSCULAS ('+kwU+'), por ejemplo: Comenta '+kwU+' si quieres…');else ok.push('palabra clave primero');
      if(lineas[0]&&lineas.filter(l=>l===lineas[0]).length<2)w.push('Repite EXACTAMENTE la primera línea en una línea aparte, antes de los hashtags.');else ok.push('primera línea repetida');
    }
  }
  out.innerHTML=(ok.length?'<p class=fxnote style="color:#4ade80">✓ '+esc(ok.join(' · '))+'</p>':'')+
    (w.length?'<ul style="color:#f87171">'+w.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class=fxnote>Todo correcto.</p>');
  return p}

function fxUsarIA(){
  const p=fxRevisarIA();
  if(!p.guion&&!p.copy)return alert('Pega primero la respuesta de Claude.');
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v};
  const f=E.format||'reel';
  set('f_gu',p.guion);
  if(f!=='historia'){set('f_desc',p.copy);set('f_tags',fxTagsDe(p.hashtags&&p.hashtags!=='No aplica'?p.hashtags:'').join(' '))}
  const d=document.getElementById('f_gu');if(d&&d.closest('details'))d.closest('details').open=true;
  fxStatus('Listo: revisa el texto y pulsa Guardar en la pieza','warn')}

const _editIA=edit;
edit=function(id,date){_editIA(id,date);
  if(FX.rol==='viewer')return;
  const md=document.querySelector('#modal .md');if(!md||md.querySelector('.fx-ia'))return;
  const row=[...md.querySelectorAll('.row')].find(r=>r.querySelector('.gold'));if(!row)return;
  const box=document.createElement('details');box.className='fxsec fx-ia';
  box.innerHTML='<summary>Guion y copy con Claude</summary>'+
    '<p class=fxnote>1) Pulsa «Preparar para Claude»: se copia el texto completo. 2) Pégalo en tu chat de Claude. 3) Copia la respuesta de Claude y pégala abajo.</p>'+
    '<div class=row><button type=button onclick="fxPrepararIA()">Preparar para Claude</button></div>'+
    '<textarea id=fx_ia style="min-height:140px" placeholder="Pega aquí la respuesta de Claude"></textarea>'+
    '<div class=row><button type=button onclick="fxRevisarIA()">Revisar</button><button type=button class=gold onclick="fxUsarIA()">Usar en esta pieza</button></div>'+
    '<div id=fx_ia_res></div>';
  row.parentNode.insertBefore(box,row)};
