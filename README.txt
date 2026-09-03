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

V18 ARRASTAR CORRIGIDO
- Drag and drop refeito com Pointer Events.
- Funciona melhor com mouse, touchpad e tela touch.
- Segure o cartão em uma área vazia do cartão e arraste.
- Botões internos continuam clicáveis.
- Coluna de destino fica destacada.
- Ao soltar, o sistema executa a mudança de processo.

V19 TOTAL CLIENTES EM CONTATO
- Ao importar TODOS OS CLIENTES, se existir uma aba chamada "Total", o sistema usa essa aba como base principal.
- Todos os clientes importados entram inicialmente na coluna Contato.
- Pedidos antigos/importados não tiram automaticamente o cliente da coluna Contato.
- O cliente só muda de etapa quando você o arrasta manualmente.
- Ao reimportar a planilha Total, o Pipeline é reiniciado e todos os clientes voltam para Contato.
- IDs dos clientes são preservados por código sempre que possível.
- Contato é ordenado por dias sem comprar, do maior para o menor.

V20 PIPELINE SEM TRAVAR
- Corrige travamento ao carregar milhares de clientes.
- Todos os clientes continuam no Pipeline.
- A contagem continua mostrando a base inteira.
- São renderizados inicialmente até 80 cartões por coluna.
- Botão "Carregar mais" adiciona mais 80 por vez.
- Busca e representante filtram a base completa, não apenas os cartões visíveis.
- Arrastar continua funcionando nos cartões carregados.
- content-visibility e contain foram adicionados para reduzir o custo de renderização.

V21 PIPELINE ORGANIZADO
- Cartões compactos, com informações principais em destaque.
- Botão Ver detalhes para informações secundárias.
- Ordenação por dias sem comprar, maior valor, nome ou última compra.
- Follow-up agora tem área própria, separada de vendas/pedidos.
- Importação exclusiva de Follow-up em planilha própria.
- Importação de Vendas/Pedidos identificada como área independente.
- KPIs e filtros exclusivos para Follow-ups.

V22 PIPELINE OTIMIZADO
- Pipeline preparado para bases com cerca de 9 mil clientes ou mais.
- Paginação real: apenas 60 cartões da coluna Contato são montados por vez.
- Botões Anterior e Próxima navegam pela base sem carregar milhares de elementos.
- Cache interno de clientes/pedidos/orçamentos/vendas elimina filtros repetidos para cada cliente.
- Busca tem debounce de 250 ms.
- Filtros e pesquisa continuam atuando sobre a base completa.

V23 FOLLOW-UP POR REPRESENTANTE
- Usa diretamente os clientes de TODOS OS CLIENTES.xls.
- Não precisa importar uma planilha separada de follow-up.
- Filtro principal por representante.
- Busca por código, cliente, cidade e telefone.
- Filtro sem follow-up / pendente / concluído.
- 40 clientes por página.
- Criação de follow-up direto no cliente.
- Histórico de follow-ups separado.
