GESTOR COMERCIAL PANAMBY — V10 INDEXEDDB 2026.08.18

CORREÇÃO PRINCIPAL
O aplicativo agora usa IndexedDB para salvar clientes, pedidos, vendas,
orçamentos, follow-ups, alertas e apuração.

Isso corrige o erro:
Failed to execute 'setItem' on 'Storage': exceeded the quota.

RECURSOS MANTIDOS
- Dashboard
- Clientes
- Vendas
- Pedidos
- Orçamentos
- Orçamento -> Pedido -> Venda
- WhatsApp
- Follow-up
- Alertas
- Apuração de Metas
- Resumo por Supervisor
- Excel / Backup

PLANILHAS
1. TODOS OS CLIENTES.xls
2. DIGITAÇÃO DE ORDEM.xls
3. APURAÇÃO DE VENDAS.xls

ORDEM RECOMENDADA
1. TODOS OS CLIENTES
2. DIGITAÇÃO DE ORDEM
3. APURAÇÃO DE VENDAS

PARA ATUALIZAR NO GITHUB
Substitua juntos:
- index.html
- app.js
- style.css
- README.txt

Depois faça Commit changes, aguarde o GitHub Pages e pressione Ctrl + F5.

CONFIRMAÇÃO
No topo deve aparecer:
V10 INDEXEDDB 2026.08.18

ATUALIZAÇÃO V11 — NOMES E RANKING
- No quadro "Metas dos representantes", o nome/Razão Social aparece como informação principal.
- O código do representante aparece menor abaixo do nome.
- A ordem agora é pelo Vr Atingido: do maior vendedor para o menor.
- Percentual, Meta, Vendido e Falta continuam visíveis.
