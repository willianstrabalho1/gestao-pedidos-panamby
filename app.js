const $ = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];
const fmtBRL = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
const fmtDate = v => { if(!v) return '—'; const d=new Date(v+'T12:00:00'); return isNaN(d)?'—':d.toLocaleDateString('pt-BR'); };
const todayISO = ()=> new Date().toISOString().slice(0,10);
const addDays=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const diffDays=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000);
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

function loadState(){
  try{
    const raw=localStorage.getItem('salesflow-crm');
    const parsed=raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed==='object' ? parsed : {records:[],deals:[],activities:[],mappings:{},importedFiles:[]};
  }catch(e){
    console.warn('Falha ao carregar dados locais:',e);
    return {records:[],deals:[],activities:[],mappings:{},importedFiles:[]};
  }
}
const state = loadState();
let currentWorkbook=null, currentHeaders=[], currentRows=[], currentFilename='', currentSheet='';
let chart, calendar;

const aliases = {
  client:['razao cliente','razão cliente','cliente','razao social','razão social','nome cliente','nome do cliente','fantasia','nome fantasia','destinatario','destinatário'],
  clientCode:['codigo cliente','código cliente','cod cliente'],
  date:['ultima compra','última compra','data ultima compra','data última compra','digitação','digitacao','data pedido','dt pedido','emissao','emissão','data emissao','data emissão','data venda','data'],
  value:['vr total (liquido)','vr total (líquido)','vr total (s/impostos)','valor ultima compra','valor última compra','valor total','vl total','valor pedido','faturamento','vlr total','valor'],
  order:['ordem','pedido','nr pedido','n pedido','numero pedido','número pedido'],
  city:['cidade','municipio','município'],
  uf:['uf','estado'],
  seller:['representante','vendedor','rep','consultor'],
  sellerCode:['rep cod','representante'],
  supervisor:['nome do supervisor','supervisor'],
  goal:['meta'],
  achieved:['vr atingido','valor atingido','atingido'],
  daysNoBuy:['dias sem comprar'],
  phone1:['telefone 1','telefone','fone 1','celular'],
  phone2:['telefone 2','fone 2'],
  contact:['responsavel','responsável','contato'],
  cnpj:['cnpj'],
  product:['produto','descricao','descrição','item','nome produto'],
  qty:['quantidade','qtd','qtde'],
  status:['etapa','status','situacao','situação']
};

function save(){
  try{
    localStorage.setItem('salesflow-crm',JSON.stringify(state));
    return true;
  }catch(e){
    console.error('Falha ao salvar:',e);
    toast('Não foi possível salvar no navegador. Verifique se o armazenamento está permitido.');
    return false;
  }
}
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); }
function valueFrom(obj,key){ return obj?.[key] ?? ''; }

function parseNumber(v){
  if(typeof v==='number') return v;
  let s=String(v??'').replace(/\s/g,'').replace(/R\$/gi,'');
  if(s.includes(',') && s.includes('.')) s=s.replace(/\./g,'').replace(',','.');
  else if(s.includes(',')) s=s.replace(',','.');
  return Number(s.replace(/[^\d.-]/g,''))||0;
}
function parseDateValue(v){
  if(!v) return '';
  if(v instanceof Date && !isNaN(v)) return v.toISOString().slice(0,10);
  if(typeof v==='number' && window.XLSX){
    const o=XLSX.SSF.parse_date_code(v); if(o) return `${o.y}-${String(o.m).padStart(2,'0')}-${String(o.d).padStart(2,'0')}`;
  }
  const s=String(v).trim();
  let m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if(m){ let y=m[3].length===2?'20'+m[3]:m[3]; return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; }
  const d=new Date(s); return isNaN(d)?'':d.toISOString().slice(0,10);
}
function autoMap(headers){
  const out={};
  const used=new Set();

  Object.entries(aliases).forEach(([field,list])=>{
    const found=headers.find(h=>{
      if(used.has(h)) return false;
      const nh=norm(h);
      return list.some(a=>nh===norm(a) || nh.includes(norm(a)));
    });

    if(found){
      out[field]=found;
      used.add(found);
    }
  });

  return out;
}
function buildMapping(headers,mapping={}){
  // Mantido apenas por compatibilidade interna.
  // A importação agora é totalmente automática e não exibe tela de mapeamento.
  return mapping;
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

async function readFiles(files){
  if(typeof XLSX==='undefined'){
    toast('O leitor de Excel não carregou. Atualize a página com internet e tente novamente.');
    $('#importMessages').insertAdjacentHTML('beforeend','<div class="import-note" style="background:#fff1f1;color:#a33"><b>Leitor de Excel indisponível.</b> Atualize a página e tente novamente.</div>');
    return;
  }
  for(const file of files){
    currentFilename=file.name;
    const data=await file.arrayBuffer();
    let wb;
    try{
      wb=XLSX.read(data,{type:'array',cellDates:true});
    }catch(e){
      toast('Não consegui ler '+file.name);
      continue;
    }

    currentWorkbook=wb;
    currentSheet=wb.SheetNames[0];
    const ws=wb.Sheets[currentSheet];
    const rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});

    if(!rows.length){
      toast('Planilha sem linhas reconhecíveis: '+file.name);
      continue;
    }

    currentRows=rows;
    currentHeaders=Object.keys(rows[0]);

    const mapping=autoMap(currentHeaders);

    if(!mapping.client){
      $('#importMessages').insertAdjacentHTML(
        'beforeend',
        `<div class="import-note" style="background:#fff1f1;color:#a33"><b>${escapeHtml(file.name)}</b>: não encontrei automaticamente uma coluna de cliente. Renomeie a coluna para algo como CLIENTE, NOME CLIENTE, RAZÃO SOCIAL ou CÓDIGO CLIENTE.</div>`
      );
      continue;
    }

    importRowsAutomatically(rows, mapping, file.name, currentSheet);
  }
}
function importRowsAutomatically(rows, map, filename, sheetname){
  const imported=rows.map((r,i)=>({
    id:uid(), source:filename, sheet:sheetname, row:i+2,
    client:String(valueFrom(r,map.client)||valueFrom(r,map.clientCode)||'').trim(),
    clientCode:String(valueFrom(r,map.clientCode)||'').trim(),
    date:parseDateValue(valueFrom(r,map.date)),
    value:parseNumber(valueFrom(r,map.value)),
    order:String(valueFrom(r,map.order)||'').trim(),
    city:String(valueFrom(r,map.city)||'').trim(),
    uf:String(valueFrom(r,map.uf)||'').trim(),
    seller:String(valueFrom(r,map.seller)||'').trim(),
    sellerCode:String(valueFrom(r,map.sellerCode)||'').trim(),
    supervisor:String(valueFrom(r,map.supervisor)||'').trim(),
    goal:parseNumber(valueFrom(r,map.goal)),
    achieved:parseNumber(valueFrom(r,map.achieved)),
    daysNoBuy:parseNumber(valueFrom(r,map.daysNoBuy)),
    phone1:String(valueFrom(r,map.phone1)||'').trim(),
    phone2:String(valueFrom(r,map.phone2)||'').trim(),
    contact:String(valueFrom(r,map.contact)||'').trim(),
    cnpj:String(valueFrom(r,map.cnpj)||'').trim(),
    product:String(valueFrom(r,map.product)||'').trim(),
    qty:parseNumber(valueFrom(r,map.qty)),
    status:String(valueFrom(r,map.status)||'').trim(),
    raw:r
  })).filter(r=>r.client);

  state.records=state.records.filter(r=>r.source!==filename).concat(imported);
  state.mappings[filename]=map;
  if(!state.importedFiles.includes(filename)) state.importedFiles.push(filename);
  save(); autoCreateDeals(imported); renderAll();

  $('#importMessages').insertAdjacentHTML('beforeend',
    `<div class="import-note"><b>${escapeHtml(filename)}</b>: ${imported.length} registros integrados automaticamente ao CRM.</div>`);
  toast(`${imported.length} registros integrados.`);
}
function autoCreateDeals(rows){
  const salesRows=rows.filter(r=>r.order || ['EM ANÁLISE','AUTORIZADO','FATURADO'].includes(String(r.status).toUpperCase()));
  const groups={};
  salesRows.forEach(r=>{
    const key=r.client+'|'+(r.order||r.date||r.id);
    groups[key]??={client:r.client,title:r.order?`Ordem ${r.order}`:'Oportunidade importada',value:0,date:r.date,status:r.status};
    groups[key].value+=r.value||0;
  });
  Object.values(groups).slice(0,1000).forEach(g=>{
    const ik=g.client+'|'+g.title;
    const existing=state.deals.find(d=>d.importKey===ik);
    if(existing){ existing.value=g.value; existing.stage=stageFromStatus(g.status); }
    else state.deals.push({id:uid(),importKey:ik,client:g.client,title:g.title,value:g.value,stage:stageFromStatus(g.status),followup:'',created:g.date||todayISO()});
  });
  save();
}
function stageFromStatus(s){
  const n=norm(s);
  if(n.includes('fatur')||n.includes('fech')||n.includes('ganh')) return 'Fechado';
  if(n.includes('autoriz')) return 'Negociação';
  if(n.includes('analise')) return 'Proposta';
  if(n.includes('contat')) return 'Contato feito';
  return 'Qualificado';
}
function clientStats(){
  const m={};
  state.records.forEach(r=>{
    const key = r.clientCode ? 'cod:'+r.clientCode : 'name:'+norm(r.client);
    if(!key)return;
    m[key]??={name:r.client,clientCode:r.clientCode,city:r.city,uf:r.uf,records:[],total:0,phone1:r.phone1,phone2:r.phone2,contact:r.contact,cnpj:r.cnpj,seller:r.seller,daysNoBuy:r.daysNoBuy};
    const c=m[key];
    c.records.push(r);
    c.total+=r.value||0;
    ['city','uf','phone1','phone2','contact','cnpj','seller','clientCode'].forEach(k=>{if(r[k])c[k]=r[k]});
    if(r.daysNoBuy)c.daysNoBuy=r.daysNoBuy;
  });
  return Object.values(m).map(c=>{
    const dates=c.records.map(r=>r.date).filter(Boolean).sort();
    c.last=dates.at(-1)||''; c.first=dates[0]||''; c.avg=c.total/c.records.length;
    const uniq=[...new Set(dates)];
    let gaps=[];for(let i=1;i<uniq.length;i++)gaps.push(Math.max(1,diffDays(uniq[i-1],uniq[i])));
    c.cycle=gaps.length?Math.round(gaps.reduce((a,b)=>a+b,0)/gaps.length):30;
    c.next=c.last?addDays(c.last,c.cycle):'';
    return c;
  });
}
function reorderClients(){
  const lead=Number($('#reorderLeadDays')?.value||7), today=todayISO();
  return clientStats().filter(c=>c.next && diffDays(today,c.next)<=lead).sort((a,b)=>a.next.localeCompare(b.next));
}
function pendingTasks(){
  const tasks=state.activities.filter(a=>!a.done).map(a=>({...a,kind:'activity'}));
  state.deals.filter(d=>d.followup).forEach(d=>tasks.push({id:'deal-'+d.id,client:d.client,type:'Follow-up',date:d.followup,time:'09:00',note:d.title,done:false,kind:'deal'}));
  return tasks.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
function renderAll(){
  renderKPIs();renderDashboard();renderPipeline();renderClients();renderFollowups();renderReorder();renderCalendar();
}
function renderKPIs(){
  const revenue=state.records.reduce((a,r)=>a+(r.value||0),0), clients=clientStats(), tasks=pendingTasks(), reorder=reorderClients();
  $('#kpiRevenue').textContent=fmtBRL(revenue);$('#kpiOrders').textContent=`${state.records.length} registros`;
  $('#kpiClients').textContent=clients.length;$('#kpiFollowups').textContent=tasks.filter(t=>!t.done).length;$('#kpiReorder').textContent=reorder.length;
  $('#followupBadge').textContent=tasks.filter(t=>!t.done).length;$('#reorderBadge').textContent=reorder.length;
}
function renderDashboard(){
  const tasks=pendingTasks().slice(0,6), stats=clientStats();
  $('#upcomingList').innerHTML=tasks.length?tasks.map(t=>`<div class="activity"><div class="datebox">${fmtDate(t.date).slice(0,5)}</div><div><strong>${escapeHtml(t.client)} • ${escapeHtml(t.type)}</strong><small>${escapeHtml(t.note||'Sem observação')}</small></div></div>`).join(''):'<p class="muted">Nenhuma atividade agendada.</p>';
  const attention=[...stats].sort((a,b)=>(a.next||'9999').localeCompare(b.next||'9999')).slice(0,8);
  $('#attentionTable').innerHTML=attention.map(c=>{
    const days=c.next?diffDays(todayISO(),c.next):999, cls=days<0?'red':days<=7?'orange':'green', txt=days<0?'Reposição atrasada':days<=7?'Reposição próxima':'Em dia';
    return `<tr><td><b>${escapeHtml(c.name)}</b><br><small>${escapeHtml([c.city,c.uf].filter(Boolean).join('/'))}</small></td><td>${fmtDate(c.last)}</td><td>${fmtBRL(c.total)}</td><td><span class="pill ${cls}">${txt}</span></td><td><button class="mini-btn" onclick="scheduleFor('${encodeURIComponent(c.name)}','Reposição')">Agendar</button></td></tr>`;
  }).join('');
  const stages=['Qualificado','Contato feito','Proposta','Negociação','Fechado'];
  const counts=stages.map(s=>state.deals.filter(d=>d.stage===s).length);
  if(chart && typeof chart.destroy==='function') chart.destroy();
  const ctx=$('#funnelChart');
  if(ctx && typeof Chart!=='undefined'){
    chart=new Chart(ctx,{
      type:'bar',
      data:{labels:stages,datasets:[{label:'Negócios',data:counts,backgroundColor:['#7f67b3','#6e54a9','#5e439f','#4c328f','#1fa86a'],borderRadius:7}]},
      options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}},x:{grid:{display:false}}}}
    });
  }else if(ctx){
    const parent=ctx.parentElement;
    ctx.style.display='none';
    let fallback=parent.querySelector('.chart-fallback');
    if(!fallback){ fallback=document.createElement('div'); fallback.className='chart-fallback'; parent.appendChild(fallback); }
    fallback.innerHTML=stages.map((s,i)=>`<div class="fallback-bar"><span>${s}</span><b>${counts[i]}</b><i style="width:${Math.max(8,counts[i]*12)}px"></i></div>`).join('');
  }
}
function renderPipeline(){
  const stages=['Qualificado','Contato feito','Proposta','Negociação','Fechado'];
  $('#kanban').innerHTML=stages.map(stage=>{
    const ds=state.deals.filter(d=>d.stage===stage), total=ds.reduce((a,d)=>a+(d.value||0),0);
    return `<div class="kanban-col" data-stage="${stage}"><div class="kanban-head"><span>${stage}<br><small>${fmtBRL(total)}</small></span><b>${ds.length}</b></div>${ds.map(dealCard).join('')}</div>`;
  }).join('');
  $('#pipelineSummary').textContent=`${state.deals.length} negócios • ${fmtBRL(state.deals.reduce((a,d)=>a+(d.value||0),0))}`;
  $('#pipelineTable').innerHTML=state.deals.map(d=>`<tr><td>${escapeHtml(d.client)}</td><td>${escapeHtml(d.title)}</td><td>${fmtBRL(d.value)}</td><td>${escapeHtml(d.stage)}</td><td>${fmtDate(d.followup)}</td></tr>`).join('');
  $$('.deal-card').forEach(card=>{
    card.draggable=true;card.ondragstart=e=>e.dataTransfer.setData('text/plain',card.dataset.id);
  });
  $$('.kanban-col').forEach(col=>{
    col.ondragover=e=>e.preventDefault();
    col.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');const d=state.deals.find(x=>x.id===id);if(d){d.stage=col.dataset.stage;save();renderAll();}};
  });
}
function dealCard(d){return `<div class="deal-card" data-id="${d.id}"><h4>${escapeHtml(d.title||'Negócio')}</h4><p>${escapeHtml(d.client)}</p><strong>${fmtBRL(d.value)}</strong><div class="card-foot"><span class="pill ${d.stage==='Fechado'?'green':''}">${fmtDate(d.followup)||'—'}</span><button class="mini-btn" onclick="scheduleFor('${encodeURIComponent(d.client)}','Follow-up')">+ ação</button></div></div>`}
function renderClients(){
  const q=norm($('#globalSearch').value), rows=clientStats().filter(c=>!q||norm(c.name+' '+c.city+' '+c.uf).includes(q)).sort((a,b)=>b.total-a.total);
  $('#clientsTable').innerHTML=rows.map(c=>`<tr><td><b>${escapeHtml(c.name)}</b></td><td>${escapeHtml([c.city,c.uf].filter(Boolean).join('/'))}</td><td>${fmtDate(c.last)}</td><td>${c.records.length}</td><td>${fmtBRL(c.total)}</td><td>${fmtBRL(c.avg)}</td><td><button class="mini-btn" onclick="scheduleFor('${encodeURIComponent(c.name)}','Follow-up')">Follow-up</button></td></tr>`).join('');
}
function renderFollowups(){
  const tasks=pendingTasks();
  $('#followupsList').innerHTML=tasks.length?tasks.map(t=>`<div class="task ${t.done?'done':''}"><input type="checkbox" ${t.done?'checked':''} onchange="toggleTask('${t.id}',this.checked)"><div><strong>${escapeHtml(t.client)} • ${escapeHtml(t.type)}</strong><div class="muted">${fmtDate(t.date)} ${t.time||''} — ${escapeHtml(t.note||'')}</div></div><span class="pill ${t.date<todayISO()?'red':t.date===todayISO()?'orange':'green'}">${t.date<todayISO()?'Atrasado':t.date===todayISO()?'Hoje':'Agendado'}</span></div>`).join(''):'<p class="muted">Nenhum follow-up pendente.</p>';
}
window.toggleTask=(id,done)=>{ if(id.startsWith('deal-')){const d=state.deals.find(x=>'deal-'+x.id===id);if(d&&done)d.followup='';}else{const a=state.activities.find(x=>x.id===id);if(a)a.done=done;}save();renderAll(); };
function renderReorder(){
  const rows=reorderClients(), today=todayISO();
  $('#reorderTable').innerHTML=rows.map(c=>{const days=diffDays(today,c.next),p=days<0?'Atrasado':days<=3?'Alta':days<=7?'Média':'Planejada',cls=days<0?'red':days<=7?'orange':'green';return `<tr><td><b>${escapeHtml(c.name)}</b></td><td>${fmtDate(c.last)}</td><td>${c.cycle} dias</td><td>${fmtDate(c.next)}</td><td><span class="pill ${cls}">${p}</span></td><td><button class="mini-btn" onclick="scheduleFor('${encodeURIComponent(c.name)}','Reposição','${c.next}')">Agendar contato</button></td></tr>`}).join('');
}
function renderCalendar(){
  const el=$('#calendar'); if(!el)return;
  const events=pendingTasks().map(t=>({id:t.id,title:`${t.type}: ${t.client}`,start:t.date+(t.time?`T${t.time}`:''),allDay:!t.time}));

  if(typeof FullCalendar==='undefined'){
    el.innerHTML=`<div class="calendar-fallback"><h3>Agenda comercial</h3>${
      events.length ? events.map(e=>`<div class="fallback-event"><b>${fmtDate(e.start.slice(0,10))}</b><span>${escapeHtml(e.title)}</span></div>`).join('')
      : '<p class="muted">Nenhuma atividade agendada.</p>'
    }</div>`;
    return;
  }

  if(calendar && typeof calendar.removeAllEvents==='function'){
    calendar.removeAllEvents();
    events.forEach(e=>calendar.addEvent(e));
    return;
  }

  calendar=new FullCalendar.Calendar(el,{
    initialView:'dayGridMonth',
    locale:'pt-br',
    height:'auto',
    buttonText:{today:'Hoje'},
    events,
    dateClick:info=>{showView('calendario');$('#activityDate').value=info.dateStr;}
  });
  calendar.render();
}
window.scheduleFor=(name,type,date='')=>{showView('calendario');$('#activityClient').value=decodeURIComponent(name);$('#activityType').value=type;$('#activityDate').value=date||todayISO();setTimeout(()=>$('#activityNote').focus(),50);}
function showView(name){
  $$('.view').forEach(v=>v.classList.remove('active')); $(`#view-${name}`).classList.add('active');
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  const titles={dashboard:['Dashboard Comercial','Visão geral das vendas, clientes e próximos passos.'],pipeline:['Funil de Vendas','Acompanhe oportunidades e avance os negócios pelo processo comercial.'],clientes:['Clientes','Histórico de compra, potencial e próxima ação.'],calendario:['Calendário Comercial','Centralize compromissos, follow-ups e pontos de reposição.'],followups:['Follow-ups','Nada de cliente esquecido: veja os contatos que precisam acontecer.'],reposicao:['Ponto de Reposição','Antecipe a próxima compra com base no ciclo de cada cliente.'],importar:['Importar Planilhas','Arraste sua planilha e transforme os dados em um CRM navegável.']};
  $('#pageTitle').textContent=titles[name][0];$('#pageSubtitle').textContent=titles[name][1];
  if(name==='calendario')setTimeout(()=>{ if(calendar&&typeof calendar.updateSize==='function') calendar.updateSize(); },80);
}
$$('.nav-btn').forEach(b=>b.onclick=()=>showView(b.dataset.view));
$$('[data-go]').forEach(b=>b.onclick=()=>showView(b.dataset.go));
$('#selectFileBtn').onclick=()=>$('#fileInput').click();
$('#fileInput').onchange=e=>readFiles(e.target.files);
const dz=$('#dropzone'); dz.onclick=e=>{if(e.target.id!=='selectFileBtn')$('#fileInput').click()};dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag')};dz.ondragleave=()=>dz.classList.remove('drag');dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');readFiles(e.dataTransfer.files)};
$('#activityForm').onsubmit=e=>{
  e.preventDefault();
  const client=$('#activityClient').value.trim();
  const date=$('#activityDate').value;
  if(!client || !date){ toast('Informe cliente e data.'); return; }

  state.activities.push({
    id:uid(),client,type:$('#activityType').value,date,
    time:$('#activityTime').value,note:$('#activityNote').value.trim(),done:false
  });

  if(!save()) return;

  e.target.reset();
  $('#activityDate').value=todayISO();
  $('#activityTime').value='09:00';
  renderAll();
  showView('followups');
  toast('Atividade salva com sucesso.');
};
$('#reorderLeadDays').oninput=()=>renderAll();
$('#globalSearch').oninput=()=>renderClients();
$('#newDealBtn').onclick=()=>{$('#dealDialog').showModal();$('#dealClient').focus()};
$('#saveDealBtn').onclick=e=>{
  e.preventDefault();
  const client=$('#dealClient').value.trim();
  if(!client){ toast('Informe o cliente.'); return; }

  state.deals.push({
    id:uid(),client,
    title:$('#dealTitle').value.trim()||'Nova oportunidade',
    value:Number($('#dealValue').value||0),
    stage:$('#dealStage').value,
    followup:$('#dealFollowup').value,
    created:todayISO()
  });

  if(!save()) return;

  $('#dealDialog').close();
  $('#dealForm').reset();
  renderAll();
  showView('pipeline');
  toast('Negócio salvo com sucesso.');
};
$('#pipelineListToggle').onclick=()=>{$('#kanban').classList.toggle('hidden');$('#pipelineTableWrap').classList.toggle('hidden');$('#pipelineListToggle').classList.toggle('active')};
$('#notifyBtn').onclick=async()=>{if(!('Notification'in window)){toast('Seu navegador não suporta notificações.');return;}const p=await Notification.requestPermission();toast(p==='granted'?'Alertas do navegador ativados.':'Permissão de alerta não concedida.');};
$('#exportClientsBtn').onclick=()=>{const rows=clientStats();const csv=['Cliente,Cidade,UF,Ultima compra,Compras,Total,Ticket medio',...rows.map(c=>[c.name,c.city,c.uf,c.last,c.records.length,c.total,c.avg].map(v=>`"${String(v).replaceAll('"','""')}"`).join(','))].join('\n');const blob=new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='clientes_crm.csv';a.click();URL.revokeObjectURL(a.href);};
function notifyDue(){
  if(Notification.permission!=='granted')return;
  const due=pendingTasks().filter(t=>t.date<=todayISO()).slice(0,5);
  if(due.length)new Notification('SalesFlow CRM',{body:`Você tem ${due.length} follow-up(s) pendente(s) ou vencendo hoje.`});
}
function initializeApp(){
  $('#activityDate').value=todayISO();
  try{
    renderAll();
  }catch(err){
    console.error('Falha de renderização:',err);
    toast('O CRM abriu em modo seguro. As funções de navegação e salvamento continuam disponíveis.');
  }
  setTimeout(notifyDue,1200);
}
initializeApp();
