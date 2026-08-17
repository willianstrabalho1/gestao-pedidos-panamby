const KEY="gestor_comercial_v4";
let db=JSON.parse(localStorage.getItem(KEY)||'{"clientes":[],"pedidos":[],"vendas":[],"followups":[],"alertas":[],"metas":{}}');
if(!db.vendas)db.vendas=[];
const $=id=>document.getElementById(id),today=()=>new Date().toISOString().slice(0,10);
const norm=v=>String(v??"").trim().toUpperCase();
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function numBR(v){
 if(typeof v==="number") return v;
 let s=String(v??"").trim();
 if(!s)return 0;
 s=s.replace(/R\$/gi,"").replace(/\s/g,"");
 if(s.includes(",") && s.includes(".")) s=s.replace(/\./g,"").replace(",",".");
 else if(s.includes(",")) s=s.replace(",",".");
 return Number(s.replace(/[^0-9.-]/g,""))||0;
}
function metricValue(s,metric){
 if(metric==="liquido") return Number(s.valorLiquido ?? s.valor ?? 0);
 return Number(s.valorSemImpostos ?? s.valor ?? 0);
}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function save(){localStorage.setItem(KEY,JSON.stringify(db));render()}
function brdate(v){if(!v)return"—";let d=new Date(v+"T12:00:00");return isNaN(d)?esc(v):d.toLocaleDateString("pt-BR")}
function monthNow(){return today().slice(0,7)}
function getClient(id){return db.clientes.find(x=>x.id===id)}
function findClientByCode(code){return db.clientes.find(c=>String(c.codigo)===String(code))}
function reps(){return [...new Set([...db.clientes.map(x=>x.representante),...db.pedidos.map(x=>x.representante),...db.vendas.map(x=>x.representante)].filter(Boolean))].sort()}
function regionFromUF(uf){const m={SP:"Sudeste",RJ:"Sudeste",MG:"Sudeste",ES:"Sudeste",PR:"Sul",SC:"Sul",RS:"Sul",BA:"Nordeste",SE:"Nordeste",AL:"Nordeste",PE:"Nordeste",PB:"Nordeste",RN:"Nordeste",CE:"Nordeste",PI:"Nordeste",MA:"Nordeste",GO:"Centro-Oeste",MT:"Centro-Oeste",MS:"Centro-Oeste",DF:"Centro-Oeste",AM:"Norte",PA:"Norte",AC:"Norte",RO:"Norte",RR:"Norte",AP:"Norte",TO:"Norte"};return m[norm(uf)]||"Não informado"}
function saleRegion(s){return regionFromUF(s.uf||getClient(s.clienteId)?.uf)}
function combinedSales(){
 const fromOrders=db.pedidos.map(p=>({...p,origem:"Pedido importado",clienteId:p.clienteId||findClientByCode(p.codigoCliente)?.id||"",pedido:p.ordem}));
 const manual=db.vendas.map(v=>({...v,origem:"Venda manual"}));
 const map=new Map();
 fromOrders.forEach(x=>map.set("P-"+String(x.ordem||x.id),x));
 manual.forEach(x=>map.set("V-"+String(x.id),x));
 return [...map.values()]
}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav,.tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active");$("title").textContent=b.textContent.replace(/^[^\s]+\s/,"")});
$("date").textContent=new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
$("dashMes").value=$("mesPedido").value=$("mesVenda").value=monthNow();
["buscaCliente","filtroDias"].forEach(id=>$(id).oninput=renderClientes);
["buscaPedido","mesPedido","repPedido"].forEach(id=>$(id).oninput=renderPedidos);
["buscaVenda","mesVenda"].forEach(id=>$(id).oninput=renderVendas);
["dashMes","dashRep","dashRegiao","dashValor"].forEach(id=>$(id).onchange=renderDashboard);

let charts={};
function setChart(id,type,labels,data,label){
 if(charts[id])charts[id].destroy();
 charts[id]=new Chart($(id),{type,data:{labels,datasets:[{label,data,borderWidth:2,tension:.25}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==="pie"},tooltip:{callbacks:{label:c=>`${c.dataset.label||""}: ${money(c.raw)}`}}},scales:type==="pie"?{}:{y:{beginAtZero:true,ticks:{callback:v=>Number(v).toLocaleString("pt-BR")}}}}})
}
function filteredDashboardSales(){
 let mes=$("dashMes").value,rep=$("dashRep").value,reg=$("dashRegiao").value;
 return combinedSales().filter(s=>(!mes||(s.data||"").slice(0,7)===mes)&&(!rep||norm(s.representante)===norm(rep))&&(!reg||saleRegion(s)===reg)&&norm(s.status)!=="CANCELADO")
}
function renderDashboard(){
 let arr=filteredDashboardSales(), metric=$("dashValor").value||"semImpostos";
 let totalSem=arr.reduce((a,b)=>a+metricValue(b,"semImpostos"),0);
 let totalLiq=arr.reduce((a,b)=>a+metricValue(b,"liquido"),0);
 let totalGraf=arr.reduce((a,b)=>a+metricValue(b,metric),0),q=arr.length;
 $("kVendas").textContent=money(totalSem);$("kLiquido").textContent=money(totalLiq);
 $("kPedidos").textContent=q;$("kTicket").textContent=money(q?totalGraf/q:0);
 let regAgg={},repAgg={},cliAgg={},diaAgg={};
 arr.forEach(s=>{
   let val=metricValue(s,metric),r=saleRegion(s);
   regAgg[r]=(regAgg[r]||0)+val;
   let rp=s.representante||"Sem representante";repAgg[rp]=(repAgg[rp]||0)+val;
   let cli=s.cliente||getClient(s.clienteId)?.razao||"Cliente não identificado";cliAgg[cli]=(cliAgg[cli]||0)+val;
   let d=(s.data||"").slice(8,10);if(d)diaAgg[d]=(diaAgg[d]||0)+val
 });
 let regs=Object.entries(regAgg).sort((a,b)=>b[1]-a[1]),rps=Object.entries(repAgg).sort((a,b)=>b[1]-a[1]),cls=Object.entries(cliAgg).sort((a,b)=>b[1]-a[1]);
 $("kRegiao").textContent=regs[0]?.[0]||"—";$("kRegiaoValor").textContent=money(regs[0]?.[1]||0);
 $("kRepLider").textContent=rps[0]?.[0]||"—";$("kRepValor").textContent=money(rps[0]?.[1]||0);
 $("kClientesCompradores").textContent=Object.keys(cliAgg).length;
 $("kAlertas").textContent=db.alertas.filter(a=>!a.done&&a.data<=today()).length;
 $("kFollowups").textContent=db.followups.filter(f=>!f.done).length;
 let label=metric==="liquido"?"Valor líquido":"Sem impostos";
 setChart("chartEvolucao","line",Object.keys(diaAgg).sort((a,b)=>Number(a)-Number(b)),Object.keys(diaAgg).sort((a,b)=>Number(a)-Number(b)).map(k=>diaAgg[k]),label);
 setChart("chartRegiao","bar",regs.map(x=>x[0]),regs.map(x=>x[1]),label);
 setChart("chartRep","bar",rps.slice(0,12).map(x=>x[0]),rps.slice(0,12).map(x=>x[1]),label);
 setChart("chartPizza","pie",regs.map(x=>x[0]),regs.map(x=>x[1]),label);
 $("topClientes").innerHTML=cls.slice(0,10).map((x,i)=>`<div class="rankline"><span>${i+1}. ${esc(x[0])}</span><b>${money(x[1])}</b></div>`).join("")||'<p class="muted">Sem vendas no período.</p>';
 let month=$("dashMes").value;
 $("repRanking").innerHTML=reps().map(rep=>{
   let sold=combinedSales().filter(s=>(s.data||"").slice(0,7)===month&&norm(s.representante)===norm(rep)&&norm(s.status)!=="CANCELADO").reduce((a,b)=>a+metricValue(b,"semImpostos"),0),
   goal=Number(db.metas[rep]||0),pct=goal?Math.min(sold/goal*100,100):0,left=Math.max(goal-sold,0);
   return `<div class="barrow"><div class="barlabel"><b>${esc(rep)}</b><span>${goal?pct.toFixed(1)+"%":"Sem meta"}</span></div><div class="muted">Vendido ${money(sold)} • Falta ${goal?money(left):"—"}</div>${goal?`<div class="bartrack"><div class="barfill" style="width:${pct}%"></div></div>`:""}</div>`
 }).join("")||'<p class="muted">Sem representantes.</p>';
 let aa=db.alertas.filter(a=>!a.done&&a.data<=today()).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,6);
 $("painelAlertas").innerHTML=aa.length?aa.map(alertHtml).join(""):'<p class="muted">Nenhum alerta.</p>';
 let ff=db.followups.filter(f=>!f.done).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,6);
 $("painelFollow").innerHTML=ff.length?ff.map(followHtml).join(""):'<p class="muted">Nenhum follow-up.</p>';
}
function renderClientes(){
 let q=norm($("buscaCliente").value),dias=Number($("filtroDias").value||0);
 let arr=db.clientes.filter(c=>(!q||norm([c.codigo,c.razao,c.cnpj,c.cidade,c.uf,c.responsavel,c.representante,c.tel1,c.tel2].join(" ")).includes(q))&&(!dias||Number(c.dias)>=dias));
 $("clientesList").innerHTML=arr.map(c=>`<div class="client"><div class="clienttop"><div><h3>${esc(c.codigo)} — ${esc(c.razao)}</h3><span class="muted">${esc(c.cidade)}/${esc(c.uf)} • CNPJ ${esc(c.cnpj||"—")}</span></div><b>${Number(c.dias||0)} dias</b></div><div class="tags"><span class="tag">${esc(c.responsavel||"Sem responsável")}</span><span class="tag">${esc(c.representante||"Sem representante")}</span>${Number(c.dias)>=90?'<span class="tag red">+90 dias</span>':''}</div><div class="muted">Última compra: ${brdate(c.ultima)} • ${money(c.valor)}<br>☎ ${esc(c.tel1||"")} ${c.tel2?" | "+esc(c.tel2):""}</div><div class="actions"><button class="followbtn" onclick="openFollow('${c.id}')">📞 Follow-up</button><button class="alertbtn" onclick="openAlert('${c.id}')">🔔 Alerta</button><button class="whatsappbtn" onclick="openWhats('${c.id}')">💬 WhatsApp</button><button onclick="openVenda('${c.id}')">💰 Venda</button></div></div>`).join("")||'<div class="card muted">Nenhum cliente encontrado.</div>'
}
function renderVendas(){
 let q=norm($("buscaVenda").value),mes=$("mesVenda").value;
 let arr=db.vendas.filter(v=>(!mes||(v.data||"").slice(0,7)===mes)&&(!q||norm([v.pedido,v.codigoCliente,v.cliente,v.representante].join(" ")).includes(q))).sort((a,b)=>(b.data||"").localeCompare(a.data||""));
 let total=arr.reduce((a,b)=>a+Number(b.valor||0),0);$("vTotal").textContent=money(total);$("vQtd").textContent=arr.length;$("vTicket").textContent=money(arr.length?total/arr.length:0);
 $("vendasList").innerHTML=arr.map(v=>`<div class="sale"><div class="saletop"><div><h3>${esc(v.codigoCliente||"")} — ${esc(v.cliente||"Cliente")}</h3><span class="muted">${brdate(v.data)} • Pedido ${esc(v.pedido||"—")} • ${esc(v.representante||"Sem representante")}</span></div><b>${money(v.valor)}</b></div><div class="tags"><span class="tag">${esc(v.status||"Venda")}</span></div>${v.obs?`<div class="muted">${esc(v.obs)}</div>`:""}<div class="actions"><button class="deletebtn" onclick="deleteVenda('${v.id}')">Excluir</button></div></div>`).join("")||'<div class="card muted">Nenhuma venda manual registrada.</div>'
}
function renderPedidos(){
 let q=norm($("buscaPedido").value),mes=$("mesPedido").value,rep=$("repPedido").value;
 let arr=db.pedidos.filter(p=>(!mes||(p.data||"").slice(0,7)===mes)&&(!rep||norm(p.representante)===norm(rep))&&(!q||norm([p.ordem,p.codigoCliente,p.cliente,p.representante,p.cidade,p.uf].join(" ")).includes(q)));
 let total=arr.reduce((a,b)=>a+Number(b.valor||0),0);$("pTotal").textContent=money(total);$("pQtd").textContent=arr.length;$("pTicket").textContent=money(arr.length?total/arr.length:0);
 $("pedidosList").innerHTML=arr.sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(p=>`<div class="order"><div class="ordertop"><div><h3>Pedido ${esc(p.ordem||"—")} • ${esc(p.codigoCliente||"")} ${esc(p.cliente||"")}</h3><span class="muted">${brdate(p.data)} • ${esc(p.representante||"Sem representante")} • ${esc(p.cidade||"")}/${esc(p.uf||"")}</span></div><div style="text-align:right"><b>Sem impostos: ${money(p.valorSemImpostos??p.valor)}</b><br><span class="muted">Líquido: ${money(p.valorLiquido??p.valor)}</span></div></div>${p.status?`<div class="tags"><span class="tag">${esc(p.status)}</span></div>`:""}</div>`).join("")||'<div class="card muted">Nenhum pedido.</div>'
}
function fillSelectors(){
 let r=reps(),opts='<option value="">Todos</option>'+r.map(x=>`<option>${esc(x)}</option>`).join("");
 let vals={dashRep:$("dashRep").value,repPedido:$("repPedido").value};$("dashRep").innerHTML=opts;$("dashRep").value=vals.dashRep;$("repPedido").innerHTML=opts;$("repPedido").value=vals.repPedido;
 $("metaRep").innerHTML=r.map(x=>`<option>${esc(x)}</option>`).join("");$("vRepresentante").innerHTML=r.map(x=>`<option>${esc(x)}</option>`).join("");$("fCliente").innerHTML=db.clientes.map(c=>`<option value="${c.id}">${esc(c.codigo)} — ${esc(c.razao)}</option>`).join("")
}
function openVenda(id){
 fillSelectors();$("vData").value=today();$("vPedido").value="";$("vValor").value="";$("vObs").value="";$("vCodigo").value="";$("vClienteNome").value="";$("vClienteId").value="";
 if(id){let c=getClient(id);$("vCodigo").value=c?.codigo||"";buscarClienteVenda()}
 $("vendaModal").classList.add("open")
}
function buscarClienteVenda(){let c=findClientByCode($("vCodigo").value);$("vClienteId").value=c?.id||"";$("vClienteNome").value=c?.razao||"";if(c&&c.representante)$("vRepresentante").value=c.representante}
function saveVenda(){
 let c=findClientByCode($("vCodigo").value);if(!c)return alert("Código do cliente não encontrado.");if(!$("vData").value||!$("vValor").value)return alert("Informe data e valor.");
 db.vendas.push({id:uid(),clienteId:c.id,codigoCliente:c.codigo,cliente:c.razao,representante:$("vRepresentante").value||c.representante||"",data:$("vData").value,pedido:$("vPedido").value.trim(),valor:Number($("vValor").value),status:$("vStatus").value,obs:$("vObs").value.trim(),cidade:c.cidade,uf:c.uf});closeModal("vendaModal");save()
}
function deleteVenda(id){if(confirm("Excluir esta venda?")){db.vendas=db.vendas.filter(v=>v.id!==id);save()}}
function saveMeta(){let rep=$("metaRep").value;if(!rep)return alert("Selecione um representante.");db.metas[rep]=Number($("metaValor").value||0);save()}
function renderMetas(){let month=$("dashMes").value||monthNow();$("metasList").innerHTML=reps().map(rep=>{let sold=combinedSales().filter(s=>(s.data||"").slice(0,7)===month&&norm(s.representante)===norm(rep)&&norm(s.status)!=="CANCELADO").reduce((a,b)=>a+Number(b.valor||0),0),goal=Number(db.metas[rep]||0),left=Math.max(goal-sold,0);return `<div class="card" style="margin-bottom:10px"><b>${esc(rep)}</b><div class="muted">Meta ${money(goal)} • Vendido ${money(sold)} • Falta ${goal?money(left):"Meta não definida"}</div></div>`}).join("")}
function openFollow(id){fillSelectors();if(id)$("fCliente").value=id;$("fData").value=today();$("fTexto").value="";$("followModal").classList.add("open")}
function saveFollow(){if(!$("fCliente").value||!$("fData").value||!$("fTexto").value.trim())return alert("Preencha todos os campos.");db.followups.push({id:uid(),clienteId:$("fCliente").value,data:$("fData").value,texto:$("fTexto").value.trim(),done:false});closeModal("followModal");save()}
function followHtml(f){let c=getClient(f.clienteId);return `<div class="rowitem ${f.done?"done":""}"><b>${esc(c?.codigo||"")} ${esc(c?.razao||"Cliente")}</b><div class="muted">${brdate(f.data)} • ${esc(f.texto)}</div><button onclick="toggleFollow('${f.id}')">${f.done?"Reabrir":"Concluir"}</button></div>`}
function renderFollow(){$("followList").innerHTML=db.followups.sort((a,b)=>a.data.localeCompare(b.data)).map(f=>`<div class="card" style="margin-bottom:10px">${followHtml(f)}</div>`).join("")||'<div class="card muted">Nenhum follow-up.</div>'}
function toggleFollow(id){let x=db.followups.find(x=>x.id===id);if(x)x.done=!x.done;save()}
function openAlert(id){let c=getClient(id);$("aClienteId").value=id;$("aClienteNome").textContent=`${c?.codigo||""} — ${c?.razao||""}`;$("aData").value=today();$("aTexto").value="";$("alertModal").classList.add("open")}
function saveAlert(){if(!$("aData").value||!$("aTexto").value.trim())return alert("Informe data e motivo.");db.alertas.push({id:uid(),clienteId:$("aClienteId").value,data:$("aData").value,texto:$("aTexto").value.trim(),prioridade:$("aPrioridade").value,done:false,notified:false});closeModal("alertModal");save()}
function alertHtml(a){let c=getClient(a.clienteId);return `<div class="rowitem priority-${a.prioridade} ${a.done?"done":""}"><b>🔔 ${esc(c?.codigo||"")} ${esc(c?.razao||"Cliente")}</b><div class="muted">${brdate(a.data)} • ${esc(a.prioridade)} • ${esc(a.texto)}</div><button onclick="toggleAlert('${a.id}')">${a.done?"Reabrir":"Concluir"}</button></div>`}
function renderAlerts(){$("alertList").innerHTML=db.alertas.sort((a,b)=>a.data.localeCompare(b.data)).map(a=>`<div class="card" style="margin-bottom:10px">${alertHtml(a)}</div>`).join("")||'<div class="card muted">Nenhum alerta.</div>'}
function toggleAlert(id){let x=db.alertas.find(x=>x.id===id);if(x)x.done=!x.done;save()}
function closeModal(id){$(id).classList.remove("open")}
function cleanPhone(v){let n=String(v||"").replace(/\D/g,"");if(!n)return"";if(n.startsWith("55")&&n.length>=12)return n;if(n.length===10||n.length===11)return"55"+n;return n}
function openWhats(id){let c=getClient(id),ps=[c?.tel1,c?.tel2].filter(Boolean);if(!ps.length)return alert("Cliente sem telefone.");$("wClienteId").value=id;$("wClienteNome").textContent=`${c.codigo} — ${c.razao}`;$("wTelefone").innerHTML=ps.map((p,i)=>`<option value="${cleanPhone(p)}">Telefone ${i+1}: ${esc(p)}</option>`).join("");$("wModelo").value="follow";aplicarModeloWhats();$("whatsModal").classList.add("open")}
function aplicarModeloWhats(){let m={follow:"Olá! Tudo bem? Estou entrando em contato para dar continuidade ao nosso atendimento comercial. Posso te ajudar em algo hoje?",parado:"Olá! Tudo bem? Percebi que faz um tempo desde a última compra e queria saber se posso ajudar com alguma reposição, novidade ou condição comercial.",catalogo:"Olá! Tudo bem? Temos novidades no catálogo e queria compartilhar algumas opções que podem fazer sentido para sua empresa. Posso te enviar?",pedido:"Olá! Tudo bem? Estou entrando em contato para acompanhar seu pedido/retorno comercial. Se precisar de qualquer informação, estou à disposição.",personalizada:""};$("wMensagem").value=m[$("wModelo").value]||""}
function abrirWhatsApp(){window.open(`https://wa.me/${$("wTelefone").value}?text=${encodeURIComponent($("wMensagem").value)}`,"_blank")}
async function enableNotifications(){if(!("Notification"in window))return alert("Navegador sem suporte.");let p=await Notification.requestPermission();$("notifyBtn").textContent=p==="granted"?"🔔 Notificações ativadas":"🔕 Bloqueadas";checkNotifications()}
function checkNotifications(){if(!("Notification"in window)||Notification.permission!=="granted")return;let changed=false;db.alertas.filter(a=>!a.done&&!a.notified&&a.data<=today()).forEach(a=>{let c=getClient(a.clienteId);new Notification("Follow-up comercial",{body:`${c?.codigo||""} ${c?.razao||"Cliente"} — ${a.texto}`});a.notified=true;changed=true});if(changed)localStorage.setItem(KEY,JSON.stringify(db))}
function excelDate(v){if(v instanceof Date)return v.toISOString().slice(0,10);if(typeof v==="number"){let d=XLSX.SSF.parse_date_code(v);return d?`${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`:""}if(!v)return"";let s=String(v).trim(),m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;let d=new Date(s);return isNaN(d)?"":d.toISOString().slice(0,10)}
function pick(row,names){for(let n of names)for(let k of Object.keys(row))if(norm(k)===norm(n))return row[k];return""}
function importClientes(){let f=$("clientesFile").files[0];if(!f)return alert("Selecione a planilha.");let r=new FileReader();r.onload=e=>{try{let wb=XLSX.read(e.target.result,{type:"array",cellDates:true}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""}),map=new Map(db.clientes.map(c=>[String(c.codigo),c]));rows.forEach(row=>{let codigo=pick(row,["CODIGO CLIENTE","CÓDIGO CLIENTE","CODIGO","CÓDIGO"]);if(codigo==="")return;let old=map.get(String(codigo));map.set(String(codigo),{id:old?.id||uid(),codigo,razao:pick(row,["RAZAO CLIENTE","RAZÃO CLIENTE","CLIENTE","NOME CLIENTE"]),cnpj:pick(row,["CNPJ"]),representante:pick(row,["REPRESENTANTE","VENDEDOR"]),cidade:pick(row,["CIDADE"]),uf:pick(row,["UF","ESTADO"]),ultima:excelDate(pick(row,["ULTIMA COMPRA","ÚLTIMA COMPRA"])),dias:Number(pick(row,["DIAS SEM COMPRAR"])||0),valor:Number(pick(row,["VALOR ULTIMA COMPRA","VALOR ÚLTIMA COMPRA"])||0),responsavel:pick(row,["RESPONSAVEL","RESPONSÁVEL"]),tel1:pick(row,["TELEFONE 1","TELEFONE"]),tel2:pick(row,["TELEFONE 2"])})});db.clientes=[...map.values()];$("clientesMsg").textContent=`${db.clientes.length} clientes disponíveis.`;save()}catch(err){alert(err.message)}};r.readAsArrayBuffer(f)}
function importPedidos(){let f=$("pedidosFile").files[0];if(!f)return alert("Selecione o relatório.");let r=new FileReader();r.onload=e=>{try{let wb=XLSX.read(e.target.result,{type:"array",cellDates:true}),existing=new Map(db.pedidos.map(p=>[String(p.ordem),p])),count=0;wb.SheetNames.forEach(sn=>{let raw=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:""});let headerRow=raw.findIndex(row=>row.some(c=>/ordem|pedido|cliente|representante|valor/i.test(String(c))));if(headerRow<0)return;let headers=raw[headerRow].map(x=>String(x).trim());raw.slice(headerRow+1).forEach(vals=>{let row={};headers.forEach((h,i)=>row[h]=vals[i]);let ordem=pick(row,["ORDEM","PEDIDO","Nº PEDIDO","NUMERO PEDIDO","NÚMERO PEDIDO","ORDEM VENDA"]);if(ordem==="")return;let codigo=pick(row,["CODIGO CLIENTE","CÓDIGO CLIENTE","COD CLIENTE","COD CLIENTE FAT","CÓDIGO"]);let cli=codigo!==""?findClientByCode(codigo):null;let p={id:existing.get(String(ordem))?.id||uid(),ordem,codigoCliente:codigo||cli?.codigo||"",cliente:pick(row,["NOME DO CLIENTE","CLIENTE","RAZAO CLIENTE","RAZÃO SOCIAL","NOME CLIENTE"])||cli?.razao||"",data:excelDate(pick(row,["DIGITAÇÃO","DIGITACAO","DATA","DATA PEDIDO","EMISSÃO","EMISSAO","DATA DIGITAÇÃO"])),representante:pick(row,["REPRESENTANTE","VENDEDOR","REPRESENTANTE COMERCIAL"])||cli?.representante||"",valorSemImpostos:numBR(pick(row,["VR TOTAL (S/IMPOSTOS)","VR TOTAL(S/IMPOSTOS)","VR TOTAL S/IMPOSTOS","VALOR S/IMPOSTOS","VALOR SEM IMPOSTOS"])),
valorLiquido:numBR(pick(row,["VR TOTAL (LIQUIDO)","VR TOTAL (LÍQUIDO)","VR TOTAL(LIQUIDO)","VR TOTAL(LÍQUIDO)","VALOR LÍQUIDO","VALOR LIQUIDO","VLR LIQUIDO","VL LIQUIDO"])),
valor:numBR(pick(row,["VR TOTAL (S/IMPOSTOS)","VR TOTAL(S/IMPOSTOS)","VR TOTAL S/IMPOSTOS","VALOR S/IMPOSTOS","VALOR SEM IMPOSTOS","VALOR","TOTAL"])),cidade:pick(row,["CIDADE"])||cli?.cidade||"",uf:pick(row,["UF","ESTADO"])||cli?.uf||"",status:pick(row,["STATUS","ETAPA","SITUAÇÃO","SITUACAO"]),aba:sn};existing.set(String(ordem),p);count++})});db.pedidos=[...existing.values()];
let tsi=db.pedidos.reduce((a,p)=>a+Number(p.valorSemImpostos??p.valor??0),0);
let tliq=db.pedidos.reduce((a,p)=>a+Number(p.valorLiquido??p.valor??0),0);
$("pedidosMsg").innerHTML=`<b>${count} registros lidos • ${db.pedidos.length} pedidos únicos</b><br>💰 Sem impostos: <b>${money(tsi)}</b> • 🧾 Líquido: <b>${money(tliq)}</b>`;
save()}catch(err){alert("Erro ao importar: "+err.message)}};r.readAsArrayBuffer(f)}
function exportExcel(){let wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.clientes),"Clientes");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.vendas),"Vendas");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.pedidos),"Pedidos");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.followups),"Follow-ups");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.alertas),"Alertas");XLSX.writeFile(wb,"Gestor_Comercial_Completo.xlsx")}
function backupDados(){let blob=new Blob([JSON.stringify({aplicativo:"Gestor Comercial",versao:5,criadoEm:new Date().toISOString(),dados:db},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Backup_Gestor_Comercial_${today()}.json`;a.click()}
function restaurarBackup(e){let f=e.target.files[0];if(!f)return;if(!confirm("Substituir os dados atuais pelo backup?"))return;let r=new FileReader();r.onload=x=>{try{let p=JSON.parse(x.target.result),d=p.dados||p;db={clientes:d.clientes||[],pedidos:d.pedidos||[],vendas:d.vendas||[],followups:d.followups||[],alertas:d.alertas||[],metas:d.metas||{}};save();alert("Backup restaurado.")}catch{alert("Backup inválido.")}};r.readAsText(f)}
function render(){fillSelectors();renderClientes();renderVendas();renderPedidos();renderFollow();renderAlerts();renderMetas();renderDashboard();checkNotifications()}
render();setInterval(checkNotifications,60000);