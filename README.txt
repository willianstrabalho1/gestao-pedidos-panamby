GESTOR COMERCIAL PANAMBY — VERSÃO DOIS VALORES

IMPORTAÇÃO DO RELATÓRIO DIGITAÇÃO DE ORDENS
O sistema agora lê separadamente:
- Vr Total (s/impostos)
- Vr Total (Líquido)

DASHBOARD
- Mostra os dois totais simultaneamente
- Filtros por mês, representante e região
- Parâmetro dos gráficos: Sem impostos ou Valor líquido
- Evolução diária
- Vendas por região
- Vendas por representante
- Participação por região
- Ranking de clientes
- Metas por representante (base: valor sem impostos)

PEDIDOS
- Mostra valor sem impostos e valor líquido lado a lado.

IMPORTANTE
A chave localStorage permanece gestor_comercial_v4 para preservar os dados
da versão anterior no mesmo navegador e no mesmo endereço do GitHub Pages.
Faça backup antes de substituir os arquivos.


CORREÇÃO: importador robusto para cabeçalhos com acentos, espaços e parênteses diferentes, com diagnóstico de colunas e totais após importar.


CORREÇÃO V2: corrigido campo ausente dashValor/kLiquido que causava erro 'Cannot read properties of null (reading value)'.


NOVOS MÓDULOS
1) APURAÇÃO DE METAS
- Importa o relatório 3.2.5 - Apuração das metas de vendas.
- Tabela: Atingido, Representante, Razão Social, Meta, Vr Atingido, Falta, % e Supervisor.
- Filtros por texto, supervisor e meta atingida.
- KPIs de meta total, valor atingido e quanto falta.

2) ORÇAMENTOS
- Cliente selecionado pelo código.
- Representante preenchido automaticamente.
- Vários itens com quantidade e preço unitário.
- Desconto e cálculo automático do total.
- Validade e observações.
- Aprovar, recusar, imprimir e enviar via WhatsApp.
- Botão VIRAR PEDIDO transforma o orçamento em pedido e preserva o vínculo.
- O pedido criado entra automaticamente na área Pedidos e no Dashboard.

A chave localStorage continua gestor_comercial_v4 para preservar os dados existentes.
