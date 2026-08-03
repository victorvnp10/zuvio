# Arquitetura do Zuvio

## Camadas

```
src/
  domain/                    Regras de negócio puras. Zero dependência
    entities/types.ts          de Supabase, React ou qualquer infra.
    services/
      QuorumService.ts         ← mecânica de assinatura do produto
      ReliabilityService.ts
    valueObjects/
      Eligibility.ts            idade mínima + check-in geolocalizado

  application/               Orquestração: hooks React + contexto de
    context/AuthContext.tsx    auth. Usam o domínio e chamam a infra.
    hooks/
      useDiscoveryFeed.ts
      useEventDetail.ts
      useCreateEvent.ts
      useChat.ts
      useMyEvents.ts
      usePublicProfile.ts
      useSubmitRating.ts
      useModeration.ts

  infrastructure/supabase/   Detalhes técnicos: cliente, tipos das
    client.ts                  tabelas, conversão banco↔domínio.
    database.types.ts
    mappers.ts
    repositories/
      EventsRepository.ts
      CommitmentsRepository.ts
      ProfileRepository.ts
      ChatRepository.ts
      RatingsRepository.ts
      InvitesRepository.ts
      ModerationRepository.ts

  presentation/              Componentes e telas.
    layout/ (AppShell, BottomNav)
    components/ (QuorumMeter, CategoryBadge, TrustBadge, ChatPanel)
    screens/ (Auth, DiscoveryFeed, EventDetail, CreateEvent, MyEvents, Profile)
```

**Regra da dependência**: `domain/` não importa nada de `application/`,
`infrastructure/` ou `presentation/`. As telas falam com `application/`
(hooks), nunca direto com `infrastructure/`.

## Onde vive cada regra de negócio (e por quê em dois lugares)

A mecânica de quórum (seção 6.1 do briefing) existe em **dois lugares
deliberadamente**:

1. **`domain/services/QuorumService.ts`** (TypeScript, cliente) — usado
   para feedback otimista na UI (ex.: desabilitar o botão "Comprometer-se"
   antes mesmo da resposta do servidor chegar).
2. **`commit_to_event()` / `cancel_commitment()`** (SQL, no banco) — a
   fonte da verdade real, dentro de uma transação com `for update`
   (trava a linha do evento). É isso que impede duas pessoas
   confirmando a última vaga ao mesmo tempo de estourar
   `vagas_confirmadas > vagas_total` — uma condição de corrida real que
   só se resolve no servidor, nunca só no cliente.

O mesmo padrão vale para o score de confiabilidade
(`ReliabilityService.ts` no cliente, `recompute_reliability()` +
trigger no banco).

## Por que Supabase sem backend customizado

Row Level Security substitui a camada de autorização que normalmente
viveria num servidor Express/Fastify — cada política SQL em
`0001_initial_schema.sql` é comentada explicando qual regra do
briefing ela implementa (ex.: "chat só existe a partir do quórum",
"eventos Restritos nunca aparecem no feed público"). Regras que
precisam de atomicidade (confirmar presença, cancelar, check-in) viram
funções `security definer` no Postgres em vez de lógica no cliente —
isso é o equivalente, em Supabase, a uma camada de serviço/domínio no
backend tradicional.

## Design

Paleta e tipografia deliberadamente diferentes de outros projetos do
mesmo autor (DuoMatch é quente/plum; Zuvio é frio/azul-noturno +
coral), seguindo a diretriz do briefing de evitar os clichês de "gerado
por IA". A cor `quorum` (`#12E0B2`) é usada **exclusivamente** para o
estado de quórum atingido/chat liberado — nunca em mais nada na UI,
para que sempre sinalize esse momento específico.

## O que está implementado (MVP, seção 7 do briefing)

- [x] Cadastro/login (e-mail + senha; telefone fica para uma iteração futura)
- [x] Criar proposta (categoria, título, descrição, data, local, vagas, quórum, modalidade)
- [x] Entrar/comprometer-se em proposta (`commit_to_event`, atômico)
- [x] Liberação de chat ao atingir quórum mínimo (não só vagas esgotadas)
- [x] Check-in geolocalizado (raio de 100m, janela de horário) — validado no cliente E no servidor
- [x] Perfil básico (nome, data de nascimento nunca pública, localização base, gênero opcional)
- [x] Avaliação mútua pós-evento (RLS garante: só entre participantes com check-in confirmado)
- [x] Score de confiabilidade + selo (bronze/prata/ouro), recalculado automaticamente
- [x] Feed de descoberta público por categoria
- [x] Denúncia/bloqueio de usuário
- [x] Modalidade Restrita (convite por código não-adivinhável, com expiração/uso único)

## O que foi completado nesta rodada

- **Editar/cancelar proposta** (`MyEventsScreen`, `EditEventScreen`):
  só campos de conteúdo são editáveis (título, descrição, local, data)
  — vagas/quórum/modalidade/categoria ficam travados após a criação,
  de propósito (mudar isso depois quebraria a invariante do quórum ou a
  regra de visibilidade de eventos Restritos). "Excluir" é implementado
  como cancelamento (`status = 'cancelado'`), não uma exclusão física —
  quem já confirmou presença continua vendo que o evento existiu, em
  vez de ele simplesmente sumir sem explicação.
- **Avaliação mútua pós-evento** (`RatingSection`,
  `ParticipantRatingRow`): aparece na página do evento quando ele está
  `concluido` e o usuário fez check-in — lista os outros participantes
  que também fizeram check-in.
- **Denúncia e bloqueio** (`ReportMenu`): menu "..." na página do
  evento.
- **Captura de geolocalização na criação do evento**: botão "Usar
  minha localização atual" no formulário de criação — sem isso, o
  check-in geolocalizado nunca tinha coordenadas para validar contra.
- **Layout mais próximo de redes sociais conhecidas** (Instagram):
  cards do feed e de "Meus Eventos" ganharam capa em gradiente por
  categoria com o medidor de quórum sobreposto no canto (como uma foto
  de perfil sobre um story), e o carrossel de categorias não mostra
  mais a barra de rolagem (`scrollbar-hide` + `snap-x`).

## O que fica como próximo passo (fora do MVP, conforme seção 7-8 do briefing)

- **Modalidade Amigos/Híbrida**: o schema e o tipo já existem
  (`event_modality`), mas o fluxo de convite via grafo social não foi
  construído — hoje a tela de criação avisa que "Híbrida" funciona como
  "Estranhos" por enquanto.
- **Notificações push** (Web Push API): não implementado nesta rodada.
- **Stories/Reels, Clubes recorrentes, Monetização**: fases 2-4 do
  roadmap do briefing, propositalmente fora do MVP.
- **Code-splitting**: o bundle de produção ficou em ~550kB
  (aviso do Vite no build) — próximo passo natural é lazy-load das
  rotas com `React.lazy`, sem necessidade de refazer nada da
  arquitetura atual.

## Correção pós-deploy: recursão infinita em RLS

A política de SELECT de `commitments` continha uma subquery que
consultava a própria tabela `commitments` (para checar "outros
participantes do mesmo evento") — o Postgres não permite isso e gera
"infinite recursion detected in policy", que o PostgREST expõe como
erro 500. Como a política de `events` consulta `commitments`, criar/ler
qualquer evento também era afetado.

**Correção**: `is_event_participant()`, uma função `security definer`
(dona `postgres`, isenta da própria RLS por padrão) faz essa checagem
sem disparar a política de `commitments` recursivamente — o padrão
documentado pelo Supabase para este tipo de caso. Ver
`supabase/migrations/0002_fix_commitments_rls_recursion.sql` (para
quem já rodou a `0001` original) — a `0001` já vem corrigida para
instalações novas.

## Correção pós-deploy #2: recursão cruzada entre `events` e `commitments`

A correção anterior resolveu `commitments` consultando a si mesma, mas
sobrou um ciclo de duas tabelas: a política de `events` consultava
`commitments` diretamente, e a política de `commitments` consultava
`events` diretamente de volta — o Postgres rejeita isso do mesmo jeito
("infinite recursion detected in policy"), mesmo não sendo a mesma
tabela se autorreferenciando.

**Correção**: toda consulta cruzada entre `events`, `commitments` e
`invites` dentro de políticas de RLS agora passa por funções
`security definer` (`is_event_participant`, `is_event_creator`,
`has_redeemed_invite`) em vez de subqueries diretas — isso quebra
qualquer ciclo possível entre essas tabelas. Ver
`supabase/migrations/0003_fix_events_commitments_rls_recursion.sql`
(para quem já rodou `0001`/`0002`) — a `0001` já vem corrigida para
instalações novas, sem precisar de nenhuma migração incremental.

## Sistema de amigos + edição completa do evento

### Amigos (`friendships`, `friend_groups`, `friend_group_members`)

- **Amizade** é aceite mútuo (mesma filosofia do compromisso de
  eventos) — pedido enviado, a outra pessoa aceita ou recusa.
- **"Amigo"** é o grupo implícito: qualquer amizade aceita já conta
  como isso, sem precisar de nenhuma linha em `friend_groups`.
- **"Melhores Amigos"** é um grupo de sistema (`is_system = true`),
  criado automaticamente para todo usuário no cadastro (trigger
  `on_profile_created_default_friend_group`) — não pode ser renomeado
  nem excluído pela UI.
- **Grupos customizados** ("Amigos da escola", "Amigos do trabalho"):
  livres, o usuário nomeia como quiser. Um amigo pode estar em vários
  grupos ao mesmo tempo (`friend_group_members` é N:N).
- `are_friends(a, b)`: função `security definer`, pronta para ser usada
  pela Fase 1.2 (convite direcionado por grupo) sem risco de recursão
  de RLS — mesma técnica usada para resolver a recursão de
  `events`/`commitments`.

### Edição completa do evento

Reverti a trava que eu tinha colocado antes (vagas/quórum/categoria/
modalidade só editáveis na criação). Agora tudo é editável — as
constraints do banco (`quorum_within_vagas`, `vagas_within_total`) já
impediam estados inválidos, e a migração 0004 adiciona o gatilho que
faltava: recalcular `status` automaticamente quando `vagas_total`/
`quorum_minimo` mudam (ex.: reduzir o quórum para um valor já atingido
pelas confirmações atuais libera o chat na hora).

## Próximo passo natural: Fase 1.2 — convite direcionado por grupo

Ainda não implementado nesta rodada: na criação de um evento Amigos/
Híbrida, escolher uma ou mais listas (ou amigos individuais) para
convidar diretamente, com o convite aparecendo na Central de
Notificações do destinatário (sem push real ainda — isso é Fase 5).

## Login com Google + Google Calendar

### Por que existe uma Edge Function

O access_token do Google expira em ~1h. Renová-lo exige o Client
Secret do Google — um segredo que nunca pode existir no código do
cliente. Por isso toda a lógica de renovação de token e chamada à
Google Calendar API vive em `supabase/functions/sync-google-calendar/`,
rodando com a `service_role` key (que ignora RLS) — é o único lugar
com acesso de leitura/escrita em `google_tokens`, tabela que
propositalmente não tem NENHUMA policy de RLS para `anon`/
`authenticated`.

### Fluxo

1. `AuthContext.signInWithGoogle()` pede o escopo
   `calendar.events` (além do login em si), com
   `access_type=offline` + `prompt=consent` — sem isso, o Google não
   devolve um `refresh_token`, e depois de ~1h a sincronização para de
   funcionar sem forma de renovar.
2. Logo após o login, a sessão do Supabase traz `provider_token`/
   `provider_refresh_token` uma única vez — `AuthContext` captura isso
   no evento `SIGNED_IN` e chama a Edge Function (`action: "store_tokens"`)
   para guardar com segurança.
3. Ao confirmar presença (`useEventDetail.handleCommit`), o app chama
   a Edge Function (`action: "sync_event"`) — ela renova o token se
   necessário e cria/atualiza o evento na Agenda da pessoa. É
   best-effort: uma falha aqui nunca impede a confirmação de presença
   em si.
4. Ao cancelar, a Edge Function remove o evento correspondente da
   Agenda (`action: "remove_event"`).

### Cadastro com Google e o gate de perfil incompleto

Login com Google não fornece data de nascimento nem localização — os
dois passaram a ser colunas opcionais (migração 0008). `RequireAuth`
(em `App.tsx`) verifica `isProfileComplete(profile)` e redireciona
para `/completar-perfil` quando faltam esses dados, antes de liberar
qualquer outra tela. A verificação de idade mínima continua sendo
feita (só não pode mais ser um NOT NULL de coluna).

## Tipos de evento: Livre, Pago, Colaborativo

- **Livre** (padrão): sem nenhum dado extra — check-in e comprovante
  apresentados na entrada, fora do app.
- **Pago**: `valor_entrada` + `link_pagamento` — o app só guarda e
  mostra o link, nunca processa pagamento. Quem confirma presença pode
  se autodeclarar "já paguei" (`commitments.pagamento_confirmado`,
  alterado só via a função `confirm_payment` — `commitments` não tem
  UPDATE direto para o cliente em nenhum campo).
- **Colaborativo**: lista de itens (`collaborative_items`) — o modo
  (`predefinida`/`livre`/`mista`) decide se só o organizador pode
  adicionar itens ou se qualquer participante confirmado também pode.
  Tem também um custo opcional: valor fixo por pessoa, ou rateado pelo
  total de quem fez check-in de verdade (`computeRateioPerPerson` no
  domínio) — nunca por quem só confirmou e não apareceu.

## Correção crítica: ninguém conseguia confirmar presença

`commit_to_event` e `cancel_commitment` usavam um `CASE` com literais de
texto simples (`'aberto'`, `'fechado'`, etc.) atribuído direto a
`status` (tipo `event_status`, um enum) dentro de um `UPDATE ... SET`.
O Postgres resolve o tipo de um `CASE` assim como `text` — ele não
"olha para frente" para a coluna de destino, mesmo dentro do mesmo
UPDATE. Resultado: erro `column "status" is of type event_status but
expression is of type text` para QUALQUER usuário tentando confirmar
presença (ou cancelar) — quebrava desde a primeira instalação, só não
tinha sido testado ainda até agora.

**Correção**: cast explícito `(case ... end)::event_status`. Ver
`supabase/migrations/0010_fix_status_type_cast.sql` — a `0001` já vem
corrigida para instalações novas.

## Correção: chat e placar não atualizavam em tempo real

Nenhuma tabela do Supabase transmite mudanças via Realtime por
padrão — precisa ser adicionada explicitamente à publicação
`supabase_realtime`. O código de assinatura
(`ChatRepository.subscribeToMessages`, `EventsRepository.subscribeToEvent`)
sempre esteve correto, mas sem esse passo no banco ele nunca recebia
nada — só uma recarga da página buscava o estado atual. Ver
`supabase/migrations/0011_enable_realtime_chat.sql`.

## Correção: chat invisível para o organizador

O organizador nunca tem uma linha em `commitments` (não passa pelo
fluxo de "comprometer-se" no próprio evento), e as políticas de RLS do
chat exigiam justamente essa linha para liberar leitura/escrita — o
chat ficava bloqueado e invisível para quem criou o evento, mesmo após
o quórum ser atingido. Corrigido usando `is_event_creator` como
condição alternativa (ver migração 0012), e a tela agora mostra o
`ChatPanel` também quando `isCreator` é verdadeiro, não só quando há
compromisso confirmado.
