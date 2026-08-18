GESTOR COMERCIAL LIMPO V1

Esta versão foi reconstruída do zero para eliminar referências quebradas de versões anteriores.

Módulos:
- Dashboard com dois valores (sem impostos e líquido), filtros e gráficos
- Clientes + WhatsApp + Follow-up + Alertas
- Vendas
- Pedidos
- Orçamentos
- Fluxo Orçamento → Pedido → Venda
- Apuração de Metas com percentual por representante
- Importação de Clientes
- Importação Digitação de Ordens
- Importação Apuração das Metas
- Backup / Restauração
- Exportação Excel

IMPORTANTE:
A chave localStorage permanece "gestor_comercial_v4" para tentar preservar seus dados atuais
no mesmo domínio/navegador. Faça backup antes de atualizar no GitHub.

A importação mostra "Colunas reconhecidas" para diagnóstico, sem quebrar a tela se algum
elemento opcional não existir.

GESTOR COMERCIAL LIMPO V2
- Adicionado botão Cancelar venda.
- Venda cancelada permanece no histórico, mas não entra em totais, quantidade, dashboard ou gráficos.
- Se a venda veio de pedido/orçamento, o vínculo é reaberto corretamente.
- Apuração de Metas reorganizada:
  * Top 5 acima da meta
  * Mais próximos de 100%
  * Mais distantes da meta
  * Gráfico compacto Top 10
  * Tabela completa mantida
