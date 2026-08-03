-- =============================================================================
-- Zuvio — Migração 0009: sincronização da agenda para o ORGANIZADOR
-- =============================================================================
-- A sincronização original só acontecia em `commit_to_event` — ou seja,
-- só para quem CONFIRMA presença. O criador do evento nunca passa por
-- esse fluxo no próprio evento (não existe botão "Comprometer-se" nele
-- mesmo), então o evento nunca ia para a agenda dele. Este campo
-- guarda esse vínculo separadamente, sem mexer em `commitments` nem em
-- vagas_confirmadas/quórum — o organizador ter o evento na própria
-- agenda não deveria contar como uma confirmação de presença "de
-- verdade" para efeitos de quórum.
-- =============================================================================

alter table events add column organizador_google_calendar_event_id text;
