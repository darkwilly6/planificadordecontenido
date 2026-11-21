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
