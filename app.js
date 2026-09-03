console.info("Gestor Comercial Panamby V12 DO ZERO");
const DB_NAME="gestor_comercial_panamby_v12",STORE="app",DB_KEY="principal";
let db={clientes:[],pedidos:[],vendas:[],orcamentos:[],followups:[],alertas:[],apuracaoLinhas:[],apuracaoMetas:[],pipelineStages:[]};
const $=id=>document.getElementById(id),uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2),today=()=>new Date().toISOString().slice(0,10);
const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}),norm=v=>String(v??"").trim().toUpperCase();
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function normHeader(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g," ").replace(/\s+/g," ").trim()}
function findCol(h,a){let hs=h.map(normHeader);for(const x of a){let n=normHeader(x),i=hs.findIndex(y=>y===n);if(i>=0)return i}for(const x of a){let n=normHeader(x),i=hs.findIndex(y=>y.includes(n)||n.includes(y));if(i>=0)return i}return-1}
function numBR(v){if(typeof v==="number")return v;let s=String(v??"").trim().replace(/R\$/gi,"").replace(/\s/g,"");if(!s)return 0;if(s.includes(",")&&s.includes("."))s=s.replace(/\./g,"").replace(",",".");else if(s.includes(","))s=s.replace(",",".");return Number(s.replace(/[^0-9.-]/g,""))||0}
function excelDate(v){if(v instanceof Date)return v.toISOString().slice(0,10);if(typeof v==="number"){let d=XLSX.SSF.parse_date_code(v);return d?`${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`:""}if(!v)return"";let s=String(v).trim(),m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(m)return`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;let d=new Date(s);return isNaN(d)?"":d.toISOString().slice(0,10)}
function brdate(v){if(!v)return"—";let d=new Date(v+"T12:00:00");return isNaN(d)?esc(v):d.toLocaleDateString("pt-BR")}
function setText(id,v){if($(id))$(id).textContent=v} function setHTML(id,v){if($(id))$(id).innerHTML=v}
function normalizeDB(){for(const k of ["clientes","pedidos","vendas","orcamentos","followups","alertas","apuracaoLinhas","apuracaoMetas","pipelineStages"])if(!Array.isArray(db[k]))db[k]=[]}
function openDB(){return new Promise((res,rej)=>{let r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function loadDB(){let d=await openDB();return new Promise((res,rej)=>{let r=d.transaction(STORE,"readonly").objectStore(STORE).get(DB_KEY);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
async function persistDB(){try{normalizeDB();let d=await openDB();await new Promise((res,rej)=>{let t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(db,DB_KEY);t.oncomplete=res;t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)});return true}catch(e){console.error(e);alert("Erro ao salvar dados: "+(e?.message||e));return false}}
async function clearDB(){let d=await openDB();await new Promise((res,rej)=>{let t=d.transaction(STORE,"readwrite");t.objectStore(STORE).delete(DB_KEY);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
function save(){invalidatePipelineCache();render();persistDB()}
function getClient(id){return db.clientes.find(c=>c.id===id)} function findClientCode(c){return db.clientes.find(x=>String(x.codigo)===String(c))}
function findClientRazao(r){let n=norm(r);return db.clientes.find(c=>norm(c.razao)===n)||db.clientes.find(c=>norm(c.razao).includes(n)||n.includes(norm(c.razao)))||null}
function reps(){return [...new Set([...db.clientes,...db.pedidos,...db.vendas].map(x=>x.representante).filter(Boolean))].sort()}
function region(uf){let m={SP:"Sudeste",RJ:"Sudeste",MG:"Sudeste",ES:"Sudeste",PR:"Sul",SC:"Sul",RS:"Sul",BA:"Nordeste",SE:"Nordeste",AL:"Nordeste",PE:"Nordeste",PB:"Nordeste",RN:"Nordeste",CE:"Nordeste",PI:"Nordeste",MA:"Nordeste",GO:"Centro-Oeste",MT:"Centro-Oeste",MS:"Centro-Oeste",DF:"Centro-Oeste",AM:"Norte",PA:"Norte",AC:"Norte",RO:"Norte",RR:"Norte",AP:"Norte",TO:"Norte"};return m[norm(uf)]||"Não informado"}
function saleValue(x,m){return m==="liq"?Number(x.valorLiquido||0):Number(x.valorSemImpostos||0)}
function inPeriod(d,s,e){return !!d&&(!s||d>=s)&&(!e||d<=e)}
function localizarCabecalho(raw,req,limit=60){for(let i=0;i<Math.min(raw.length,limit);i++){let rr=raw[i].map(normHeader);if(req.every(g=>g.some(a=>rr.some(v=>v===normHeader(a)||v.includes(normHeader(a))))))return i}return-1}
function combinedSales(){let p=db.pedidos.map(x=>({...x,pedido:x.ordem})),ord=new Set(p.map(x=>String(x.ordem||"")).filter(Boolean));let v=db.vendas.filter(x=>!x.pedidoId&&!ord.has(String(x.ordem||"")));return [...p,...v]}
let charts={}; function makeChart(id,type,labels,data,label){let el=$(id);if(!el||typeof Chart==="undefined")return;if(charts[id])charts[id].destroy();charts[id]=new Chart(el,{type,data:{labels,datasets:[{label,data,borderWidth:2,tension:.25}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==="pie"}},scales:type==="pie"?{}:{y:{beginAtZero:true}}}})}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav,.tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab)?.classList.add("active");setText("pageTitle",b.textContent.replace(/^[^\s]+\s/,""))});
setText("todayLabel",new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}));
function fillSelectors(){let r=reps(),opts='<option value="">Todos</option>'+r.map(x=>`<option>${esc(x)}</option>`).join(""),dr=$("dashRep")?.value||"",pr=$("repPedido")?.value||"";if($("dashRep")){$("dashRep").innerHTML=opts;$("dashRep").value=dr}if($("repPedido")){$("repPedido").innerHTML=opts;$("repPedido").value=pr}if($("vRep"))$("vRep").innerHTML=r.map(x=>`<option>${esc(x)}</option>`).join("");if($("orcRep"))$("orcRep").innerHTML=r.map(x=>`<option>${esc(x)}</option>`).join("");if($("pipeRep")){let cur=$("pipeRep").value||"";$("pipeRep").innerHTML=opts;$("pipeRep").value=cur}if($("followRep")){let cur=$("followRep").value||"";$("followRep").innerHTML='<option value="">Todos os representantes</option>'+r.map(x=>`<option>${esc(x)}</option>`).join("");$("followRep").value=cur}}

function animateValue(id,end,currency=false,duration=650){
 const el=$(id); if(!el)return;
 const start=Number(el.dataset.num||0), target=Number(end||0), t0=performance.now();
 function step(t){
   const p=Math.min((t-t0)/duration,1), eased=1-Math.pow(1-p,3);
   const v=start+(target-start)*eased;
   el.textContent=currency?money(v):Math.round(v).toLocaleString("pt-BR");
   if(p<1)requestAnimationFrame(step); else el.dataset.num=String(target);
 }
 requestAnimationFrame(step);
}

function renderDashboard(){let start=$("dashInicio").value,end=$("dashFim").value,rep=$("dashRep").value,reg=$("dashRegiao").value,metric=$("dashMetric").value,arr=combinedSales().filter(x=>inPeriod(x.data,start,end)&&(!rep||norm(x.representante)===norm(rep))&&(!reg||region(x.uf||getClient(x.clienteId)?.uf)===reg)&&norm(x.status)!=="CANCELADO");let sem=arr.reduce((s,x)=>s+saleValue(x,"sem"),0),liq=arr.reduce((s,x)=>s+saleValue(x,"liq"),0),tot=arr.reduce((s,x)=>s+saleValue(x,metric),0);animateValue("kSem",sem,true);animateValue("kLiq",liq,true);animateValue("kQtd",arr.length,false);animateValue("kTicket",arr.length?tot/arr.length:0,true);let regs={},rps={},cls={},days={};arr.forEach(x=>{let v=saleValue(x,metric),rg=region(x.uf||getClient(x.clienteId)?.uf),rp=x.representante||"Sem representante",cl=x.cliente||getClient(x.clienteId)?.razao||"Cliente";regs[rg]=(regs[rg]||0)+v;rps[rp]=(rps[rp]||0)+v;cls[cl]=(cls[cl]||0)+v;days[x.data]=(days[x.data]||0)+v});let sr=Object.entries(regs).sort((a,b)=>b[1]-a[1]),sp=Object.entries(rps).sort((a,b)=>b[1]-a[1]),sc=Object.entries(cls).sort((a,b)=>b[1]-a[1]),sd=Object.keys(days).sort();setText("kRegiao",sr[0]?.[0]||"—");setText("kRegiaoVal",money(sr[0]?.[1]||0));setText("kRepLider",sp[0]?.[0]||"—");setText("kRepVal",money(sp[0]?.[1]||0));setText("kCli",Object.keys(cls).length);setText("kAlert",db.alertas.filter(a=>!a.done&&a.data<=today()).length);setText("kFollow",db.followups.filter(f=>!f.done).length);makeChart("chartEvolucao","line",sd.map(brdate),sd.map(k=>days[k]),"Valor");makeChart("chartRegiao","bar",sr.map(x=>x[0]),sr.map(x=>x[1]),"Valor");makeChart("chartRep","bar",sp.slice(0,12).map(x=>x[0]),sp.slice(0,12).map(x=>x[1]),"Valor");makeChart("chartPizza","pie",sr.map(x=>x[0]),sr.map(x=>x[1]),"Valor");setHTML("topClientes",sc.slice(0,10).map((x,i)=>`<div class="rankline"><span>${i+1}. ${esc(x[0])}</span><b>${money(x[1])}</b></div>`).join("")||'<p class="muted">Sem dados no período.</p>');let metas=(db.apuracaoMetas||[]).map(x=>{let m=Number(x.meta||0),v=Number(x.vrAtingido||0);return{...x,pct:m?v/m*100:0,falta:Math.max(m-v,0)}}).sort((a,b)=>b.vrAtingido-a.vrAtingido);setHTML("repRanking",metas.slice(0,10).map((x,i)=>{let nome=x.razaoSocial||x.representante||"—",cod=x.representante&&norm(x.representante)!==norm(nome)?x.representante:"";return`<div class="barrow"><div class="barlabel"><div><b>${i+1}. ${esc(nome)}</b>${cod?`<div class="rep-code">Código ${esc(cod)}</div>`:""}</div><span>${x.pct.toFixed(1)}%</span></div><div class="muted">Vendido ${money(x.vrAtingido)} • Meta ${money(x.meta)} • Falta ${money(x.falta)}</div><div class="bartrack"><div class="barfill" style="width:${Math.min(x.pct,100)}%"></div></div></div>`}).join("")||'<p class="muted">Importe APURAÇÃO DE VENDAS.xls.</p>')
setText("tickSem",money(sem));
setText("tickLiq",money(liq));
setText("tickQtd",arr.length.toLocaleString("pt-BR"));
setText("tickTicket",money(arr.length?tot/arr.length:0));
setText("tickRegiao",sr[0]?.[0]||"—");
setText("tickRep",sp[0]?.[0]||"—");
setText("tickAlert",db.alertas.filter(a=>!a.done&&a.data<=today()).length);
setText("tickFollow",db.followups.filter(f=>!f.done).length);


}
function renderClientes(){let q=norm($("buscaCliente").value),dias=Number($("filtroDias").value||0),a=db.clientes.filter(c=>(!q||norm([c.codigo,c.razao,c.cnpj,c.cidade,c.uf,c.representante,c.responsavel,c.tel1,c.tel2].join(" ")).includes(q))&&(!dias||Number(c.dias)>=dias));setHTML("clientesList",a.map(c=>`<div class="client"><div class="toprow"><div><h3>${esc(c.codigo)} — ${esc(c.razao)}</h3><span class="muted">${esc(c.cidade)}/${esc(c.uf)} • CNPJ ${esc(c.cnpj||"—")}</span></div><b>${Number(c.dias||0)} dias</b></div><div class="tags"><span class="tag">${esc(c.representante||"Sem representante")}</span></div><div class="muted">Última compra: ${brdate(c.ultima)} • ${money(c.valor)}<br>☎ ${esc(c.tel1||"")} ${c.tel2?" | "+esc(c.tel2):""}</div><div class="actions"><button class="followbtn" onclick="openFollow('${c.id}')">📞 Follow-up</button><button class="alertbtn" onclick="openAlert('${c.id}')">🔔 Alerta</button><button class="whatsbtn" onclick="openWhats('${c.id}')">💬 WhatsApp</button><button onclick="openVenda('${c.id}')">💰 Venda</button><button onclick="openOrcamento('${c.id}')">📝 Orçamento</button></div></div>`).join("")||'<div class="card muted">Nenhum cliente.</div>')}
function renderVendas(){let q=norm($("buscaVenda").value),s=$("vendaInicio").value,e=$("vendaFim").value,a=db.vendas.filter(v=>inPeriod(v.data,s,e)&&(!q||norm([v.ordem,v.codigoCliente,v.cliente,v.representante,v.origem].join(" ")).includes(q))).sort((a,b)=>(b.data||"").localeCompare(a.data||""));setText("vSem",money(a.reduce((s,x)=>s+saleValue(x,"sem"),0)));setText("vLiq",money(a.reduce((s,x)=>s+saleValue(x,"liq"),0)));setText("vQtd",a.length);setHTML("vendasList",a.map(v=>`<div class="sale"><div class="toprow"><div><h3>${esc(v.codigoCliente||"")} — ${esc(v.cliente||"Cliente")}</h3><span class="muted">${brdate(v.data)} • Pedido ${esc(v.ordem||"—")} • ${esc(v.representante||"")}</span></div><div><b>${money(saleValue(v,"sem"))}</b><br><span class="muted">Líquido ${money(saleValue(v,"liq"))}</span></div></div></div>`).join("")||'<div class="card muted">Nenhuma venda.</div>')}
function renderPedidos(){let q=norm($("buscaPedido").value),s=$("pedidoInicio").value,e=$("pedidoFim").value,rep=$("repPedido").value,a=db.pedidos.filter(p=>inPeriod(p.data,s,e)&&(!rep||norm(p.representante)===norm(rep))&&(!q||norm([p.ordem,p.codigoCliente,p.cliente,p.representante].join(" ")).includes(q))).sort((a,b)=>(b.data||"").localeCompare(a.data||""));setText("pSem",money(a.reduce((s,x)=>s+saleValue(x,"sem"),0)));setText("pLiq",money(a.reduce((s,x)=>s+saleValue(x,"liq"),0)));setText("pQtd",a.length);setHTML("pedidosList",a.map(p=>`<div class="order"><div class="toprow"><div><h3>Pedido ${esc(p.ordem)} • ${esc(p.codigoCliente||"")} ${esc(p.cliente||"")}</h3><span class="muted">${brdate(p.data)} • ${esc(p.representante||"")} • ${esc(p.cidade||"")}/${esc(p.uf||"")}</span></div><div><b>${money(saleValue(p,"sem"))}</b><br><span class="muted">Líquido ${money(saleValue(p,"liq"))}</span></div></div><div class="tags"><span class="tag">${esc(p.status||"Sem status")}</span>${p.vendaId?'<span class="pill ok">Venda confirmada</span>':""}</div><div class="actions">${p.vendaId?"":`<button class="primary" onclick="confirmarVendaPedido('${p.id}')">💰 Confirmar venda</button>`}<button class="deletebtn" onclick="excluirPedido('${p.id}')">🗑️ Excluir pedido</button></div></div>`).join("")||'<div class="card muted">Nenhum pedido.</div>')}


function excluirPedido(id){
 const p=db.pedidos.find(x=>x.id===id);
 if(!p)return;
 const vendasLigadas=db.vendas.filter(v=>v.pedidoId===p.id || String(v.ordem||"")===String(p.ordem||""));
 let aviso=vendasLigadas.length?`\n\nEste pedido possui ${vendasLigadas.length} venda(s) vinculada(s). Elas também serão excluídas.`:"";
 if(!confirm(`Excluir o pedido ${p.ordem}?${aviso}`))return;

 db.vendas=db.vendas.filter(v=>!(v.pedidoId===p.id || String(v.ordem||"")===String(p.ordem||"")));
 db.pedidos=db.pedidos.filter(x=>x.id!==id);

 if(p.orcamentoId){
   const o=db.orcamentos.find(x=>x.id===p.orcamentoId);
   if(o){
     o.pedidoGerado="";
     o.vendaId="";
     if(o.status==="Virou pedido"||o.status==="Venda concluída")o.status="Aprovado";
   }
 }
 save();
}

function excluirOrcamento(id){
 const o=db.orcamentos.find(x=>x.id===id);
 if(!o)return;
 const temLigacao=db.pedidos.some(p=>p.orcamentoId===id)||db.vendas.some(v=>v.orcamentoId===id);
 let aviso=temLigacao?"\n\nPedidos/vendas já criados serão mantidos; apenas o vínculo com este orçamento será removido.":"";
 if(!confirm(`Excluir o orçamento ${o.numero}?${aviso}`))return;

 db.pedidos.forEach(p=>{
   if(p.orcamentoId===id){
     p.orcamentoId="";
     p.orcamentoNumero="";
     if(p.origem==="Orçamento")p.origem="Pedido";
   }
 });
 db.vendas.forEach(v=>{
   if(v.orcamentoId===id){
     v.orcamentoId="";
     v.orcamentoNumero="";
     if(String(v.origem||"").startsWith("Orçamento"))v.origem=`Pedido ${v.ordem||""}`.trim();
   }
 });
 db.orcamentos=db.orcamentos.filter(x=>x.id!==id);
 save();
}

function openVenda(id){fillSelectors();$("vData").value=today();$("vCodigo").value="";$("vCliente").value="";$("vPedido").value="";$("vValorSem").value="";$("vValorLiq").value="";$("vObs").value="";if(id){let c=getClient(id);$("vCodigo").value=c.codigo;buscarClienteVenda()}$("vendaModal").classList.add("open")}
function buscarClienteVenda(){let c=findClientCode($("vCodigo").value);$("vClienteId").value=c?.id||"";$("vCliente").value=c?.razao||"";if(c?.representante)$("vRep").value=c.representante}
function saveVenda(){let c=findClientCode($("vCodigo").value);if(!c)return alert("Cliente não encontrado.");db.vendas.push({id:uid(),clienteId:c.id,codigoCliente:c.codigo,cliente:c.razao,representante:$("vRep").value||c.representante||"",data:$("vData").value,ordem:$("vPedido").value.trim(),valorSemImpostos:Number($("vValorSem").value||0),valorLiquido:Number($("vValorLiq").value||0),cidade:c.cidade,uf:c.uf,origem:"Venda manual",obs:$("vObs").value.trim()});closeModal("vendaModal");save()}
function confirmarVendaPedido(id){let p=db.pedidos.find(x=>x.id===id);if(!p||p.vendaId)return;let o=p.orcamentoId?db.orcamentos.find(x=>x.id===p.orcamentoId):null,v={id:uid(),pedidoId:p.id,ordem:p.ordem,clienteId:p.clienteId,codigoCliente:p.codigoCliente,cliente:p.cliente,representante:p.representante,data:today(),valorSemImpostos:saleValue(p,"sem"),valorLiquido:saleValue(p,"liq"),cidade:p.cidade,uf:p.uf,origem:o?`Orçamento ${o.numero} → Pedido ${p.ordem}`:`Pedido ${p.ordem}`};db.vendas.push(v);p.vendaId=v.id;p.status="Venda confirmada";if(o){o.status="Venda concluída";o.vendaId=v.id}save();alert("Venda confirmada.")}

function orcNumber(){return"ORC-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-6)}
function openOrcamento(id){fillSelectors();$("orcCodigo").value="";$("orcCliente").value="";$("orcValidade").value=new Date(Date.now()+7*86400000).toISOString().slice(0,10);$("orcDesconto").value=0;$("orcObs").value="";$("orcItens").innerHTML="";addOrcItem();if(id){let c=getClient(id);$("orcCodigo").value=c.codigo;buscarClienteOrc()}$("orcModal").classList.add("open")}
function buscarClienteOrc(){let c=findClientCode($("orcCodigo").value);$("orcClienteId").value=c?.id||"";$("orcCliente").value=c?.razao||"";if(c?.representante)$("orcRep").value=c.representante}
function addOrcItem(desc="",qtd=1,preco=0){let tr=document.createElement("tr");tr.innerHTML=`<td><input class="desc" value="${esc(desc)}"></td><td><input class="qtd" type="number" value="${qtd}" min="0" oninput="recalcOrc()"></td><td><input class="preco" type="number" value="${preco}" min="0" step="0.01" oninput="recalcOrc()"></td><td class="sub">${money(qtd*preco)}</td><td><button class="deletebtn" onclick="this.closest('tr').remove();recalcOrc()">×</button></td>`;$("orcItens").appendChild(tr);recalcOrc()}
function orcItems(){return[...$("orcItens").querySelectorAll("tr")].map(tr=>({descricao:tr.querySelector(".desc").value.trim(),qtd:Number(tr.querySelector(".qtd").value||0),preco:Number(tr.querySelector(".preco").value||0)})).filter(x=>x.descricao&&x.qtd>0)}
function recalcOrc(){let bruto=orcItems().reduce((s,x)=>s+x.qtd*x.preco,0),desc=Number($("orcDesconto").value||0);[...$("orcItens").querySelectorAll("tr")].forEach(tr=>tr.querySelector(".sub").textContent=money(Number(tr.querySelector(".qtd").value||0)*Number(tr.querySelector(".preco").value||0)));$("orcTotal").value=money(Math.max(bruto-desc,0))}
function saveOrcamento(){
 let c=findClientCode($("orcCodigo").value),it=orcItems();
 if(!c)return alert("Cliente não encontrado.");
 if(!it.length)return alert("Adicione itens.");

 let bruto=it.reduce((s,x)=>s+x.qtd*x.preco,0),desc=Number($("orcDesconto").value||0);

 const o={
   id:uid(),numero:orcNumber(),data:today(),validade:$("orcValidade").value,
   clienteId:c.id,codigoCliente:c.codigo,cliente:c.razao,
   representante:$("orcRep").value||c.representante||"",
   cidade:c.cidade,uf:c.uf,itens:it,bruto,desconto:desc,
   total:Math.max(bruto-desc,0),observacao:$("orcObs").value.trim(),
   status:"Em aberto",pedidoGerado:""
 };

 db.orcamentos.push(o);

 const pending=window.__pipelinePending;
 window.__pipelinePending=null;

 if(pending && pending.clienteId===c.id){
   if(pending.stage==="Orçamento"){
     setPipelineOverride(c.id,"Orçamento");
   }else if(pending.stage==="Negociação"){
     o.status="Aprovado";
     setPipelineOverride(c.id,"Negociação");
   }else if(pending.stage==="Pedido"){
     const n="PED-"+String(Date.now()).slice(-6);
     db.pedidos.push({
       id:uid(),ordem:n,clienteId:o.clienteId,codigoCliente:o.codigoCliente,cliente:o.cliente,
       representante:o.representante,data:today(),valorSemImpostos:o.total,valorLiquido:o.total,
       cidade:o.cidade,uf:o.uf,status:"Digitado",origem:"Orçamento",
       orcamentoId:o.id,orcamentoNumero:o.numero,itens:o.itens,vendaId:""
     });
     o.status="Virou pedido";
     o.pedidoGerado=n;
     setPipelineOverride(c.id,"Pedido");
   }else if(pending.stage==="Venda"){
     const n="PED-"+String(Date.now()).slice(-6);
     const p={
       id:uid(),ordem:n,clienteId:o.clienteId,codigoCliente:o.codigoCliente,cliente:o.cliente,
       representante:o.representante,data:today(),valorSemImpostos:o.total,valorLiquido:o.total,
       cidade:o.cidade,uf:o.uf,status:"Venda confirmada",origem:"Orçamento",
       orcamentoId:o.id,orcamentoNumero:o.numero,itens:o.itens,vendaId:""
     };
     db.pedidos.push(p);
     const v={
       id:uid(),pedidoId:p.id,ordem:p.ordem,clienteId:p.clienteId,codigoCliente:p.codigoCliente,
       cliente:p.cliente,representante:p.representante,data:today(),
       valorSemImpostos:p.valorSemImpostos,valorLiquido:p.valorLiquido,
       cidade:p.cidade,uf:p.uf,origem:`Pedido ${p.ordem}`
     };
     db.vendas.push(v);
     p.vendaId=v.id;
     o.status="Venda concluída";
     o.pedidoGerado=n;
     o.vendaId=v.id;
     setPipelineOverride(c.id,"Venda");
   }
 }else{
   setPipelineOverride(c.id,"Orçamento");
 }

 closeModal("orcModal");
 save();
}
function renderOrcamentos(){let q=norm($("buscaOrcamento").value),st=$("statusOrcamento").value,a=db.orcamentos.filter(o=>(!st||o.status===st)&&(!q||norm([o.numero,o.codigoCliente,o.cliente,o.representante].join(" ")).includes(q))).sort((a,b)=>(b.data||"").localeCompare(a.data||""));setText("oQtd",a.length);setText("oAberto",money(db.orcamentos.filter(o=>o.status==="Em aberto").reduce((s,o)=>s+Number(o.total||0),0)));setText("oConv",db.orcamentos.filter(o=>["Virou pedido","Venda concluída"].includes(o.status)).length);setHTML("orcamentosList",a.map(o=>`<div class="quote"><div class="toprow"><div><h3>${esc(o.numero)} • ${esc(o.codigoCliente)} — ${esc(o.cliente)}</h3><span class="muted">${brdate(o.data)} • validade ${brdate(o.validade)} • ${esc(o.representante||"")}</span></div><b>${money(o.total)}</b></div><div class="tags"><span class="tag">${esc(o.status)}</span>${o.pedidoGerado?`<span class="tag">Pedido ${esc(o.pedidoGerado)}</span>`:""}</div><div class="muted">${o.itens.map(i=>`${esc(i.descricao)} • ${i.qtd} × ${money(i.preco)}`).join("<br>")}</div><div class="actions">${["Em aberto","Aprovado"].includes(o.status)?`<button onclick="setOrcStatus('${o.id}','Aprovado')">✅ Aprovar</button><button class="primary" onclick="openConverter('${o.id}')">🧾 Virar pedido</button>`:""}<button onclick="printOrc('${o.id}')">🖨️ Imprimir</button><button class="whatsbtn" onclick="whatsOrc('${o.id}')">💬 WhatsApp</button><button class="deletebtn" onclick="excluirOrcamento('${o.id}')">🗑️ Excluir orçamento</button></div></div>`).join("")||'<div class="card muted">Nenhum orçamento.</div>')}
function setOrcStatus(id,s){let o=db.orcamentos.find(x=>x.id===id);if(o){o.status=s;save()}}
function openConverter(id){$("convOrcId").value=id;$("convPedido").value="";$("convData").value=today();$("convModal").classList.add("open")}
function converterOrcamento(){let o=db.orcamentos.find(x=>x.id===$("convOrcId").value);if(!o)return;let n=$("convPedido").value.trim()||("PED-"+String(Date.now()).slice(-6));if(db.pedidos.some(p=>String(p.ordem)===n))return alert("Pedido já existe.");db.pedidos.push({id:uid(),ordem:n,clienteId:o.clienteId,codigoCliente:o.codigoCliente,cliente:o.cliente,representante:o.representante,data:$("convData").value,valorSemImpostos:o.total,valorLiquido:o.total,cidade:o.cidade,uf:o.uf,status:$("convStatus").value,origem:"Orçamento",orcamentoId:o.id,orcamentoNumero:o.numero,itens:o.itens,vendaId:""});o.status="Virou pedido";o.pedidoGerado=n;closeModal("convModal");save();alert("Pedido criado.")}
function printOrc(id){let o=db.orcamentos.find(x=>x.id===id);if(!o)return;let w=window.open("","_blank");w.document.write(`<html><body style="font-family:Arial;padding:30px"><h1>Orçamento ${esc(o.numero)}</h1><p>${esc(o.codigoCliente)} — ${esc(o.cliente)}</p><table border="1" cellspacing="0" cellpadding="8" width="100%"><tr><th>Item</th><th>Qtd</th><th>Unitário</th><th>Subtotal</th></tr>${o.itens.map(i=>`<tr><td>${esc(i.descricao)}</td><td>${i.qtd}</td><td>${money(i.preco)}</td><td>${money(i.qtd*i.preco)}</td></tr>`).join("")}</table><h2>Total: ${money(o.total)}</h2></body></html>`);w.document.close();w.print()}
function cleanPhone(v){let n=String(v||"").replace(/\D/g,"");if(!n)return"";if(n.startsWith("55")&&n.length>=12)return n;if(n.length===10||n.length===11)return"55"+n;return n}
function whatsOrc(id){let o=db.orcamentos.find(x=>x.id===id),c=getClient(o?.clienteId);if(!o||!c)return;let p=cleanPhone(c.tel1||c.tel2);if(!p)return alert("Cliente sem telefone.");let msg=`Olá! Segue o orçamento ${o.numero}:\n\n${o.itens.map(i=>`• ${i.descricao}: ${i.qtd} x ${money(i.preco)}`).join("\n")}\n\nTotal: ${money(o.total)}`;window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`,"_blank")}

function openFollow(id){
 if(!id){const first=followFilteredClients()[0];if(!first)return alert("Nenhum cliente disponível.");id=first.id}
 const c=getClient(id);if(!c)return alert("Cliente não encontrado.");
 $("fClienteId").value=c.id;
 $("fClienteResumo").innerHTML=`<b>${esc(c.codigo)} — ${esc(c.razao)}</b><br><span>${esc(c.representante||"Sem representante")} • ${esc(c.cidade||"")}/${esc(c.uf||"")}</span><br><span>☎ ${esc(c.tel1||c.tel2||"Sem telefone")}</span>`;
 $("fData").value=today();$("fTexto").value="";$("fStatusNovo").value="pendente";$("followModal").classList.add("open");
}
function saveFollow(){
 const clienteId=$("fClienteId").value,data=$("fData").value,texto=$("fTexto").value.trim(),status=$("fStatusNovo").value;
 if(!clienteId)return alert("Cliente não selecionado.");
 if(!data)return alert("Informe a data.");
 if(!texto)return alert("Informe o assunto.");
 db.followups.push({id:uid(),clienteId,data,texto,done:status==="concluido",origem:"Manual"});
 closeModal("followModal");save();
}

const FOLLOW_PAGE_SIZE=40;
let followPage=0;
function followFilteredClients(){
 const rep=$("followRep")?.value||"",q=norm($("followClienteBusca")?.value||""),status=$("statusFollow")?.value||"";
 return (db.clientes||[]).filter(c=>{
   if(rep&&norm(c.representante)!==norm(rep))return false;
   if(q&&!norm([c.codigo,c.razao,c.cidade,c.uf,c.tel1,c.tel2].join(" ")).includes(q))return false;
   const fs=(db.followups||[]).filter(f=>f.clienteId===c.id),pend=fs.some(f=>!f.done),concl=fs.some(f=>f.done);
   if(status==="sem"&&fs.length)return false;
   if(status==="pendente"&&!pend)return false;
   if(status==="concluido"&&!concl)return false;
   return true;
 });
}
function renderFollow(){
 const clientes=followFilteredClients(),totalPages=Math.max(1,Math.ceil(clientes.length/FOLLOW_PAGE_SIZE));
 if(followPage>=totalPages)followPage=totalPages-1;if(followPage<0)followPage=0;
 const pagina=clientes.slice(followPage*FOLLOW_PAGE_SIZE,(followPage+1)*FOLLOW_PAGE_SIZE);
 setText("fClientesQtd",clientes.length);setText("fQtdTotal",(db.followups||[]).length);
 setText("fQtdPend",(db.followups||[]).filter(f=>!f.done).length);setText("fQtdConcl",(db.followups||[]).filter(f=>f.done).length);
 setText("followPageInfo",`Página ${followPage+1} de ${totalPages}`);
 setHTML("followClientesList",pagina.map(c=>{
   const fs=(db.followups||[]).filter(f=>f.clienteId===c.id).sort((a,b)=>(b.data||"").localeCompare(a.data||""));
   const pend=fs.filter(f=>!f.done).length,ultimo=fs[0];
   return `<div class="follow-client-card"><div class="toprow"><div><b>${esc(c.codigo)} — ${esc(c.razao)}</b><div class="muted">${esc(c.representante||"Sem representante")} • ${esc(c.cidade||"")}/${esc(c.uf||"")}</div></div><span class="pill ${pend?"near":"ok"}">${pend?pend+" pendente(s)":"Sem pendência"}</span></div>
   <div class="follow-client-details"><span>☎ ${esc(c.tel1||c.tel2||"Sem telefone")}</span><span>🛒 Última compra: ${brdate(c.ultima)}</span><span>⏳ ${Number(c.dias||0)} dias sem comprar</span></div>
   ${ultimo?`<div class="last-follow">Último: ${brdate(ultimo.data)} • ${esc(ultimo.texto)}</div>`:""}
   <div class="actions"><button class="primary" onclick="openFollow('${c.id}')">📞 Novo follow-up</button>${c.tel1||c.tel2?`<button class="whatsbtn" onclick="openWhats('${c.id}')">💬 WhatsApp</button>`:""}<button class="alertbtn" onclick="openAlert('${c.id}')">🔔 Alerta</button></div></div>`;
 }).join("")||'<div class="muted">Nenhum cliente encontrado.</div>');
 const rep=$("followRep")?.value||"";
 let hist=(db.followups||[]).slice().sort((a,b)=>(b.data||"").localeCompare(a.data||""));
 if(rep)hist=hist.filter(f=>norm(getClient(f.clienteId)?.representante)===norm(rep));
 setHTML("followList",hist.slice(0,120).map(f=>{const c=getClient(f.clienteId);return `<div class="follow-card ${f.done?"done":""}"><div class="toprow"><div><b>${esc(c?.codigo||"")} — ${esc(c?.razao||"Cliente")}</b><div class="muted">${esc(c?.representante||"")} • ${brdate(f.data)}</div></div><span class="pill ${f.done?"ok":"near"}">${f.done?"Concluído":"Pendente"}</span></div><div class="follow-text">${esc(f.texto)}</div><div class="actions">${c&&(c.tel1||c.tel2)?`<button class="whatsbtn" onclick="openWhats('${c.id}')">💬 WhatsApp</button>`:""}<button onclick="toggleFollow('${f.id}')">${f.done?"Reabrir":"Concluir"}</button></div></div>`}).join("")||'<div class="muted">Nenhum follow-up registrado.</div>');
}
function prevFollowPage(){if(followPage>0){followPage--;renderFollow()}}
function nextFollowPage(){const max=Math.max(0,Math.ceil(followFilteredClients().length/FOLLOW_PAGE_SIZE)-1);if(followPage<max){followPage++;renderFollow()}}

function toggleFollow(id){let f=db.followups.find(x=>x.id===id);if(f)f.done=!f.done;save()}
function openAlert(id){let c=getClient(id);$("aClienteId").value=id;$("aClienteNome").textContent=`${c?.codigo||""} — ${c?.razao||""}`;$("aData").value=today();$("aTexto").value="";$("alertModal").classList.add("open")}
function saveAlert(){db.alertas.push({id:uid(),clienteId:$("aClienteId").value,data:$("aData").value,texto:$("aTexto").value.trim(),prioridade:$("aPrior").value,done:false,notified:false});closeModal("alertModal");save()}
function renderAlerts(){setHTML("alertList",db.alertas.slice().sort((a,b)=>a.data.localeCompare(b.data)).map(a=>{let c=getClient(a.clienteId);return`<div class="card"><b>🔔 ${esc(c?.codigo||"")} ${esc(c?.razao||"Cliente")}</b><div class="muted">${brdate(a.data)} • ${esc(a.prioridade)} • ${esc(a.texto)}</div><button onclick="toggleAlert('${a.id}')">${a.done?"Reabrir":"Concluir"}</button></div>`}).join("")||'<div class="card muted">Nenhum alerta.</div>')}
function toggleAlert(id){let a=db.alertas.find(x=>x.id===id);if(a)a.done=!a.done;save()}
function openWhats(id){let c=getClient(id),ps=[c?.tel1,c?.tel2].filter(Boolean);if(!ps.length)return alert("Cliente sem telefone.");$("wClienteId").value=id;$("wClienteNome").textContent=`${c.codigo} — ${c.razao}`;$("wTelefone").innerHTML=ps.map((p,i)=>`<option value="${cleanPhone(p)}">Telefone ${i+1}: ${esc(p)}</option>`).join("");$("wModelo").value="follow";aplicarModeloWhats();$("whatsModal").classList.add("open")}
function aplicarModeloWhats(){let m={follow:"Olá! Tudo bem? Estou entrando em contato para dar continuidade ao nosso atendimento comercial. Posso te ajudar em algo hoje?",parado:"Olá! Tudo bem? Percebi que faz um tempo desde a última compra. Posso ajudar com alguma reposição?",catalogo:"Olá! Tudo bem? Temos novidades no catálogo. Posso te enviar?",pedido:"Olá! Tudo bem? Estou acompanhando seu pedido/retorno comercial.",personalizada:""};$("wMsg").value=m[$("wModelo").value]||""}
function abrirWhatsApp(){window.open(`https://wa.me/${$("wTelefone").value}?text=${encodeURIComponent($("wMsg").value)}`,"_blank")}
function closeModal(id){$(id)?.classList.remove("open")}
async function enableNotifications(){if(!("Notification"in window))return alert("Sem suporte.");let p=await Notification.requestPermission();if(p==="granted")alert("Notificações ativadas.")}
function checkNotifications(){if(!("Notification"in window)||Notification.permission!=="granted")return;let changed=false;db.alertas.filter(a=>!a.done&&!a.notified&&a.data<=today()).forEach(a=>{let c=getClient(a.clienteId);new Notification("Alerta comercial",{body:`${c?.codigo||""} ${c?.razao||"Cliente"} — ${a.texto}`});a.notified=true;changed=true});if(changed)persistDB()}





const PIPE_PAGE_SIZE=60;
let pipePage={Contato:0,Orçamento:0,Negociação:0,Pedido:0,Venda:0};
let pipeCache={Contato:[],Orçamento:[],Negociação:[],Pedido:[],Venda:[]};
let pipeSearchTimer=null;
let pipelineDataVersion=0;
let pipelineIndexVersion=-1;
let pipelineIndex=null;
let pipelineBaseVersion=-1;
let pipelineBaseCache=null;

function invalidatePipelineCache(){
 pipelineDataVersion++;
 pipelineIndex=null;
 pipelineBaseCache=null;
}

function buildPipelineIndex(){
 if(pipelineIndex && pipelineIndexVersion===pipelineDataVersion)return pipelineIndex;

 const orcByClient=new Map(),pedByClient=new Map(),venByClient=new Map();
 for(const o of (db.orcamentos||[])){
   if(!o.clienteId)continue;
   const old=orcByClient.get(o.clienteId);
   if(!old||String(o.data||"")>String(old.data||""))orcByClient.set(o.clienteId,o);
 }
 for(const p of (db.pedidos||[])){
   if(!p.clienteId)continue;
   const old=pedByClient.get(p.clienteId);
   if(!old||String(p.data||"")>String(old.data||""))pedByClient.set(p.clienteId,p);
 }
 for(const v of (db.vendas||[])){
   if(!v.clienteId)continue;
   const old=venByClient.get(v.clienteId);
   if(!old||String(v.data||"")>String(old.data||""))venByClient.set(v.clienteId,v);
 }
 const stageByClient=new Map((db.pipelineStages||[]).map(x=>[x.clienteId,x.stage]));
 pipelineIndex={orcByClient,pedByClient,venByClient,stageByClient};
 pipelineIndexVersion=pipelineDataVersion;
 return pipelineIndex;
}

function pipelineOverride(clienteId){
 return buildPipelineIndex().stageByClient.get(clienteId)||"";
}
function setPipelineOverride(clienteId,stage){
 db.pipelineStages=db.pipelineStages||[];
 let x=db.pipelineStages.find(x=>x.clienteId===clienteId);
 if(x){x.stage=stage;x.updatedAt=new Date().toISOString()}
 else db.pipelineStages.push({clienteId,stage,updatedAt:new Date().toISOString()});
 invalidatePipelineCache();
}
function latestOrcamento(clienteId){return buildPipelineIndex().orcByClient.get(clienteId)||null}
function latestPedido(clienteId){return buildPipelineIndex().pedByClient.get(clienteId)||null}
function latestVenda(clienteId){return buildPipelineIndex().venByClient.get(clienteId)||null}
function derivedStage(c){return pipelineOverride(c.id)||"Contato"}

function pipelineBase(){
 if(pipelineBaseCache && pipelineBaseVersion===pipelineDataVersion)return pipelineBaseCache;
 const idx=buildPipelineIndex();

 pipelineBaseCache=(db.clientes||[]).map(c=>{
   const stage=idx.stageByClient.get(c.id)||"Contato";
   const o=idx.orcByClient.get(c.id),p=idx.pedByClient.get(c.id),v=idx.venByClient.get(c.id);
   let valor=Number(c.valor||0),detalhe="Cliente importado — aguardando processo comercial";

   if(stage==="Orçamento"){
     valor=Number(o?.total||c.valor||0);detalhe=o?.numero||"Orçamento em preparação";
   }else if(stage==="Negociação"){
     valor=Number(o?.total||c.valor||0);detalhe=o?`${o.numero} • aprovado / negociação`:"Negociação";
   }else if(stage==="Pedido"){
     valor=Number(p?.valorSemImpostos||o?.total||c.valor||0);detalhe=p?`Pedido ${p.ordem}`:"Pedido";
   }else if(stage==="Venda"){
     valor=Number(v?.valorSemImpostos||p?.valorSemImpostos||o?.total||c.valor||0);
     detalhe=v?(v.ordem?`Venda concluída • Pedido ${v.ordem}`:"Venda concluída"):"Venda concluída";
   }

   const search=norm([c.codigo,c.razao,c.representante,c.cidade,c.uf,c.tel1,c.tel2,detalhe].join(" "));
   return {key:"C-"+c.id,stage,clienteId:c.id,codigo:c.codigo,cliente:c.razao,representante:c.representante||"",
     data:c.ultima||"",valor,detalhe,cidade:c.cidade||"",uf:c.uf||"",ultima:c.ultima||"",
     dias:Number(c.dias||0),ultimaValor:Number(c.valor||0),tel1:c.tel1||"",tel2:c.tel2||"",
     orcamentoId:o?.id||"",pedidoId:p?.id||"",vendaId:v?.id||"",_search:search};
 });
 pipelineBaseVersion=pipelineDataVersion;
 return pipelineBaseCache;
}

function pipelineDeals(){
 const rep=$("pipeRep")?.value||"",busca=norm($("pipeBusca")?.value||"");
 const base=pipelineBase();
 if(!rep&&!busca)return base;
 return base.filter(d=>(!rep||norm(d.representante)===norm(rep))&&(!busca||d._search.includes(busca)));
}

function pipeCard(d){
 const c=getClient(d.clienteId);
 return `<div class="pipe-card compact" data-cliente-id="${d.clienteId}">
   <div class="pipe-card-top"><div class="pipe-title"><b>${esc(d.cliente||"Cliente")}</b><small>${esc(d.codigo||"Sem código")}</small></div><span class="pipe-value">${money(d.valor)}</span></div>
   <div class="pipe-meta"><span>👔 ${esc(d.representante||"Sem representante")}</span><span>📍 ${esc(d.cidade||"")}${d.uf?"/"+esc(d.uf):""}</span></div>
   <div class="pipe-highlight"><span class="${d.dias>=90?"late":d.dias>=30?"warn":""}">⏳ ${d.dias} dias sem comprar</span><span>🛒 ${brdate(d.ultima)}</span></div>
   <div class="pipe-detail-line">${esc(d.detalhe||"Pronto para contato")}</div>
   <div class="pipe-bottom"><button class="details-btn" onclick="togglePipeDetails(this)">Ver detalhes</button><div class="pipe-actions">
     ${c&&(c.tel1||c.tel2)?`<button class="pipe-icon whatsbtn" onclick="openWhats('${c.id}')" title="WhatsApp">💬</button>`:""}
     <button class="pipe-icon" onclick="openFollow('${d.clienteId}')" title="Follow-up">📞</button>
     <button class="pipe-icon alertbtn" onclick="openAlert('${d.clienteId}')" title="Alerta">🔔</button>
     <button class="pipe-icon" onclick="openOrcamento('${d.clienteId}')" title="Orçamento">📝</button>
   </div></div>
   <div class="pipe-extra"><div>💵 Última compra: <b>${money(d.ultimaValor)}</b></div>${d.tel1||d.tel2?`<div>☎ ${esc(d.tel1||d.tel2)}</div>`:""}<div>🏷️ Etapa: ${esc(d.stage)}</div></div>
 </div>`;
}
function togglePipeDetails(btn){
 const card=btn.closest(".pipe-card");if(!card)return;
 card.classList.toggle("show-extra");
 btn.textContent=card.classList.contains("show-extra")?"Ocultar detalhes":"Ver detalhes";
}

function resetPipelineLimits(){pipePage={Contato:0,Orçamento:0,Negociação:0,Pedido:0,Venda:0}}
function pipelineMaxPage(stage){return Math.max(0,Math.ceil((pipeCache[stage]||[]).length/PIPE_PAGE_SIZE)-1)}
function renderPipelineColumn(stage,containerId){
 let max=pipelineMaxPage(stage);
 if(pipePage[stage]>max)pipePage[stage]=max;
 const from=(pipePage[stage]||0)*PIPE_PAGE_SIZE;
 const list=(pipeCache[stage]||[]).slice(from,from+PIPE_PAGE_SIZE);
 setHTML(containerId,list.map(pipeCard).join("")||'<div class="pipe-empty">Sem clientes</div>');
 if(stage==="Contato")setText("pipePageContato",`Página ${pipePage.Contato+1} de ${max+1} • ${(pipeCache.Contato||[]).length.toLocaleString("pt-BR")} clientes`);
}
function renderOnePipelineStage(stage){
 const ids={Contato:"pipeContato",Orçamento:"pipeOrcamento",Negociação:"pipeNegociacao",Pedido:"pipePedido",Venda:"pipeVenda"};
 if(ids[stage])renderPipelineColumn(stage,ids[stage]);
}
function prevPipelinePage(stage){if((pipePage[stage]||0)>0){pipePage[stage]--;renderOnePipelineStage(stage)}}
function nextPipelinePage(stage){if((pipePage[stage]||0)<pipelineMaxPage(stage)){pipePage[stage]++;renderOnePipelineStage(stage)}}
function loadMorePipeline(stage){nextPipelinePage(stage)}

function renderPipeline(){
 const t0=performance.now(),deals=pipelineDeals(),stages={Contato:[],Orçamento:[],Negociação:[],Pedido:[],Venda:[]};
 for(const d of deals)if(stages[d.stage])stages[d.stage].push(d);

 const sort=$("pipeSort")?.value||"dias";
 const sorter=(a,b)=>sort==="valor"?Number(b.valor||0)-Number(a.valor||0):
   sort==="nome"?String(a.cliente||"").localeCompare(String(b.cliente||""),"pt-BR"):
   sort==="ultima"?String(b.ultima||"").localeCompare(String(a.ultima||"")):
   Number(b.dias||0)-Number(a.dias||0);
 Object.values(stages).forEach(a=>a.sort(sorter));
 pipeCache=stages;

 renderPipelineColumn("Contato","pipeContato");
 renderPipelineColumn("Orçamento","pipeOrcamento");
 renderPipelineColumn("Negociação","pipeNegociacao");
 renderPipelineColumn("Pedido","pipePedido");
 renderPipelineColumn("Venda","pipeVenda");

 setText("countContato",stages.Contato.length);setText("countOrcamento",stages.Orçamento.length);
 setText("countNegociacao",stages.Negociação.length);setText("countPedido",stages.Pedido.length);setText("countVenda",stages.Venda.length);
 setText("pipeQtd",deals.length);
 const em=[...stages.Orçamento,...stages.Negociação,...stages.Pedido];
 setText("pipeValor",money(em.reduce((s,d)=>s+Number(d.valor||0),0)));setText("pipePedidos",stages.Pedido.length);setText("pipeVendas",stages.Venda.length);
 setText("pipelinePerf",`Base: ${deals.length.toLocaleString("pt-BR")} clientes • 60 por página • ${Math.round(performance.now()-t0)} ms`);
 initPipelinePointerDrag();
}
function schedulePipelineRender(){
 clearTimeout(pipeSearchTimer);
 pipeSearchTimer=setTimeout(()=>{resetPipelineLimits();renderPipeline()},250);
}

async function moverClientePipeline(clienteId,targetStage){
 const c=getClient(clienteId);
 if(!c)return;

 const current=derivedStage(c);
 if(current===targetStage)return;

 try{
   if(targetStage==="Contato"){
     setPipelineOverride(clienteId,"Contato");
   }

   if(targetStage==="Orçamento"){
     const o=latestOrcamento(clienteId);
     if(!o){
       // Só muda definitivamente para orçamento quando ele for salvo.
       window.__pipelinePending={clienteId,stage:"Orçamento"};
       openOrcamento(clienteId);
       return;
     }
     if(o.status==="Aprovado")o.status="Em aberto";
     setPipelineOverride(clienteId,"Orçamento");
   }

   if(targetStage==="Negociação"){
     const o=latestOrcamento(clienteId);
     if(!o){
       alert("Crie um orçamento para este cliente antes de mover para Negociação.");
       window.__pipelinePending={clienteId,stage:"Negociação"};
       openOrcamento(clienteId);
       return;
     }
     o.status="Aprovado";
     setPipelineOverride(clienteId,"Negociação");
   }

   if(targetStage==="Pedido"){
     let p=latestPedido(clienteId);
     if(!p){
       const o=latestOrcamento(clienteId);
       if(!o){
         alert("Crie um orçamento antes de transformar o cliente em Pedido.");
         window.__pipelinePending={clienteId,stage:"Pedido"};
         openOrcamento(clienteId);
         return;
       }

       const n="PED-"+String(Date.now()).slice(-6);
       p={
         id:uid(),ordem:n,clienteId:o.clienteId,codigoCliente:o.codigoCliente,cliente:o.cliente,
         representante:o.representante,data:today(),valorSemImpostos:o.total,valorLiquido:o.total,
         cidade:o.cidade,uf:o.uf,status:"Digitado",origem:"Orçamento",
         orcamentoId:o.id,orcamentoNumero:o.numero,itens:o.itens,vendaId:""
       };
       db.pedidos.push(p);
       o.status="Virou pedido";
       o.pedidoGerado=n;
     }
     setPipelineOverride(clienteId,"Pedido");
   }

   if(targetStage==="Venda"){
     let v=latestVenda(clienteId);
     if(!v){
       let p=latestPedido(clienteId);

       if(!p){
         const o=latestOrcamento(clienteId);
         if(!o){
           alert("Para concluir uma venda, crie primeiro um orçamento.");
           window.__pipelinePending={clienteId,stage:"Venda"};
           openOrcamento(clienteId);
           return;
         }

         const n="PED-"+String(Date.now()).slice(-6);
         p={
           id:uid(),ordem:n,clienteId:o.clienteId,codigoCliente:o.codigoCliente,cliente:o.cliente,
           representante:o.representante,data:today(),valorSemImpostos:o.total,valorLiquido:o.total,
           cidade:o.cidade,uf:o.uf,status:"Digitado",origem:"Orçamento",
           orcamentoId:o.id,orcamentoNumero:o.numero,itens:o.itens,vendaId:""
         };
         db.pedidos.push(p);
         o.status="Virou pedido";
         o.pedidoGerado=n;
       }

       v={
         id:uid(),pedidoId:p.id,ordem:p.ordem,clienteId:p.clienteId,codigoCliente:p.codigoCliente,
         cliente:p.cliente,representante:p.representante,data:today(),
         valorSemImpostos:Number(p.valorSemImpostos||0),
         valorLiquido:Number(p.valorLiquido||0),
         cidade:p.cidade,uf:p.uf,origem:`Pedido ${p.ordem}`
       };

       db.vendas.push(v);
       p.vendaId=v.id;
       p.status="Venda confirmada";

       if(p.orcamentoId){
         const o=db.orcamentos.find(x=>x.id===p.orcamentoId);
         if(o){o.status="Venda concluída";o.vendaId=v.id}
       }
     }
     setPipelineOverride(clienteId,"Venda");
   }

   invalidatePipelineCache();
   await persistDB();
   render();
 }catch(err){
   console.error(err);
   alert("Não foi possível mover o cliente: "+(err?.message||err));
 }
}

// Drag robusto com Pointer Events.
let pipeDrag=null;

function initPipelinePointerDrag(force=false){
 const board=document.querySelector(".pipeline-board");
 if(!board)return;
 if(board.dataset.dragReady==="1")return;
 board.dataset.dragReady="1";

 board.addEventListener("pointerdown",e=>{
   if(e.button!==undefined && e.button!==0)return;
   if(e.target.closest("button,input,select,textarea,a"))return;

   const card=e.target.closest(".pipe-card");
   if(!card)return;

   const clienteId=card.dataset.clienteId;
   if(!clienteId)return;

   pipeDrag={
     clienteId,
     card,
     pointerId:e.pointerId,
     startX:e.clientX,
     startY:e.clientY,
     active:false,
     ghost:null,
     target:null
   };

   card.setPointerCapture?.(e.pointerId);
 });

 board.addEventListener("pointermove",e=>{
   if(!pipeDrag || pipeDrag.pointerId!==e.pointerId)return;

   const dx=e.clientX-pipeDrag.startX,dy=e.clientY-pipeDrag.startY;
   if(!pipeDrag.active && Math.hypot(dx,dy)<7)return;

   if(!pipeDrag.active){
     pipeDrag.active=true;
     pipeDrag.card.classList.add("dragging-real");

     const g=pipeDrag.card.cloneNode(true);
     g.classList.add("pipe-ghost");
     g.style.width=pipeDrag.card.getBoundingClientRect().width+"px";
     document.body.appendChild(g);
     pipeDrag.ghost=g;
   }

   e.preventDefault();
   pipeDrag.ghost.style.left=(e.clientX+14)+"px";
   pipeDrag.ghost.style.top=(e.clientY+14)+"px";

   pipeDrag.ghost.style.display="none";
   const under=document.elementFromPoint(e.clientX,e.clientY);
   pipeDrag.ghost.style.display="block";

   const col=under?.closest?.(".pipe-column")||null;
   document.querySelectorAll(".pipe-column").forEach(x=>x.classList.remove("drag-over"));

   if(col){
     col.classList.add("drag-over");
     pipeDrag.target=col;
   }else pipeDrag.target=null;
 });

 const finish=async e=>{
   if(!pipeDrag || (e.pointerId!==undefined && pipeDrag.pointerId!==e.pointerId))return;
   const d=pipeDrag;
   pipeDrag=null;

   d.card?.classList.remove("dragging-real");
   d.ghost?.remove();
   document.querySelectorAll(".pipe-column").forEach(x=>x.classList.remove("drag-over"));

   try{d.card?.releasePointerCapture?.(d.pointerId)}catch{}

   if(!d.active || !d.target)return;
   const stage=d.target.dataset.stage;
   if(stage)await moverClientePipeline(d.clienteId,stage);
 };

 board.addEventListener("pointerup",finish);
 board.addEventListener("pointercancel",finish);
}

function pipelineDragOver(event){
 event.preventDefault();
 event.currentTarget?.classList.add("drag-over");
}
async function pipelineDrop(event,targetStage){
 event.preventDefault();
 document.querySelectorAll(".pipe-column").forEach(x=>x.classList.remove("drag-over"));
 const clienteId=event.dataTransfer?.getData("text/plain");
 if(clienteId)await moverClientePipeline(clienteId,targetStage);
}

function renderApuracao(){let q=norm($("buscaApuracao").value),sup=$("filtroSupervisor").value,at=$("filtroAtingido").value,fonte=db.apuracaoLinhas||[],arr=fonte.map(x=>{let m=Number(x.meta||0),v=Number(x.vrAtingido||0);return{...x,pct:m?v/m*100:0,falta:Math.max(m-v,0)}}).filter(x=>(!q||norm([x.representante,x.razaoSocial,x.supervisor].join(" ")).includes(q))&&(!sup||x.supervisor===sup)&&(!at||x.atingido===at));let resumo=db.apuracaoMetas||[],mt=resumo.reduce((s,x)=>s+Number(x.meta||0),0),va=resumo.reduce((s,x)=>s+Number(x.vrAtingido||0),0),qtd=resumo.filter(x=>Number(x.meta)>0&&Number(x.vrAtingido)>=Number(x.meta)).length;setText("aMetaTotal",money(mt));setText("aAtingidoTotal",money(va));setText("aFaltaTotal",money(Math.max(mt-va,0)));setText("aQtdMeta",qtd);setText("aPctMeta",(resumo.length?qtd/resumo.length*100:0).toFixed(1)+"% da equipe");let sm=new Map();resumo.forEach(x=>{let n=(x.supervisor||"Sem supervisor").trim()||"Sem supervisor";if(!sm.has(n))sm.set(n,{supervisor:n,reps:0,meta:0,atingido:0});let s=sm.get(n);s.reps++;s.meta+=Number(x.meta||0);s.atingido+=Number(x.vrAtingido||0)});let sups=[...sm.values()].map(s=>({...s,falta:Math.max(s.meta-s.atingido,0),pct:s.meta?s.atingido/s.meta*100:0})).filter(s=>!sup||s.supervisor===sup).sort((a,b)=>b.pct-a.pct);setHTML("supervisorBody",sups.map(s=>`<tr><td><b>${esc(s.supervisor)}</b></td><td>${s.reps}</td><td>${money(s.meta)}</td><td>${money(s.atingido)}</td><td>${money(s.falta)}</td><td><b>${s.pct.toFixed(1)}%</b></td><td><span class="pill ${s.pct>=100?"ok":s.pct>=80?"near":"no"}">${s.pct>=100?"Meta atingida":s.pct>=80?"Próximo da meta":"Abaixo da meta"}</span></td></tr>`).join("")||'<tr><td colspan="7">Sem dados.</td></tr>');let tm=sups.reduce((s,x)=>s+x.meta,0),ta=sups.reduce((s,x)=>s+x.atingido,0),tr=sups.reduce((s,x)=>s+x.reps,0);setHTML("supervisorFoot",`<tr><td>TOTAL</td><td>${tr}</td><td>${money(tm)}</td><td>${money(ta)}</td><td>${money(Math.max(tm-ta,0))}</td><td>${(tm?ta/tm*100:0).toFixed(1)}%</td><td></td></tr>`);setHTML("apuracaoBody",arr.map(x=>`<tr><td class="${x.atingido==="Sim"?"status-ok":"status-no"}">${esc(x.atingido)}</td><td><b>${esc(x.razaoSocial||x.representante||"—")}</b></td><td>${esc(x.representante||"—")}</td><td>${money(x.meta)}</td><td>${money(x.vrAtingido)}</td><td>${money(x.falta)}</td><td>${x.pct.toFixed(1)}%</td><td>${esc(x.supervisor||"—")}</td></tr>`).join("")||'<tr><td colspan="8">Importe APURAÇÃO DE VENDAS.xls.</td></tr>')}
function refreshSup(){let e=$("filtroSupervisor"),cur=e.value,s=[...new Set((db.apuracaoLinhas||[]).map(x=>x.supervisor).filter(Boolean))].sort();e.innerHTML='<option value="">Todos os supervisores</option>'+s.map(x=>`<option>${esc(x)}</option>`).join("");e.value=cur}



async function importClientes(){let f=$("clientesFile").files[0];if(!f)return alert("Selecione TODOS OS CLIENTES.xls.");let r=new FileReader();r.onload=async e=>{try{let wb=XLSX.read(e.target.result,{type:"array",cellDates:true,raw:true}),map=new Map(),lidos=0,oldByCode=new Map((db.clientes||[]).map(c=>[String(c.codigo),c]));let totalSheet=wb.SheetNames.find(s=>normHeader(s)==="TOTAL");let sheets=totalSheet?[totalSheet]:wb.SheetNames;for(const sn of sheets){let raw=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:"",raw:true}),h=localizarCabecalho(raw,[["CODIGO CLIENTE"],["RAZAO CLIENTE"]]);if(h<0)continue;let hd=raw[h].map(v=>String(v??"").trim()),cCod=findCol(hd,["CODIGO CLIENTE","CÓDIGO CLIENTE"]),cRaz=findCol(hd,["RAZAO CLIENTE","RAZÃO CLIENTE"]),cCnpj=findCol(hd,["CNPJ"]),cRep=findCol(hd,["REPRESENTANTE"]),cCid=findCol(hd,["CIDADE"]),cUf=findCol(hd,["UF"]),cUlt=findCol(hd,["ULTIMA COMPRA","ÚLTIMA COMPRA"]),cDias=findCol(hd,["DIAS SEM COMPRAR"]),cVal=findCol(hd,["VALOR ULTIMA COMPRA","VALOR ÚLTIMA COMPRA"]),cResp=findCol(hd,["RESPONSAVEL","RESPONSÁVEL"]),cTel1=findCol(hd,["TELEFONE 1"]),cTel2=findCol(hd,["TELEFONE 2"]);for(let i=h+1;i<raw.length;i++){let row=raw[i],codigo=cCod>=0?row[cCod]:"",razao=cRaz>=0?row[cRaz]:"";if(String(codigo).trim()===""||String(razao).trim()==="")continue;let key=String(codigo).trim(),old=oldByCode.get(key);map.set(key,{id:old?.id||("CLI-"+key),codigo:key,razao:String(razao).trim(),cnpj:cCnpj>=0?String(row[cCnpj]??"").trim():"",representante:cRep>=0?String(row[cRep]??"").trim():"",cidade:cCid>=0?String(row[cCid]??"").trim():"",uf:cUf>=0?String(row[cUf]??"").trim():"",ultima:cUlt>=0?excelDate(row[cUlt]):"",dias:cDias>=0?numBR(row[cDias]):0,valor:cVal>=0?numBR(row[cVal]):0,responsavel:cResp>=0?String(row[cResp]??"").trim():"",tel1:cTel1>=0?String(row[cTel1]??"").trim():"",tel2:cTel2>=0?String(row[cTel2]??"").trim():""});lidos++}}db.clientes=[...map.values()];db.pipelineStages=[];invalidatePipelineCache();await persistDB();render();setHTML("clientesMsg",`✅ <b>${lidos}</b> linhas lidas • <b>${db.clientes.length}</b> clientes.`)}catch(err){console.error(err);alert("Erro ao importar clientes: "+err.message)}};r.readAsArrayBuffer(f)}
async function importPedidos(){let f=$("pedidosFile").files[0];if(!f)return alert("Selecione DIGITAÇÃO DE ORDEM.xls.");let r=new FileReader();r.onload=async e=>{try{let wb=XLSX.read(e.target.result,{type:"array",cellDates:true,raw:true}),map=new Map(),count=0;for(const sn of wb.SheetNames){let raw=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:"",raw:true}),h=localizarCabecalho(raw,[["ORDEM"],["RAZAO SOCIAL"],["VR TOTAL (S/IMPOSTOS)"]]);if(h<0)continue;let hd=raw[h].map(v=>String(v??"").trim()),cStatus=findCol(hd,["Status"]),cEtapa=findCol(hd,["Etapa"]),cOrdem=findCol(hd,["Ordem"]),cRaz=findCol(hd,["Razão Social","Razao Social"]),cDig=findCol(hd,["Digitação","Digitacao"]),cFat=findCol(hd,["Faturamento"]),cLib=findCol(hd,["Data Liberação/Crédito"]),cSem=findCol(hd,["Vr Total (s/impostos)"]),cLiq=findCol(hd,["Vr Total (Liquido)","Vr Total (Líquido)"]),cRep=findCol(hd,["Representante"]),cUf=findCol(hd,["UF"]);for(let i=h+1;i<raw.length;i++){let row=raw[i],ord=cOrdem>=0?row[cOrdem]:"",razao=cRaz>=0?String(row[cRaz]??"").trim():"";if(String(ord).trim()===""||razao==="")continue;let cli=findClientRazao(razao);map.set(String(ord).trim(),{id:uid(),ordem:String(ord).trim(),clienteId:cli?.id||"",codigoCliente:cli?.codigo||"",cliente:razao,data:cDig>=0?excelDate(row[cDig]):"",faturamento:cFat>=0?excelDate(row[cFat]):"",liberacao:cLib>=0?excelDate(row[cLib]):"",representante:(cRep>=0?String(row[cRep]??"").trim():"")||cli?.representante||"",valorSemImpostos:cSem>=0?numBR(row[cSem]):0,valorLiquido:cLiq>=0?numBR(row[cLiq]):0,cidade:cli?.cidade||"",uf:(cUf>=0?String(row[cUf]??"").trim():"")||cli?.uf||"",status:(cEtapa>=0?String(row[cEtapa]??"").trim():"")||(cStatus>=0?String(row[cStatus]??"").trim():""),origem:"DIGITAÇÃO DE ORDEM",vendaId:""});count++}}db.pedidos=[...map.values()];invalidatePipelineCache();await persistDB();render();let sem=db.pedidos.reduce((s,p)=>s+saleValue(p,"sem"),0),liq=db.pedidos.reduce((s,p)=>s+saleValue(p,"liq"),0);setHTML("pedidosMsg",`✅ <b>${count}</b> linhas • <b>${db.pedidos.length}</b> pedidos únicos.<br>Sem impostos: <b>${money(sem)}</b> • Líquido: <b>${money(liq)}</b>`)}catch(err){console.error(err);alert("Erro ao importar pedidos: "+err.message)}};r.readAsArrayBuffer(f)}
async function importApuracao(){let f=$("apuracaoFile").files[0];if(!f)return alert("Selecione APURAÇÃO DE VENDAS.xls.");let r=new FileReader();r.onload=async e=>{try{let wb=XLSX.read(e.target.result,{type:"array",raw:true}),linhas=[];for(const sn of wb.SheetNames){let raw=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:"",raw:true}),h=localizarCabecalho(raw,[["ATINGIDO"],["REPRESENTANTE"],["RAZAO SOCIAL"],["META"],["VR ATINGIDO"],["NOME DO SUPERVISOR"]]);if(h<0)continue;let hd=raw[h].map(v=>String(v??"").trim()),cAt=findCol(hd,["Atingido"]),cRep=findCol(hd,["Representante"]),cRaz=findCol(hd,["Razão Social","Razao Social"]),cMeta=findCol(hd,["Meta"]),cVr=findCol(hd,["Vr Atingido"]),cSup=findCol(hd,["Nome do Supervisor"]);for(let i=h+1;i<raw.length;i++){let row=raw[i],rep=cRep>=0?String(row[cRep]??"").trim():"",raz=cRaz>=0?String(row[cRaz]??"").trim():"";if(!rep&&!raz)continue;let meta=cMeta>=0?numBR(row[cMeta]):0,vr=cVr>=0?numBR(row[cVr]):0,atRaw=cAt>=0?String(row[cAt]??"").trim():"";linhas.push({atingido:/^SIM$/i.test(atRaw)||(meta>0&&vr>=meta)?"Sim":"Não",representante:rep,razaoSocial:raz,meta,vrAtingido:vr,supervisor:cSup>=0?String(row[cSup]??"").trim():""})}}db.apuracaoLinhas=linhas;let mapa=new Map();linhas.forEach(x=>{let k=norm(x.representante||x.razaoSocial);if(!k)return;if(!mapa.has(k))mapa.set(k,{...x});else{let a=mapa.get(k);a.meta=Math.max(Number(a.meta||0),Number(x.meta||0));a.vrAtingido=Math.max(Number(a.vrAtingido||0),Number(x.vrAtingido||0));if(!a.razaoSocial)a.razaoSocial=x.razaoSocial;if(!a.supervisor)a.supervisor=x.supervisor;a.atingido=a.meta>0&&a.vrAtingido>=a.meta?"Sim":"Não"}});db.apuracaoMetas=[...mapa.values()];invalidatePipelineCache();await persistDB();render();setHTML("apuracaoMsg",`✅ <b>${linhas.length}</b> linhas • <b>${db.apuracaoMetas.length}</b> representantes.`)}catch(err){console.error(err);alert("Erro ao importar apuração: "+err.message)}};r.readAsArrayBuffer(f)}
function backupDados(){let blob=new Blob([JSON.stringify({versao:"V12",data:new Date().toISOString(),dados:db},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Backup_Gestor_Comercial_${today()}.json`;a.click()}
async function restaurarBackup(e){let f=e.target.files[0];if(!f)return;if(!confirm("Substituir os dados atuais pelo backup?"))return;let r=new FileReader();r.onload=async x=>{try{let p=JSON.parse(x.target.result);db=p.dados||p;normalizeDB();invalidatePipelineCache();await persistDB();render();alert("Backup restaurado.")}catch(err){alert("Backup inválido: "+err.message)}};r.readAsText(f)}
function exportExcel(){let wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.clientes),"Clientes");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.pedidos),"Pedidos");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.vendas),"Vendas");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.orcamentos.map(o=>({...o,itens:JSON.stringify(o.itens)}))),"Orçamentos");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.apuracaoLinhas),"Apuração");XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(db.pipelineStages||[]),"Pipeline");XLSX.writeFile(wb,"Gestor_Comercial_Panamby.xlsx")}
async function limparTudo(){if(!confirm("Apagar todos os dados desta versão?"))return;await clearDB();db={clientes:[],pedidos:[],vendas:[],orcamentos:[],followups:[],alertas:[],apuracaoLinhas:[],apuracaoMetas:[],pipelineStages:[]};render();alert("Sistema zerado.")}
function bind(id,event,fn){let e=$(id);if(e)e[event]=fn}
["buscaCliente","filtroDias"].forEach(id=>bind(id,"oninput",renderClientes));
["followClienteBusca","statusFollow"].forEach(id=>bind(id,"oninput",()=>{followPage=0;renderFollow()}));
bind("followRep","onchange",()=>{followPage=0;renderFollow()});
["buscaVenda","vendaInicio","vendaFim"].forEach(id=>bind(id,"oninput",renderVendas));
["buscaPedido","pedidoInicio","pedidoFim","repPedido"].forEach(id=>bind(id,"oninput",renderPedidos));
["buscaOrcamento","statusOrcamento"].forEach(id=>bind(id,"oninput",renderOrcamentos));
["buscaApuracao","filtroSupervisor","filtroAtingido"].forEach(id=>bind(id,"oninput",renderApuracao));
["dashInicio","dashFim","dashRep","dashRegiao","dashMetric"].forEach(id=>bind(id,"onchange",renderDashboard));
["pipeInicio","pipeFim","pipeRep"].forEach(id=>bind(id,"onchange",()=>{resetPipelineLimits();renderPipeline()}));
bind("pipeSort","onchange",()=>{resetPipelineLimits();renderPipeline()});
bind("pipeBusca","oninput",schedulePipelineRender);
function render(){fillSelectors();refreshSup();renderClientes();renderVendas();renderPedidos();renderOrcamentos();renderFollow();renderAlerts();renderApuracao();renderPipeline();renderDashboard();checkNotifications()}
async function iniciarApp(){try{let saved=await loadDB();if(saved){db=saved;normalizeDB()}let d=new Date(),first=new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10);$("dashInicio").value=first;$("dashFim").value=today();$("vendaInicio").value=first;$("vendaFim").value=today();$("pedidoInicio").value=first;$("pedidoFim").value=today();$("pipeInicio").value=first;$("pipeFim").value=today();render();setInterval(checkNotifications,60000)}catch(err){console.error(err);alert("Erro ao iniciar: "+err.message);render()}}
iniciarApp();
