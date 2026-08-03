-- =============================================================================
-- Zuvio — Migração 0011: habilita Realtime para chat_messages e events
-- =============================================================================
-- Por padrão, nenhuma tabela do Supabase transmite mudanças em tempo
-- real — é preciso adicionar explicitamente à publicação
-- `supabase_realtime`. Sem isso, o código de assinatura
-- (`ChatRepository.subscribeToMessages`, `EventsRepository.subscribeToEvent`)
-- fica esperando para sempre; só aparecem mudanças quando a página é
-- recarregada (busca manual), nunca ao vivo. `events` tem o mesmo
-- mecanismo por trás do placar de vagas/quórum em tempo real — mesmo
-- não relatado ainda, é o mesmo problema.
-- =============================================================================

alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table events;
