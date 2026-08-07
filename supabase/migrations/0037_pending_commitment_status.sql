-- Zuvio — Migração 0037 (Aprovação de inscrições, parte 1/2)
--
-- Dois status novos de commitment, usados quando o evento exige
-- aprovação do organizador antes de contar como presença confirmada:
--
--   'pendente'  — inscrição enviada, aguardando decisão do organizador
--   'rejeitado' — organizador recusou a inscrição
--
-- 'rejeitado' é DIFERENTE de 'cancelado' de propósito: `cancelado`
-- entra na conta de confiabilidade/reputação de quem cancela (ver
-- `recompute_reliability`, migração 0001/0030) — descontar pontos de
-- alguém só porque o ORGANIZADOR recusou a inscrição seria injusto
-- (a pessoa não fez nada errado). Como 'rejeitado' fica de fora do
-- filtro `status in ('check-in', 'no-show', 'cancelado')' usado no
-- cálculo de reputação, ele nunca entra nessa conta.
--
-- Precisa ser uma migração isolada, só com os ALTER TYPE: Postgres não
-- permite usar um valor de enum recém-adicionado (em comparação,
-- função, RLS etc.) na MESMA transação em que ele foi criado — mesmo
-- motivo do 0032.

alter type commitment_status add value 'pendente';
alter type commitment_status add value 'rejeitado';
