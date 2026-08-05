-- =============================================================================
-- Zuvio — Migração 0014: exclusão real para eventos sem quórum atingido
-- =============================================================================
-- Até aqui, "excluir" um evento sempre virava um cancelamento (soft),
-- para não sumir sem explicação com quem já tinha confirmado presença.
-- Mas antes do quórum ser atingido, ninguém "de fora" depende daquele
-- evento como um compromisso firmado — faz sentido permitir exclusão
-- de verdade nesse caso. Depois de atingido o quórum (`quorum_atingido`
-- ou `fechado`), só cancelamento continua sendo permitido.
-- =============================================================================

create policy "Criador exclui de verdade evento sem quórum atingido"
  on events for delete
  to authenticated
  using (criador_id = auth.uid() and status = 'aberto');
