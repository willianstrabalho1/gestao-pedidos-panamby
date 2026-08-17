const KEY="gestor_comercial_v4";
let db=JSON.parse(localStorage.getItem(KEY)||'{"clientes":[],"pedidos":[],"followups":[],"alertas":[],"metas":{}}');
const $=id=>document.getElementById(id), today=()=>new Date().toISOString().slice(0,10);
function save(){localStorage.setItem(KEY,JSON.stringify(db));render()}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function norm(v){return String(v??"").trim().toUpperCase()}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function brdate(v){if(!v)return"—";let d=new Date(v+"T12:00:00");return isNaN(d)?esc(v):d.toLocaleDateString("pt-BR")}
function monthNow(){return today().slice(0,7)}
function pedidoMonth(p){return (p.data||"").slice(0,7)}
function getClient(id){return db.clientes.find(x=>x.id===id)}
function findClientByCode(code){return db.clientes.find(c=>String(c.codigo)===String(code))}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav,.tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active");$("title").textContent=b.textContent.replace(/^[^\s]+\s/,"")});
$("date").textContent=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
$("mesPedido").value=monthNow();
["buscaCliente","filtroDias"].forEach(id=>$(id).oninput=renderClientes);
["buscaPedido","mesPedido","repPedido"].forEach(id=>$(id).oninput=renderPedidos);

function representatives(){
 return [...new Set([...db.clientes.map(x=>x.representante),...db.pedidos.map(x=>x.representante)].filter(Boolean))].sort();
}
function currentMonthOrders(){return db.pedidos.filter(p=>pedidoMonth(p)===monthNow())}
function regionOf(p){
 let uf=norm(p.uf || getClient(p.clienteId)?.uf);
 const map={SP:"Sudeste",RJ:"Sudeste",MG:"Sudeste",ES:"Sudeste",PR:"Sul",SC:"Sul",RS:"Sul",BA:"Nordeste",SE:"Nordeste",AL:"Nordeste",PE:"Nordeste",PB:"Nordeste",RN:"Nordeste",CE:"Nordeste",PI:"Nordeste",MA:"Nordeste",GO:"Centro-Oeste",MT:"Centro-Oeste",MS:"Centro-Oeste",DF:"Centro-Oeste",AM:"Norte",PA:"Norte",AC:"Norte",RO:"Norte",RR:"Norte",AP:"Norte",TO:"Norte"};
 return map[uf]||"Não informado";
}
function render(){
 renderClientes(); renderPedidos(); renderFollow(); renderAlerts(); renderMetas(); fillSelectors(); renderDashboard(); checkNotifications();
}
function renderDashboard(){
 const orders=currentMonthOrders(), total=orders.reduce((s,p)=>s+Number(p.valor||0),0);
 $("kVendas").textContent=money(total); $("kPedidos").textContent=orders.length;
 $("kAlertas").textContent=db.alertas.filter(a=>!a.done&&a.data<=today()).length;
 const regions={};orders.forEach(p=>{let r=regionOf(p);regions[r]=(regions[r]||0)+Number(p.valor||0)});
 const sorted=Object.entries(regions).sort((a,b)=>b[1]-a[1]); $("kRegiao").textContent=sorted[0]?.[0]||"—";
 let max=sorted[0]?.[1]||1;
 $("regiaoRanking").innerHTML=sorted.length?sorted.map(([r,v])=>`<div class="barrow"><div class="barlabel"><b>${esc(r)}</b><span>${money(v)}</span></div><div class="bartrack"><div class="barfill" style="width:${Math.max(3,v/max*100)}%"></div></div></div>`).join(""):'<p class="muted">Importe pedidos para visualizar as regiões.</p>';
 const reps=representatives();
 $("repRanking").innerHTML=reps.length?reps.map(rep=>{
   let sold=orders.filter(p=>norm(p.representante)===norm(rep)).reduce((s,p)=>s+Number(p.valor||0),0);
   let goal=Number(db.metas[rep]||0), left=Math.max(goal-sold,0), pct=goal?Math.min(sold/goal*100,100):0;
   return `<div class="rep-card"><div class="barlabel"><b>${esc(rep)}</b><span>${goal?`${pct.toFixed(1)}%`:"Sem meta"}</span></div><div class="muted">Vendido: ${money(sold)} • Falta: ${goal?money(left):"Defina a meta"}</div>${goal?`<div class="bartrack" style="margin-top:7px"><div class="barfill" style="width:${pct}%"></div></div>`:""}</div>`;
 }).join(""):'<p class="muted">Nenhum representante encontrado.</p>';
 const aa=db.alertas.filter(a=>!a.done&&a.data<=today()).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,6);
 $("painelAlertas").innerHTML=aa.length?aa.map(alertHtml).join(""):'<p class="muted">Nenhum alerta para hoje.</p>';
 const ff=db.followups.filter(f=>!f.done).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,6);
 $("painelFollow").innerHTML=ff.length?ff.map(followHtml).join(""):'<p class="muted">Nenhum follow-up pendente.</p>';
}
function renderClientes(){
 let q=norm($("buscaCliente").value),dias=Number($("filtroDias").value||0);
 let arr=db.clientes.filter(c=>(!q||norm([c.codigo,c.razao,c.cnpj,c.cidade,c.uf,c.responsavel,c.representante,c.tel1,c.tel2].join(" ")).includes(q))&&(!dias||Number(c.dias)>=dias));
 $("clientesList").innerHTML=arr.map(c=>`<div class="client"><div class="clienttop"><div><h3>${esc(c.codigo)} — ${esc(c.razao)}</h3><span class="muted">${esc(c.cidade)}/${esc(c.uf)} • CNPJ ${esc(c.cnpj||"—")}</span></div><b>${Number(c.dias||0)} dias</b></div><div class="tags"><span class="tag">${esc(c.responsavel||"Sem responsável")}</span><span class="tag">${esc(c.representante||"Sem representante")}</span>${Number(c.dias)>=90?'<span class="tag red">+90 dias</span>':''}</div><div class="muted">Última compra: ${brdate(c.ultima)} • ${money(c.valor)}<br>☎ ${esc(c.tel1||"")} ${c.tel2?" | "+esc(c.tel2):""}</div><div class="actions"><button class="followbtn" onclick="openFollow('${c.id}')">📞 Follow-up</button><button class="alertbtn" onclick="openAlert('${c.id}')">🔔 Alerta</button></div></div>`).join("")||'<div class="card muted">Nenhum cliente encontrado.</div>';
}
function renderPedidos(){
 let q=norm($("buscaPedido").value),mes=$("mesPedido").value,rep=$("repPedido").value;
 let arr=db.pedidos.filter(p=>(!mes||pedidoMonth(p)===mes)&&(!rep||norm(p.representante)===norm(rep))&&(!q||norm([p.ordem,p.codigoCliente,p.cliente,p.representante,p.cidade,p.uf].join(" ")).includes(q)));
 let total=arr.reduce((s,p)=>s+Number(p.valor||0),0);$("pTotal").textContent=money(total);$("pQtd").textContent=arr.length;$("pTicket").textContent=money(arr.length?total/arr.length:0);
 arr.sort((a,b)=>(b.data||"").localeCompare(a.data||""));
 $("pedidosList").innerHTML=arr.map(p=>`<div class="order"><div class="ordertop"><div><h3>Pedido ${esc(p.ordem||"—")} • ${esc(p.codigoCliente||"")} ${esc(p.cliente||"")}</h3><span class="muted">${brdate(p.data)} • ${esc(p.representante||"Sem representante")} • ${esc(p.cidade||"")}/${esc(p.uf||"")}</span></div><b>${money(p.valor)}</b></div>${p.status?`<div class="tags"><span class="tag">${esc(p.status)}</span></div>`:""}</div>`).join("")||'<div class="card muted">Nenhum pedido encontrado para este filtro.</div>';
}
function followHtml(f){let c=getClient(f.clienteId);return `<div class="rowitem ${f.done?"done":""}"><b>${esc(c?.codigo||"")} ${esc(c?.razao||"Cliente")}</b><div class="muted">${brdate(f.data)} • ${esc(f.texto)}</div><button onclick="toggleFollow('${f.id}')">${f.done?"Reabrir":"Concluir"}</button></div>`}
function renderFollow(){$("followList").innerHTML=db.followups.sort((a,b)=>a.data.localeCompare(b.data)).map(f=>`<div class="card" style="margin-bottom:10px">${followHtml(f)}</div>`).join("")||'<div class="card muted">Nenhum follow-up.</div>'}
function alertHtml(a){let c=getClient(a.clienteId);return `<div class="rowitem priority-${a.prioridade} ${a.done?"done":""}"><b>🔔 ${esc(c?.codigo||"")} ${esc(c?.razao||"Cliente")}</b><div class="muted">${brdate(a.data)} • ${esc(a.prioridade)} • ${esc(a.texto)}</div><button onclick="toggleAlert('${a.id}')">${a.done?"Reabrir":"Concluir"}</button></div>`}
function renderAlerts(){$("alertList").innerHTML=db.alertas.sort((a,b)=>a.data.localeCompare(b.data)).map(a=>`<div class="card" style="margin-bottom:10px">${alertHtml(a)}</div>`).join("")||'<div class="card muted">Nenhum alerta.</div>'}
function renderMetas(){
 let reps=representatives(),orders=currentMonthOrders();
 $("metasList").innerHTML=reps.map(rep=>{let sold=orders.filter(p=>norm(p.representante)===norm(rep)).reduce((s,p)=>s+Number(p.valor||0),0),goal=Number(db.metas[rep]||0),left=Math.max(goal-sold,0);return `<div class="card" style="margin-bottom:10px"><b>${esc(rep)}</b><div class="muted">Meta: ${money(goal)} • Vendido: ${money(sold)} • Falta: ${goal?money(left):"Meta não definida"}</div></div>`}).join("")||'<div class="card muted">Importe clientes/pedidos com representantes.</div>';
}
function fillSelectors(){
 let reps=representatives(),opts='<option value="">Todos os representantes</option>'+reps.map(r=>`<option>${esc(r)}</option>`).join("");let cur=$("repPedido").value;$("repPedido").innerHTML=opts;$("repPedido").value=cur;
 $("metaRep").innerHTML=reps.map(r=>`<option>${esc(r)}</option>`).join("");
 $("fCliente").innerHTML=db.clientes.map(c=>`<option value="${c.id}">${esc(c.codigo)} — ${esc(c.razao)}</option>`).join("");
}
function saveMeta(){let rep=$("metaRep").value;if(!rep)return alert("Selecione um representante.");db.metas[rep]=Number($("metaValor").value||0);save()}
function openFollow(id){fillSelectors();if(id)$("fCliente").value=id;$("fData").value=today();$("fTexto").value="";$("followModal").classList.add("open")}
function saveFollow(){if(!$("fCliente").value||!$("fData").value||!$("fTexto").value.trim())return alert("Preencha todos os campos.");db.followups.push({id:uid(),clienteId:$("fCliente").value,data:$("fData").value,texto:$("fTexto").value.trim(),done:false});closeModal("followModal");save()}
function openAlert(id){let c=getClient(id);$("aClienteId").value=id;$("aClienteNome").textContent=`${c?.codigo||""} — ${c?.razao||""}`;$("aData").value=today();$("aTexto").value="";$("alertModal").classList.add("open")}
function saveAlert(){if(!$("aData").value||!$("aTexto").value.trim())return alert("Informe data e motivo.");db.alertas.push({id:uid(),clienteId:$("aClienteId").value,data:$("aData").value,texto:$("aTexto").value.trim(),prioridade:$("aPrioridade").value,done:false,notified:false});closeModal("alertModal");save()}
function closeModal(id){$(id).classList.remove("open")}
function toggleFollow(id){let x=db.followups.find(x=>x.id===id);if(x)x.done=!x.done;save()}
function toggleAlert(id){let x=db.alertas.find(x=>x.id===id);if(x)x.done=!x.done;save()}
async function enableNotifications(){
 if(!("Notification" in window))return alert("Este navegador não oferece notificações.");
 let p=await Notification.requestPermission();$("notifyBtn").textContent=p==="granted"?"🔔 Notificações ativadas":"🔕 Notificações bloqueadas";checkNotifications()
}
function checkNotifications(){
 if(!("Notification" in window)||Notification.permission!=="granted")return;
 let changed=false;
 db.alertas.filter(a=>!a.done&&!a.notified&&a.data<=today()).forEach(a=>{let c=getClient(a.clienteId);new Notification("Follow-up comercial",{body:`${c?.codigo||""} ${c?.razao||"Cliente"} — ${a.texto}`});a.notified=true;changed=true});
 if(changed)localStorage.setItem(KEY,JSON.stringify(db));
}
function excelDate(v){
 if(v instanceof Date)return v.toISOString().slice(0,10);
 if(typeof v==="number"){let d=XLSX.SSF.parse_date_code(v);return d?`${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`:""}
 if(!v)return"";let s=String(v).trim(),m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;let d=new Date(s);return isNaN(d)?"":d.toISOString().slice(0,10)
}
function pick(row,names){for(let n of names){for(let k of Object.keys(row)){if(norm(k)===norm(n))return row[k]}}return""}
function importClientes(){
 let f=$("clientesFile").files[0];if(!f)return alert("Selecione a planilha.");
 let r=new FileReader();r.onload=e=>{try{let wb=XLSX.read(e.target.result,{type:"array",cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:""}),map=new Map(db.clientes.map(c=>[String(c.codigo),c]));
 rows.forEach(row=>{let codigo=pick(row,["CODIGO CLIENTE","CÓDIGO CLIENTE","CODIGO","CÓDIGO"]);if(codigo==="")return;let old=map.get(String(codigo));let c={id:old?.id||uid(),codigo,razao:pick(row,["RAZAO CLIENTE","RAZÃO CLIENTE","CLIENTE","NOME CLIENTE"]),cnpj:pick(row,["CNPJ"]),repCod:pick(row,["REP COD","COD REP"]),representante:pick(row,["REPRESENTANTE","VENDEDOR"]),cidade:pick(row,["CIDADE"]),uf:pick(row,["UF","ESTADO"]),ultima:excelDate(pick(row,["ULTIMA COMPRA","ÚLTIMA COMPRA"])),dias:Number(pick(row,["DIAS SEM COMPRAR"])||0),valor:Number(pick(row,["VALOR ULTIMA COMPRA","VALOR ÚLTIMA COMPRA"])||0),responsavel:pick(row,["RESPONSAVEL","RESPONSÁVEL"]),tel1:pick(row,["TELEFONE 1","TELEFONE"]),tel2:pick(row,["TELEFONE 2"])};map.set(String(codigo),c)});
 db.clientes=[...map.values()];$("clientesMsg").textContent=`${rows.length} linhas processadas; ${db.clientes.length} clientes disponíveis.`;save()}catch(err){alert(err.message)}};r.readAsArrayBuffer(f)
}
function importPedidos(){
 let f=$("pedidosFile").files[0];if(!f)return alert("Selecione o relatório de pedidos.");
 let r=new FileReader();r.onload=e=>{try{
  let wb=XLSX.read(e.target.result,{type:"array",cellDates:true}),existing=new Map(db.pedidos.map(p=>[String(p.ordem),p])),count=0;
  wb.SheetNames.forEach(sn=>{let rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:""});rows.forEach(row=>{
   let ordem=pick(row,["ORDEM","PEDIDO","Nº PEDIDO","NUMERO PEDIDO","NÚMERO PEDIDO"]);if(ordem==="")return;
   let codigo=pick(row,["CODIGO CLIENTE","CÓDIGO CLIENTE","COD CLIENTE","CODIGO","CÓDIGO"]);
   let cli=codigo!==""?findClientByCode(codigo):null;
   let nome=pick(row,["NOME DO CLIENTE","CLIENTE","RAZAO CLIENTE","RAZÃO CLIENTE"])||cli?.razao||"";
   let p={id:existing.get(String(ordem))?.id||uid(),ordem,codigoCliente:codigo||cli?.codigo||"",cliente:nome,data:excelDate(pick(row,["DIGITAÇÃO","DIGITACAO","DATA","DATA PEDIDO","EMISSÃO","EMISSAO"])),representante:pick(row,["REPRESENTANTE","VENDEDOR"])||cli?.representante||"",valor:Number(pick(row,["VALOR LÍQUIDO","VALOR LIQUIDO","VALOR","TOTAL","VLR LIQUIDO"])||0),cidade:pick(row,["CIDADE"])||cli?.cidade||"",uf:pick(row,["UF","ESTADO"])||cli?.uf||"",status:pick(row,["STATUS","ETAPA"]),aba:sn};
   existing.set(String(ordem),p);count++;
  })});
  db.pedidos=[...existing.values()];$("pedidosMsg").textContent=`Importação concluída: ${count} registros lidos e ${db.pedidos.length} pedidos únicos no sistema.`;save()
 }catch(err){alert("Não consegui importar os pedidos: "+err.message)}};r.readAsArrayBuffer(f)
}
function exportExcel(){
 let wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.clientes),"Clientes");
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.pedidos),"Pedidos");
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.followups.map(f=>({cliente:getClient(f.clienteId)?.razao,data:f.data,assunto:f.texto,status:f.done?"Concluído":"Pendente"}))),"Follow-ups");
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.alertas.map(a=>({cliente:getClient(a.clienteId)?.razao,data:a.data,prioridade:a.prioridade,motivo:a.texto,status:a.done?"Concluído":"Pendente"}))),"Alertas");
 XLSX.writeFile(wb,"Gestor_Comercial.xlsx")
}
render();
setInterval(checkNotifications,60000);