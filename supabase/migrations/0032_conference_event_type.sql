-- Zuvio — Migração 0032 (Fase 1 do módulo de Conferência, parte 1/2)
--
-- Adiciona 'conferencia' ao enum `tipo_evento`. Fica numa migração
-- separada de propósito: `ALTER TYPE ... ADD VALUE` não pode ser usado
-- na mesma transação em que o valor novo é referenciado (Postgres
-- bloqueia com "unsafe use of new value of enum type" até o commit) —
-- e a migração seguinte (0033) já referencia 'conferencia' nas
-- políticas de RLS de `conference_activities`.
alter type tipo_evento add value 'conferencia';
