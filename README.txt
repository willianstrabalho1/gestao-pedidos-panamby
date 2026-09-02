GESTOR COMERCIAL PANAMBY — V12 DO ZERO • 2026.08.19

REFEITO DO ZERO
- Código novo
- IndexedDB
- Sem localStorage para a base principal

DASHBOARD
- Data inicial
- Data final
- Representante
- Região
- Valor dos gráficos: sem impostos ou líquido
- Totais do período
- Ticket médio
- Região líder
- Representante líder
- Clientes compradores
- Evolução por período
- Faturamento por região e representante
- Top clientes
- Metas ordenadas do maior Vr Atingido para o menor

MÓDULOS
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

IMPORTAÇÃO
1. TODOS OS CLIENTES.xls
2. DIGITAÇÃO DE ORDEM.xls
3. APURAÇÃO DE VENDAS.xls

ARQUIVOS PARA SUBSTITUIR NO GITHUB
- index.html
- app.js
- style.css
- README.txt

ATUALIZAÇÃO
1. Envie os 4 arquivos juntos.
2. Commit changes.
3. Aguarde GitHub Pages.
4. Ctrl + F5.
5. Confirme no topo: V12 DO ZERO • 2026.08.19

V13 DASHBOARD ANIMADO
- Faixa AO VIVO com informações passando.
- Indicadores principais com contagem animada.
- Cards e gráficos com movimento suave ao passar o mouse.
- Mantém filtro por Data inicial e Data final.

V14 FUNIL DE VENDAS
- Funil no Dashboard.
- Orçamentos -> Aprovados -> Viraram Pedido -> Vendas concluídas.
- Quantidade e valor por etapa.
- Conversão entre etapas e conversão geral.
- Respeita Data inicial, Data final, Representante e Região.

V15 SEM FUNIL + EXCLUSÃO
- Funil removido do Dashboard.
- Botão Excluir pedido em cada pedido.
- Ao excluir pedido com venda vinculada, a venda vinculada também é removida.
- Se o pedido veio de orçamento, o orçamento volta para Aprovado.
- Botão Excluir orçamento em cada orçamento.
- Ao excluir orçamento, pedidos/vendas existentes são preservados e apenas o vínculo é removido.
- Todas as exclusões exigem confirmação.

V16 PIPELINE KANBAN
- Nova área Pipeline Comercial estilo Pipedrive.
- Etapas: Contato, Orçamento, Negociação, Pedido e Venda concluída.
- Cartões com cliente, código, valor, representante, data e origem.
- Filtros por período, representante e pesquisa.
- Botões rápidos para WhatsApp, virar pedido e confirmar venda quando aplicável.

V17 PIPELINE CLIENTES + ARRASTAR
- Todos os clientes importados em TODOS OS CLIENTES.xls aparecem no Pipeline.
- Cada cliente aparece uma única vez.
- Cartões mostram código, razão social, representante, cidade/UF, telefone, última compra, dias sem comprar e valor da última compra.
- Ações rápidas: WhatsApp, Follow-up, Alerta e Orçamento.
- Arrastar e soltar entre Contato, Orçamento, Negociação, Pedido e Venda.
- Ao arrastar para Negociação, o orçamento é aprovado.
- Ao arrastar para Pedido, o sistema cria um pedido a partir do orçamento quando necessário.
- Ao arrastar para Venda, o sistema cria/usa o pedido e registra a venda automaticamente.
- Posição manual do Pipeline é salva no IndexedDB.
