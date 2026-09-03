GESTOR COMERCIAL PANAMBY — V28
PIPELINE INTEGRADO AO FOLLOW-UP
Data: 2026.09.03

NOVIDADE PRINCIPAL
As informações do Pipeline agora aparecem diretamente na área de Atividades / Follow-ups / Alarmes.

INTEGRAÇÃO
- Cada atividade mostra a etapa atual do cliente:
  - Contato
  - Follow-up
  - Negociação
  - Venda concluída
- A etapa pode ser alterada diretamente na tabela de Follow-ups.
- Ao mudar a etapa na tabela, o Pipeline é atualizado automaticamente.
- Ao arrastar no Pipeline, a nova etapa também aparece automaticamente no Follow-up.
- Ao criar um novo Follow-up, o cliente entra na etapa Follow-up.

NOVOS FILTROS
- Representante
- Etapa do Pipeline
- Busca
- Prioridade
- Status
- Tipo de atividade
- Período

NOVOS INDICADORES
- Para fazer
- Vencidos
- Hoje
- Em Follow-up
- Em negociação
- Concluídos

DASHBOARD
- Mantido.
- Continua usando DIGITAÇÃO DE ORDEM.xls como fonte de vendas.

SEM TELA DE VENDAS
- O menu Vendas continua removido.
- Os dados de vendas permanecem internos para alimentar o Dashboard.

BANCO
- IndexedDB
- gestor_comercial_panamby_v28

GITHUB
Substitua:
- index.html
- app.js
- style.css
- README.txt

Depois:
Commit changes -> aguarde GitHub Pages -> Ctrl + F5.


V29 CORREÇÃO FOLLOW-UP / ALARME
- Corrigido erro: "followDue is not defined".
- A função followDue agora verifica corretamente data + horário da atividade.
- Atividades concluídas nunca são consideradas vencidas.
- Atividades sem data válida não quebram a inicialização do sistema.
- Pipeline integrado ao Follow-up foi mantido.
- Dashboard foi mantido.
