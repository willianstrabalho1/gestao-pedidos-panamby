console.info("Gestor Comercial Panamby GITHUB FINAL 2026.08.18");
const KEY="gestor_comercial_v9_supervisores_20260818";
let db=JSON.parse(localStorage.getItem(KEY)||'{"clientes":[],"pedidos":[],"vendas":[],"followups":[],"alertas":[],"metas":{}}');
if(!db.vendas)db.vendas=[];if(!db.pedidos)db.pedidos=[];if(!db.clientes)db.clientes=[];if(!db.followups)db.followups=[];if(!db.alertas)db.alertas=[];if(!db.orcamentos)db.orcamentos=[];if(!db.apuracaoMetas)db.apuracaoMetas=[];if(!db.apuracaoLinhas)db.apuracaoLinhas=[];
const $=id=>document.getElementById(id),today=()=>new Date().toISOString().slice(0,10);
const norm=v=>String(v??"").trim().toUpperCase();
function normHeader(v){
 return String(v??"")
   .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
   .toUpperCase()
   .replace(/[^A-Z0-9]+/g," ")
   .replace(/\s+/g," ")
   .trim();
}
function findCol(headers, aliases){
 const hs=headers.map(normHeader);
 for(const alias of aliases){
   const a=normHeader(alias);
   let i=hs.findIndex(h=>h===a);
   if(i>=0)return i;
 }
 for(const alias of aliases){
   const a=normHeader(alias);
   let i=hs.findIndex(h=>h.includes(a) || a.includes(h));
   if(i>=0)return i;
 }
 return -1;
}
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
function setHTML(id,html){const el=$(id);if(el)el.innerHTML=html}
function setText(id,text){const el=$(id);if(el)el.textContent=text}

function appSelfCheck(){
 const required=["dashboard","clientes","vendas","pedidos","orcamentos","followups","alertas","apuracao","excel",
 "clientesList","vendasList","pedidosList","orcamentosList","followList","alertList","apuracaoBody",
 "clientesFile","pedidosFile","apuracaoFile","pedidosMsg","apuracaoMsg"];
 const missing=required.filter(id=>!$(id));
 if(missing.length){
   console.error("Gestor Comercial: elementos ausentes:",missing);
   return false;
 }
 console.info("Gestor Comercial Panamby — verificação OK");
 return true;
}

function save(){localStorage.setItem(KEY,JSON.stringify(db));render()}
function brdate(v){if(!v)return"—";let d=new Date(v+"T12:00:00");return isNaN(d)?esc(v):d.toLocaleDateString("pt-BR")}
function monthNow(){return today().slice(0,7)}
function getClient(id){return db.clientes.find(x=>x.id===id)}
function findClientByCode(code){return db.clientes.find(c=>String(c.codigo)===String(code))}
function reps(){return [...new Set([...db.clientes.map(x=>x.representante),...db.pedidos.map(x=>x.representante),...db.vendas.map(x=>x.representante)].filter(Boolean))].sort()}
function regionFromUF(uf){const m={SP:"Sudeste",RJ:"Sudeste",MG:"Sudeste",ES:"Sudeste",PR:"Sul",SC:"Sul",RS:"Sul",BA:"Nordeste",SE:"Nordeste",AL:"Nordeste",PE:"Nordeste",PB:"Nordeste",RN:"Nordeste",CE:"Nordeste",PI:"Nordeste",MA:"Nordeste",GO:"Centro-Oeste",MT:"Centro-Oeste",MS:"Centro-Oeste",DF:"Centro-Oeste",AM:"Norte",PA:"Norte",AC:"Norte",RO:"Norte",RR:"Norte",AP:"Norte",TO:"Norte"};return m[norm(uf)]||"Não informado"}
function saleRegion(s){return regionFromUF(s.uf||getClient(s.clienteId)?.uf)}
function combinedSales(){
 // O Dashboard considera cada negócio uma única vez.
 // 1) Pedidos importados/criados são a fonte principal.
 const pedidos=db.pedidos.map(p=>({...p,origem:p.origem||"Pedido",clienteId:p.clienteId||findClientByCode(p.codigoCliente)?.id||"",pedido:p.ordem}));

 // 2) Vendas manuais só entram se NÃO estiverem ligadas a um pedido já existente.
 const ordens=new Set(pedidos.map(p=>String(p.ordem||"").trim()).filter(Boolean));
 const vendasAvulsas=db.vendas.filter(v=>{
   if(v.pedidoId) return false;
   const ordem=String(v.ordem||v.pedido||"").trim();
   return !ordem || !ordens.has(ordem);
 }).map(v=>({...v,origem:v.origem||"Venda manual"}));

 return [...pedidos,...vendasAvulsas]
}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav,.tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");const tab=$(b.dataset.tab);if(tab)tab.classList.add("active");setText("title",b.textContent.replace(/^[^\s]+\s/,""))});
setText("date",new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}));
["dashMes","mesPedido","mesVenda"].forEach(id=>{const el=$(id);if(el)el.value=monthNow()});
["buscaCliente","filtroDias"].forEach(id=>{const el=$(id);if(el)el.oninput=renderClientes});
["buscaPedido","mesPedido","repPedido"].forEach(id=>{const el=$(id);if(el)el.oninput=renderPedidos});
["buscaVenda","mesVenda"].forEach(id=>{const el=$(id);if(el)el.oninput=renderVendas});

["buscaOrcamento","statusOrcamento"].forEach(id=>{const el=$(id);if(el)el.oninput=renderOrcamentos});
["buscaApuracao","filtroSupervisor","filtroAtingido"].forEach(id=>{const el=$(id);if(el)el.oninput=renderApuracao});

["dashMes","dashRep","dashRegiao","dashValor"].forEach(id=>{const el=$(id); if(el) el.onchange=renderDashboard});

let charts={};
function setChart(id,type,labels,data,label){
 const canvas=$(id);
 if(!canvas || typeof Chart==="undefined") return;
 if(charts[id]) charts[id].destroy();
 charts[id]=new Chart(canvas,{type,data:{labels,datasets:[{label,data,borderWidth:2,tension:.25}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==="pie"},tooltip:{callbacks:{label:c=>`${c.dataset.label||""}: ${money(c.raw)}`}}},scales:type==="pie"?{}:{y:{beginAtZero:true,ticks:{callback:v=>Number(v).toLocaleString("pt-BR")}}}}})
}
function filteredDashboardSales(){
 let mes=$("dashMes").value,rep=$("dashRep").value,reg=$("dashRegiao").value;
 return combinedSales().filter(s=>(!mes||(s.data||"").slice(0,7)===mes)&&(!rep||norm(s.representante)===norm(rep))&&(!reg||saleRegion(s)===reg)&&norm(s.status)!=="CANCELADO")
}
function renderDashboard(){
 let arr=filteredDashboardSales(), metric=($("dashValor")?.value)||"semImpostos";
 let totalSem=arr.reduce((a,b)=>a+metricValue(b,"semImpostos"),0);
 let totalLiq=arr.reduce((a,b)=>a+metricValue(b,"liquido"),0);
 let totalGraf=arr.reduce((a,b)=>a+metricValue(b,metric),0),q=arr.length;
 if($("kVendas")) $("kVendas").textContent=money(totalSem); if($("kLiquido")) $("kLiquido").textContent=money(totalLiq);
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
 let metasDash=(db.apuracaoMetas||[]).map(x=>{
   let meta=Number(x.meta||0), ating=Number(x.vrAtingido||0), pct=meta?ating/meta*100:0;
   return {...x,pct,falta:Math.max(meta-ating,0)}
 }).sort((a,b)=>b.pct-a.pct);
 $("repRanking").innerHTML=metasDash.slice(0,10).map(x=>`<div class="barrow"><div class="barlabel"><b>${esc(x.representante||"—")}</b><span>${x.pct.toFixed(1)}%</span></div><div class="muted">Meta ${money(x.meta)} • Atingido ${money(x.vrAtingido)} • Falta ${money(x.falta)}</div><div class="bartrack"><div class="barfill" style="width:${Math.min(x.pct,100)}%"></div></div></div>`).join("")||'<p class="muted">Importe a Apuração das Metas.</p>';
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
 let vals={dashRep:$("dashRep")?.value||"",repPedido:$("repPedido")?.value||""};
if($("dashRep")){$("dashRep").innerHTML=opts;$("dashRep").value=vals.dashRep}
if($("repPedido")){$("repPedido").innerHTML=opts;$("repPedido").value=vals.repPedido}
 if($("vRepresentante"))$("vRepresentante").innerHTML=r.map(x=>`<option>${esc(x)}</option>`).join("");if($("orcRep"))$("orcRep").innerHTML=r.map(x=>`<option>${esc(x)}</option>`).join("");if($("fCliente"))$("fCliente").innerHTML=db.clientes.map(c=>`<option value="${c.id}">${esc(c.codigo)} — ${esc(c.razao)}</option>`).join("")
}

function orcNumber(){return "ORC-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-6)}
function openOrcamento(){
 fillSelectors();
 $("orcCodigo").value="";$("orcCliente").value="";$("orcClienteId").value="";
 $("orcValidade").value=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 $("orcDesconto").value=0;$("orcObs").value="";$("orcItens").innerHTML="";
 addOrcItem();recalcOrc();$("orcamentoModal").classList.add("open")
}
function buscarClienteOrcamento(){
 let c=findClientByCode($("orcCodigo").value);
 $("orcClienteId").value=c?.id||"";$("orcCliente").value=c?.razao||"";
 if(c?.representante)$("orcRep").value=c.representante
}
function addOrcItem(desc="",qtd=1,preco=0){
 let tr=document.createElement("tr");
 tr.innerHTML=`<td><input class="desc" value="${esc(desc)}" placeholder="Produto / descrição"></td>
 <td><input class="qtd" type="number" min="0" step="1" value="${qtd}" oninput="recalcOrc()"></td>
 <td><input class="preco" type="number" min="0" step="0.01" value="${preco}" oninput="recalcOrc()"></td>
 <td class="subtotal">${money(qtd*preco)}</td>
 <td><button class="deletebtn" onclick="this.closest('tr').remove();recalcOrc()">×</button></td>`;
 $("orcItens").appendChild(tr);recalcOrc()
}
function collectOrcItens(){
 return [...$("orcItens").querySelectorAll("tr")].map(tr=>({
   descricao:tr.querySelector(".desc").value.trim(),
   qtd:Number(tr.querySelector(".qtd").value||0),
   preco:Number(tr.querySelector(".preco").value||0)
 })).filter(x=>x.descricao&&x.qtd>0)
}
function recalcOrc(){
 let itens=collectOrcItens(),bruto=itens.reduce((s,x)=>s+x.qtd*x.preco,0),desc=Number($("orcDesconto")?.value||0),total=Math.max(bruto-desc,0);
 [...$("orcItens").querySelectorAll("tr")].forEach(tr=>{let q=Number(tr.querySelector(".qtd").value||0),p=Number(tr.querySelector(".preco").value||0);tr.querySelector(".subtotal").textContent=money(q*p)});
 if($("orcTotal"))$("orcTotal").value=money(total)
}
function saveOrcamento(){
 let c=findClientByCode($("orcCodigo").value),itens=collectOrcItens();
 if(!c)return alert("Código do cliente não encontrado.");
 if(!itens.length)return alert("Adicione pelo menos um item.");
 let bruto=itens.reduce((s,x)=>s+x.qtd*x.preco,0),desconto=Number($("orcDesconto").value||0);
 db.orcamentos.push({id:uid(),numero:orcNumber(),data:today(),validade:$("orcValidade").value,clienteId:c.id,codigoCliente:c.codigo,cliente:c.razao,representante:$("orcRep").value||c.representante||"",cidade:c.cidade,uf:c.uf,itens,bruto,desconto,total:Math.max(bruto-desconto,0),observacao:$("orcObs").value.trim(),status:"Em aberto",pedidoGerado:""});
 closeModal("orcamentoModal");save()
}

function confirmarVendaPedido(id){
 let p=db.pedidos.find(x=>x.id===id);if(!p)return;
 if(p.vendaId)return alert("Este pedido já foi confirmado como venda.");
 let o=p.orcamentoId?db.orcamentos.find(x=>x.id===p.orcamentoId):null;
 let valorSem=Number(p.valorSemImpostos??p.valor??0),valorLiq=Number(p.valorLiquido??p.valor??0);
 let venda={
   id:uid(),
   data:today(),
   pedidoId:p.id,
   ordem:p.ordem,
   codigoCliente:p.codigoCliente||"",
   clienteId:p.clienteId||"",
   cliente:p.cliente||"",
   representante:p.representante||"",
   cidade:p.cidade||"",
   uf:p.uf||"",
   valorSemImpostos:valorSem,
   valorLiquido:valorLiq,
   valor:valorSem,
   origem:o?`Orçamento ${o.numero} → Pedido ${p.ordem}`:`Pedido ${p.ordem}`,
   orcamentoId:o?.id||"",
   orcamentoNumero:o?.numero||"",
   itens:p.itens||[]
 };
 db.vendas.push(venda);
 p.vendaId=venda.id;
 p.status="Venda confirmada";
 if(o){
   o.status="Venda concluída";
   o.pedidoGerado=p.ordem;
   o.vendaId=venda.id;
 }
 save();
 alert(`Venda criada com sucesso a partir do pedido ${p.ordem}.`);
}

function renderOrcamentos(){
 let q=norm($("buscaOrcamento")?.value),st=$("statusOrcamento")?.value||"";
 let arr=db.orcamentos.filter(o=>(!st||o.status===st)&&(!q||norm([o.numero,o.codigoCliente,o.cliente,o.representante].join(" ")).includes(q))).sort((a,b)=>(b.data||"").localeCompare(a.data||""));
 $("oQtd").textContent=arr.length;
 $("oAberto").textContent=money(db.orcamentos.filter(o=>o.status==="Em aberto").reduce((s,o)=>s+Number(o.total||0),0));
 $("oConvertidos").textContent=db.orcamentos.filter(o=>o.status==="Virou pedido").length;
 $("orcamentosList").innerHTML=arr.map(o=>`<div class="quote-card"><div class="quote-top"><div><h3>${esc(o.numero)} • ${esc(o.codigoCliente)} — ${esc(o.cliente)}</h3><div class="muted">${brdate(o.data)} • Validade ${brdate(o.validade)} • ${esc(o.representante||"Sem representante")}</div></div><div class="quote-total">${money(o.total)}</div></div>
 <div class="tags"><span class="tag ${o.status==="Aprovado"?"approved":o.status==="Virou pedido"?"converted":""}">${esc(o.status)}</span>${o.pedidoGerado?`<span class="tag">Pedido ${esc(o.pedidoGerado)}</span>`:""}</div>
 <div class="quote-items">${o.itens.map(i=>`${esc(i.descricao)} • ${i.qtd} × ${money(i.preco)}`).join("<br>")}</div>
 <div class="quote-actions">
   ${!["Virou pedido","Venda concluída"].includes(o.status)?`<button onclick="setOrcStatus('${o.id}','Aprovado')">✅ Aprovar</button><button class="primary" onclick="openConverter('${o.id}')">🧾 Virar pedido</button>`:""}
   <button onclick="printOrcamento('${o.id}')">🖨️ Imprimir</button>
   <button class="whatsappbtn" onclick="whatsOrcamento('${o.id}')">💬 WhatsApp</button>
   ${o.status==="Em aberto"?`<button class="deletebtn" onclick="setOrcStatus('${o.id}','Recusado')">Recusado</button>`:""}
 </div></div>`).join("")||'<div class="card muted">Nenhum orçamento cadastrado.</div>'
}
function setOrcStatus(id,status){let o=db.orcamentos.find(x=>x.id===id);if(o){o.status=status;save()}}
function openConverter(id){
 let o=db.orcamentos.find(x=>x.id===id);if(!o)return;
 $("convOrcId").value=id;$("convPedido").value="";$("convData").value=today();$("converterModal").classList.add("open")
}
function converterOrcamento(){
 let o=db.orcamentos.find(x=>x.id===$("convOrcId").value);if(!o)return;
 let numero=$("convPedido").value.trim()||("PED-"+String(Date.now()).slice(-6));
 let existente=db.pedidos.find(p=>String(p.ordem)===String(numero));
 if(existente)return alert("Já existe um pedido com esse número.");
 db.pedidos.push({id:uid(),ordem:numero,codigoCliente:o.codigoCliente,cliente:o.cliente,clienteId:o.clienteId,data:$("convData").value,representante:o.representante,valorSemImpostos:o.total,valorLiquido:o.total,valor:o.total,cidade:o.cidade,uf:o.uf,status:$("convStatus").value,origem:"Orçamento",orcamentoId:o.id,orcamentoNumero:o.numero,itens:o.itens,vendaId:""});
 o.status="Virou pedido";o.pedidoGerado=numero;
 closeModal("converterModal");save();alert(`Orçamento ${o.numero} convertido no pedido ${numero}.`)
}
function printOrcamento(id){
 let o=db.orcamentos.find(x=>x.id===id);if(!o)return;
 let w=window.open("","_blank");
 let linhas=o.itens.map(i=>`<tr><td>${esc(i.descricao)}</td><td>${i.qtd}</td><td>${money(i.preco)}</td><td>${money(i.qtd*i.preco)}</td></tr>`).join("");
 w.document.write(`<html><head><title>${o.numero}</title><style>body{font-family:Arial;padding:30px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}h1{margin-bottom:3px}.tot{text-align:right;font-size:20px;font-weight:bold}</style></head><body><h1>Orçamento ${esc(o.numero)}</h1><p>${esc(o.codigoCliente)} — ${esc(o.cliente)}<br>Representante: ${esc(o.representante)}<br>Validade: ${brdate(o.validade)}</p><table><tr><th>Item</th><th>Qtd.</th><th>Unitário</th><th>Subtotal</th></tr>${linhas}</table><p>Desconto: ${money(o.desconto)}</p><p class="tot">Total: ${money(o.total)}</p><p>${esc(o.observacao||"")}</p></body></html>`);
 w.document.close();w.print()
}
function whatsOrcamento(id){
 let o=db.orcamentos.find(x=>x.id===id),c=getClient(o?.clienteId);if(!o||!c)return;
 let phone=cleanPhone(c.tel1||c.tel2);if(!phone)return alert("Cliente sem telefone.");
 let itens=o.itens.map(i=>`• ${i.descricao}: ${i.qtd} x ${money(i.preco)}`).join("\n");
 let msg=`Olá! Segue o orçamento ${o.numero}:\n\n${itens}\n\nTotal: ${money(o.total)}\nValidade: ${brdate(o.validade)}`;
 window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,"_blank")
}

function renderApuracao(){
 let q=norm($("buscaApuracao")?.value),sup=$("filtroSupervisor")?.value||"",at=$("filtroAtingido")?.value||"";
 let fonte=(db.apuracaoLinhas&&db.apuracaoLinhas.length)?db.apuracaoLinhas:db.apuracaoMetas;

 let arr=fonte.map(x=>{
   let meta=Number(x.meta||0),vr=Number(x.vrAtingido||0);
   return {...x,pct:meta?vr/meta*100:0,falta:Math.max(meta-vr,0)}
 }).filter(x=>(!q||norm([x.representante,x.razaoSocial,x.supervisor].join(" ")).includes(q))&&(!sup||x.supervisor===sup)&&(!at||x.atingido===at));

 // KPIs gerais continuam usando representantes únicos para evitar duplicidade.
 let resumo=db.apuracaoMetas||[];
 let meta=resumo.reduce((s,x)=>s+Number(x.meta||0),0),
     ating=resumo.reduce((s,x)=>s+Number(x.vrAtingido||0),0);
 let qtd=resumo.filter(x=>Number(x.meta||0)>0&&Number(x.vrAtingido||0)>=Number(x.meta||0)).length;
 let pctEquipe=resumo.length?qtd/resumo.length*100:0;

 setText("aMetaTotal",money(meta));
 setText("aAtingidoTotal",money(ating));
 setText("aFaltaTotal",money(Math.max(meta-ating,0)));
 setText("aQtdMeta",qtd);
 setText("aPctMeta",pctEquipe.toFixed(1)+"% da equipe");

 // Resumo por supervisor, usando representantes únicos.
 let supMap=new Map();
 resumo.forEach(x=>{
   let supervisor=(x.supervisor||"Sem supervisor").trim()||"Sem supervisor";
   if(!supMap.has(supervisor)){
     supMap.set(supervisor,{supervisor,representantes:0,meta:0,atingido:0});
   }
   let s=supMap.get(supervisor);
   s.representantes++;
   s.meta+=Number(x.meta||0);
   s.atingido+=Number(x.vrAtingido||0);
 });

 let supervisores=[...supMap.values()].map(s=>({
   ...s,
   falta:Math.max(s.meta-s.atingido,0),
   pct:s.meta?s.atingido/s.meta*100:0
 })).filter(s=>!sup||s.supervisor===sup)
   .sort((a,b)=>b.pct-a.pct);

 setHTML("supervisorBody",supervisores.map(s=>`
   <tr>
     <td><b>${esc(s.supervisor)}</b></td>
     <td>${s.representantes}</td>
     <td>${money(s.meta)}</td>
     <td>${money(s.atingido)}</td>
     <td>${money(s.falta)}</td>
     <td><b>${s.pct.toFixed(1)}%</b></td>
     <td><span class="pill ${s.pct>=100?"ok":s.pct>=80?"near":"no"}">${s.pct>=100?"Meta atingida":s.pct>=80?"Próximo da meta":"Abaixo da meta"}</span></td>
   </tr>
 `).join("")||'<tr><td colspan="7">Nenhum supervisor encontrado.</td></tr>');

 let supMeta=supervisores.reduce((s,x)=>s+x.meta,0),
     supAting=supervisores.reduce((s,x)=>s+x.atingido,0),
     supFalta=Math.max(supMeta-supAting,0),
     supPct=supMeta?supAting/supMeta*100:0,
     supReps=supervisores.reduce((s,x)=>s+x.representantes,0);

 setHTML("supervisorFoot",`
   <tr class="supervisor-total">
     <td><b>TOTAL</b></td>
     <td><b>${supReps}</b></td>
     <td><b>${money(supMeta)}</b></td>
     <td><b>${money(supAting)}</b></td>
     <td><b>${money(supFalta)}</b></td>
     <td><b>${supPct.toFixed(1)}%</b></td>
     <td></td>
   </tr>`);

 // Tabela detalhada por representante
 if($("apuracaoBody")) $("apuracaoBody").innerHTML=arr.map(x=>`
   <tr>
     <td class="${x.atingido==="Sim"?"status-ok":"status-no"}">${esc(x.atingido)}</td>
     <td><b>${esc(x.representante||"—")}</b></td>
     <td>${esc(x.razaoSocial||"—")}</td>
     <td>${money(x.meta)}</td>
     <td>${money(x.vrAtingido)}</td>
     <td>${money(x.falta)}</td>
     <td>${x.pct.toFixed(1)}%</td>
     <td>${esc(x.supervisor||"—")}</td>
   </tr>`).join("")||'<tr><td colspan="8">Importe a planilha de Apuração das Metas.</td></tr>';
}
function refreshSupervisorFilter(){
 let el=$("filtroSupervisor");if(!el)return;let cur=el.value,sups=[...new Set(db.apuracaoMetas.map(x=>x.supervisor).filter(Boolean))].sort();el.innerHTML='<option value="">Todos os supervisores</option>'+sups.map(x=>`<option>${esc(x)}</option>`).join("");el.value=cur
}
function importApuracao(){
 let f=$("apuracaoFile")?.files?.[0];
 if(!f)return alert("Selecione APURAÇÃO DE VENDAS.xls.");
 let r=new FileReader();
 r.onload=e=>{
  try{
   let wb=XLSX.read(e.target.result,{type:"array",cellDates:true,raw:true}),linhas=[],diag=[];
   wb.SheetNames.forEach(sn=>{
    let raw=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:"",raw:true});
    if(!raw.length)return;
    let h=localizarCabecalho(raw,[["ATINGIDO"],["REPRESENTANTE"],["RAZAO SOCIAL"],["META"],["VR ATINGIDO"],["NOME DO SUPERVISOR"]]);
    if(h<0){diag.push(`${sn}: cabeçalho não encontrado`);return}
    let headers=raw[h].map(v=>String(v??"").trim());
    let cAt=findCol(headers,["Atingido"]),cRep=findCol(headers,["Representante"]),cRaz=findCol(headers,["Razão Social","Razao Social"]),
        cMeta=findCol(headers,["Meta"]),cVr=findCol(headers,["Vr Atingido"]),cSup=findCol(headers,["Nome do Supervisor"]);
    diag.push(`${sn}: linha ${h+1} | Atingido=${headers[cAt]||"NÃO"} | Representante=${headers[cRep]||"NÃO"} | Razão Social=${headers[cRaz]||"NÃO"} | Meta=${headers[cMeta]||"NÃO"} | Vr Atingido=${headers[cVr]||"NÃO"} | Supervisor=${headers[cSup]||"NÃO"}`);
    for(let i=h+1;i<raw.length;i++){
      let row=raw[i],rep=cRep>=0?String(row[cRep]??"").trim():"",raz=cRaz>=0?String(row[cRaz]??"").trim():"";
      if(!rep&&!raz)continue;
      let meta=cMeta>=0?numBR(row[cMeta]):0,vr=cVr>=0?numBR(row[cVr]):0,original=cAt>=0?String(row[cAt]??"").trim():"";
      linhas.push({atingido:/^SIM$/i.test(original)||(meta>0&&vr>=meta)?"Sim":"Não",representante:rep,razaoSocial:raz,meta,vrAtingido:vr,supervisor:cSup>=0?String(row[cSup]??"").trim():"",aba:sn})
    }
   });
   db.apuracaoLinhas=linhas;
   let mapa=new Map();
   linhas.forEach(x=>{let k=norm(x.representante||x.razaoSocial);if(!k)return;if(!mapa.has(k))mapa.set(k,{...x});else{let a=mapa.get(k);a.meta=Math.max(Number(a.meta||0),Number(x.meta||0));a.vrAtingido=Math.max(Number(a.vrAtingido||0),Number(x.vrAtingido||0));if(!a.razaoSocial)a.razaoSocial=x.razaoSocial;if(!a.supervisor)a.supervisor=x.supervisor;a.atingido=a.meta>0&&a.vrAtingido>=a.meta?"Sim":"Não"}});
   db.apuracaoMetas=[...mapa.values()];
   localStorage.setItem(KEY,JSON.stringify(db));render();
   let mt=db.apuracaoMetas.reduce((s,x)=>s+Number(x.meta||0),0),va=db.apuracaoMetas.reduce((s,x)=>s+Number(x.vrAtingido||0),0);
   setHTML("apuracaoMsg",`✅ <b>${linhas.length}</b> linhas importadas • <b>${db.apuracaoMetas.length}</b> representantes.<br>🎯 Meta: <b>${money(mt)}</b> • 💰 Vr Atingido: <b>${money(va)}</b><details><summary>Ver colunas reconhecidas</summary>${diag.map(x=>`<div>${esc(x)}</div>`).join("")}</details>`);
  }catch(err){console.error(err);alert("Erro ao importar APURAÇÃO DE VENDAS: "+err.message)}
 };
 r.readAsArrayBuffer(f)
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

function findClientByRazao(razao){
 let n=norm(razao);if(!n)return null;
 return db.clientes.find(c=>norm(c.razao)===n)||
        db.clientes.find(c=>norm(c.razao).includes(n)||n.includes(norm(c.razao)))||null
}
function localizarCabecalho(raw, obrigatorios, limite=50){
 for(let i=0;i<Math.min(raw.length,limite);i++){
   let rr=raw[i].map(normHeader);
   if(obrigatorios.every(grupo=>grupo.some(a=>rr.some(v=>v===normHeader(a)||v.includes(normHeader(a))))))return i;
 }
 return -1
}

function importClientes(){
 let f=$("clientesFile")?.files?.[0];
 if(!f)return alert("Selecione TODOS OS CLIENTES.xls.");
 let r=new FileReader();
 r.onload=e=>{
  try{
   let wb=XLSX.read(e.target.result,{type:"array",cellDates:true,raw:true});
   let mapa=new Map(db.clientes.map(c=>[String(c.codigo),c])),lidos=0,diag=[];
   wb.SheetNames.forEach(sn=>{
    let raw=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:"",raw:true});
    if(!raw.length)return;
    let h=localizarCabecalho(raw,[["CODIGO CLIENTE"],["RAZAO CLIENTE"]]);
    if(h<0){diag.push(`${sn}: cabeçalho não encontrado`);return}
    let headers=raw[h].map(v=>String(v??"").trim());
    let cCod=findCol(headers,["CODIGO CLIENTE","CÓDIGO CLIENTE"]);
    let cRaz=findCol(headers,["RAZAO CLIENTE","RAZÃO CLIENTE"]);
    let cCnpj=findCol(headers,["CNPJ"]);
    let cRep=findCol(headers,["REPRESENTANTE"]);
    let cCid=findCol(headers,["CIDADE"]);
    let cUf=findCol(headers,["UF","ESTADO"]);
    let cUlt=findCol(headers,["ULTIMA COMPRA","ÚLTIMA COMPRA"]);
    let cDias=findCol(headers,["DIAS SEM COMPRAR"]);
    let cVal=findCol(headers,["VALOR ULTIMA COMPRA","VALOR ÚLTIMA COMPRA"]);
    let cResp=findCol(headers,["RESPONSAVEL","RESPONSÁVEL"]);
    let cTel1=findCol(headers,["TELEFONE 1"]);
    let cTel2=findCol(headers,["TELEFONE 2"]);
    diag.push(`${sn}: linha ${h+1} | Código=${headers[cCod]||"NÃO"} | Razão=${headers[cRaz]||"NÃO"} | CNPJ=${headers[cCnpj]||"NÃO"} | Representante=${headers[cRep]||"NÃO"} | Cidade=${headers[cCid]||"NÃO"} | UF=${headers[cUf]||"NÃO"} | Última compra=${headers[cUlt]||"NÃO"} | Dias=${headers[cDias]||"NÃO"} | Valor=${headers[cVal]||"NÃO"} | Responsável=${headers[cResp]||"NÃO"} | Tel1=${headers[cTel1]||"NÃO"} | Tel2=${headers[cTel2]||"NÃO"}`);
    for(let i=h+1;i<raw.length;i++){
      let row=raw[i],codigo=cCod>=0?row[cCod]:"",razao=cRaz>=0?row[cRaz]:"";
      if(String(codigo??"").trim()===""||String(razao??"").trim()==="")continue;
      let key=String(codigo).trim(),old=mapa.get(key);
      mapa.set(key,{
        id:old?.id||uid(),codigo:key,razao:String(razao??"").trim(),
        cnpj:cCnpj>=0?String(row[cCnpj]??"").trim():"",
        representante:cRep>=0?String(row[cRep]??"").trim():"",
        cidade:cCid>=0?String(row[cCid]??"").trim():"",
        uf:cUf>=0?String(row[cUf]??"").trim():"",
        ultima:cUlt>=0?excelDate(row[cUlt]):"",
        dias:cDias>=0?numBR(row[cDias]):0,
        valor:cVal>=0?numBR(row[cVal]):0,
        responsavel:cResp>=0?String(row[cResp]??"").trim():"",
        tel1:cTel1>=0?String(row[cTel1]??"").trim():"",
        tel2:cTel2>=0?String(row[cTel2]??"").trim():""
      });lidos++;
    }
   });
   db.clientes=[...mapa.values()];
   localStorage.setItem(KEY,JSON.stringify(db));render();
   setHTML("clientesMsg",`✅ <b>${lidos}</b> linhas lidas • <b>${db.clientes.length}</b> clientes disponíveis.<details><summary>Ver colunas reconhecidas</summary>${diag.map(x=>`<div>${esc(x)}</div>`).join("")}</details>`);
  }catch(err){console.error(err);alert("Erro ao importar TODOS OS CLIENTES: "+err.message)}
 };
 r.readAsArrayBuffer(f)
}
function importPedidos(){
 let f=$("pedidosFile")?.files?.[0];
 if(!f)return alert("Selecione DIGITAÇÃO DE ORDEM.xls.");
 let r=new FileReader();
 r.onload=e=>{
  try{
   let wb=XLSX.read(e.target.result,{type:"array",cellDates:true,raw:true});
   let existing=new Map(db.pedidos.map(p=>[String(p.ordem),p])),count=0,diag=[];
   wb.SheetNames.forEach(sn=>{
    let raw=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:"",raw:true});
    if(!raw.length)return;
    let h=localizarCabecalho(raw,[["ORDEM"],["RAZAO SOCIAL"],["VR TOTAL (S/IMPOSTOS)"]]);
    if(h<0){diag.push(`${sn}: cabeçalho não encontrado`);return}
    let headers=raw[h].map(v=>String(v??"").trim());
    let cStatus=findCol(headers,["Status"]),cEtapa=findCol(headers,["Etapa"]),cOrdem=findCol(headers,["Ordem"]),
        cRaz=findCol(headers,["Razão Social","Razao Social"]),cDig=findCol(headers,["Digitação","Digitacao"]),
        cFat=findCol(headers,["Faturamento"]),cLib=findCol(headers,["Data Liberação/Crédito","Data Liberacao/Credito"]),
        cSem=findCol(headers,["Vr Total (s/impostos)"]),cLiq=findCol(headers,["Vr Total (Liquido)","Vr Total (Líquido)"]),
        cRep=findCol(headers,["Representante"]),cUf=findCol(headers,["UF"]);
    diag.push(`${sn}: linha ${h+1} | Status=${headers[cStatus]||"NÃO"} | Etapa=${headers[cEtapa]||"NÃO"} | Ordem=${headers[cOrdem]||"NÃO"} | Razão Social=${headers[cRaz]||"NÃO"} | Digitação=${headers[cDig]||"NÃO"} | Faturamento=${headers[cFat]||"NÃO"} | Liberação=${headers[cLib]||"NÃO"} | Sem impostos=${headers[cSem]||"NÃO"} | Líquido=${headers[cLiq]||"NÃO"} | Representante=${headers[cRep]||"NÃO"} | UF=${headers[cUf]||"NÃO"}`);
    for(let i=h+1;i<raw.length;i++){
      let row=raw[i],ord=cOrdem>=0?row[cOrdem]:"",razao=cRaz>=0?String(row[cRaz]??"").trim():"";
      if(String(ord??"").trim()===""||razao==="")continue;
      let ordem=String(ord).trim(),cli=findClientByRazao(razao),ant=existing.get(ordem);
      existing.set(ordem,{
       id:ant?.id||uid(),ordem,
       clienteId:cli?.id||ant?.clienteId||"",codigoCliente:cli?.codigo||ant?.codigoCliente||"",
       cliente:razao,data:cDig>=0?excelDate(row[cDig]):ant?.data||"",
       faturamento:cFat>=0?excelDate(row[cFat]):"",liberacao:cLib>=0?excelDate(row[cLib]):"",
       representante:(cRep>=0?String(row[cRep]??"").trim():"")||cli?.representante||"",
       valorSemImpostos:cSem>=0?numBR(row[cSem]):0,valorLiquido:cLiq>=0?numBR(row[cLiq]):0,
       cidade:cli?.cidade||ant?.cidade||"",uf:(cUf>=0?String(row[cUf]??"").trim():"")||cli?.uf||"",
       status:(cEtapa>=0?String(row[cEtapa]??"").trim():"")||(cStatus>=0?String(row[cStatus]??"").trim():""),
       statusOrdem:cStatus>=0?String(row[cStatus]??"").trim():"",
       origem:"DIGITAÇÃO DE ORDEM.xls",vendaId:ant?.vendaId||""
      });count++;
    }
   });
   db.pedidos=[...existing.values()];
   localStorage.setItem(KEY,JSON.stringify(db));render();
   let sem=db.pedidos.reduce((s,p)=>s+Number(p.valorSemImpostos||0),0),liq=db.pedidos.reduce((s,p)=>s+Number(p.valorLiquido||0),0);
   setHTML("pedidosMsg",`✅ <b>${count}</b> linhas lidas • <b>${db.pedidos.length}</b> pedidos únicos.<br>💰 Sem impostos: <b>${money(sem)}</b> • 🧾 Líquido: <b>${money(liq)}</b><details><summary>Ver colunas reconhecidas</summary>${diag.map(x=>`<div>${esc(x)}</div>`).join("")}</details>`);
  }catch(err){console.error(err);alert("Erro ao importar DIGITAÇÃO DE ORDEM: "+err.message)}
 };
 r.readAsArrayBuffer(f)
}
function exportExcel(){let wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.clientes),"Clientes");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.vendas),"Vendas");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.pedidos),"Pedidos");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.orcamentos.map(o=>({...o,itens:JSON.stringify(o.itens)}))),"Orçamentos");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.apuracaoLinhas||[]),"Apuração Metas");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.followups),"Follow-ups");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.alertas),"Alertas");XLSX.writeFile(wb,"Gestor_Comercial_Completo.xlsx")}

function limparTudo(){
 if(!confirm("Isso vai apagar TODOS os dados desta versão neste navegador. Deseja continuar?"))return;
 localStorage.removeItem(KEY);
 db={clientes:[],pedidos:[],vendas:[],orcamentos:[],followups:[],alertas:[],apuracaoLinhas:[],apuracaoMetas:[]};
 localStorage.setItem(KEY,JSON.stringify(db));
 render();
 alert("Sistema zerado. Agora só aparecerão dados depois da importação/cadastro.");
}

function backupDados(){let blob=new Blob([JSON.stringify({aplicativo:"Gestor Comercial",versao:5,criadoEm:new Date().toISOString(),dados:db},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Backup_Gestor_Comercial_${today()}.json`;a.click()}
function restaurarBackup(e){let f=e.target.files[0];if(!f)return;if(!confirm("Substituir os dados atuais pelo backup?"))return;let r=new FileReader();r.onload=x=>{try{let p=JSON.parse(x.target.result),d=p.dados||p;db={clientes:d.clientes||[],pedidos:d.pedidos||[],vendas:d.vendas||[],orcamentos:d.orcamentos||[],apuracaoMetas:d.apuracaoMetas||[],apuracaoLinhas:d.apuracaoLinhas||[],followups:d.followups||[],alertas:d.alertas||[],metas:d.metas||{}};save();alert("Backup restaurado.")}catch{alert("Backup inválido.")}};r.readAsText(f)}
function render(){fillSelectors();refreshSupervisorFilter();renderClientes();renderVendas();renderPedidos();renderOrcamentos();renderFollow();renderAlerts();try{renderApuracao()}catch(e){console.warn("renderApuracao:",e)}renderDashboard();checkNotifications()}
try{appSelfCheck();render()}catch(e){console.error("Erro de inicialização:",e);alert("O aplicativo encontrou um erro ao iniciar. Faça um backup/restauração ou atualize a página. Detalhe: "+e.message)}
setInterval(()=>{try{checkNotifications()}catch(e){console.warn(e)}},60000);
