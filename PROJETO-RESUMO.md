# Zuvio — Resumo completo do projeto e base de conhecimento

> Este documento existe para que o desenvolvimento possa continuar em
> outra conversa/aba, sem precisar reler todo o histórico do chat
> anterior. Leia isto primeiro; para detalhes técnicos linha-a-linha de
> cada decisão, o arquivo `ARCHITECTURE.md` (dentro do próprio projeto)
> tem o registro cronológico completo.

---

## 1. O que é o Zuvio

Rede social de eventos por **compromisso mútuo real**: o chat de um
evento só libera quando um número mínimo de pessoas (quórum) confirma
presença de verdade — não é curtida, não é "interessado". A mecânica
central do produto inteiro gira em torno desse quórum.

Stack: **React + Vite + TypeScript + Tailwind v4 + Supabase** (Postgres
+ Auth + Realtime + Storage + Edge Functions + RLS). Sem backend
customizado — tudo que precisaria de um servidor próprio vive em
funções Postgres (`security definer`) ou em uma Edge Function (Deno),
só para o que exige segredo (Google OAuth).

Arquitetura em camadas (DDD/Clean Architecture):
```
src/domain/          → regras de negócio puras, zero dependência externa
src/application/     → hooks React (orquestram domínio + infraestrutura)
src/infrastructure/  → Supabase (client, repositórios, mappers, tipos do banco)
src/presentation/    → telas, componentes, layout
```
Regra de dependência: `domain` nunca importa nada de fora dele.

---

## 2. Estado atual — o que está pronto e funcionando

### Autenticação
- E-mail/senha (cadastro pede nome, data de nascimento — nunca exibida
  publicamente, só verifica 18+ —, localização, gênero opcional)
- **Login com Google** (OAuth via Supabase), incluindo pedir o escopo
  `calendar.events` para a sincronização de agenda
- Perfis criados via Google não trazem data de nascimento/localização
  → tela `CompleteProfileScreen` obrigatória antes de liberar o resto
  do app (`isProfileComplete()` + gate em `RequireAuth`, `App.tsx`)

### Eventos
- CRUD completo: criar, editar (**tudo** é editável, inclusive vagas e
  quórum — com recálculo automático de status), **excluir de verdade**
  (só antes do quórum ser atingido) ou **cancelar** (soft, depois do
  quórum — mantém histórico pra quem já confirmou)
- Capa do evento (upload de imagem, com fallback num gradiente por
  categoria — `CATEGORY_COVER`)
- **Tipos de evento**: Livre (padrão) / Pago (valor + link de
  pagamento, autoconfirmação de "já paguei") / Colaborativo (lista de
  itens "o que levar" + custo opcional fixo-por-pessoa ou rateado entre
  quem fez check-in de verdade)
- Modalidades: Aberta a estranhos / Só amigos (convite) / Híbrida
  (pública, igual "estranhos") / Restrita (só por convite)
- Check-in geolocalizado (raio de 100m, janela de horário) — a
  localização do evento é capturada na criação via GPS do organizador

### Quórum e compromisso
- `commit_to_event` / `cancel_commitment` / `checkin_event`: funções
  Postgres `security definer`, atômicas (`for update` trava a linha do
  evento — impede duas pessoas confirmando a última vaga ao mesmo
  tempo)
- `QuorumMeter`: o anel de progresso — elemento de assinatura visual,
  cor exclusiva (`--color-quorum-500`) reservada só para esse estado

### Amigos
- Amizade com aceite mútuo (`friendships`)
- "Melhores Amigos" é um grupo de sistema criado automaticamente pra
  todo mundo; grupos customizados livres (`friend_groups` +
  `friend_group_members`)
- Tela `FriendsScreen`: buscar/adicionar, pedidos pendentes, gerenciar
  grupos

### Convites
- Modalidade Amigos/Restrita: seletor de amigos+grupos na criação
  (`FriendGroupSelector` — marcar um grupo seleciona todos os membros)
- Para Restrita: o mesmo convite gera um **link compartilhável**
  (`/convite/:codigo`) — quem abrir sem conta é levado ao cadastro e,
  depois de autenticar (e-mail/senha OU Google), é resgatado
  automaticamente e redirecionado pro evento (`InviteRedeemScreen` +
  checagem central em `RequireAuth` via `sessionStorage`)

### Google Calendar
- Ao confirmar presença → evento é criado na Agenda do Google de quem
  confirmou (best-effort, nunca bloqueia a ação em si)
- Ao **criar** um evento → também vai pra agenda do **organizador**
  (campo separado, `organizador_google_calendar_event_id` —
  organizador nunca passa pelo fluxo de "comprometer-se" no próprio
  evento, por isso precisa de um caminho à parte)
- Editar/cancelar atualiza ou remove da agenda também
- Tudo isso passa por uma **Edge Function**
  (`supabase/functions/sync-google-calendar/index.ts`) — o token de
  acesso do Google expira em ~1h e renová-lo exige o Client Secret, que
  nunca pode existir no cliente

### Chat
- Libera automaticamente quando o quórum é atingido
- Realtime via Supabase (**precisa estar habilitado explicitamente na
  publicação** — ver seção de gotchas)
- Organizador tem acesso ao chat mesmo sem ter uma linha em
  `commitments` (é um caso especial tratado na política de RLS)

### Fotos, curtidas, comentários
- Fotos do evento: participantes/organizador postam, escolhendo
  visibilidade "só do evento" ou "pública"
- Cada foto pode ser curtida e comentada (mini-post, estilo Instagram)
- Curtida de EVENTO é separada de "Participar" (são ações diferentes:
  curtir é engajamento leve; participar é o compromisso real)
- Toda imagem enviada (capa, fotos, foto de perfil) passa por
  **compressão automática no navegador** antes do upload
  (`shared/imageCompression.ts` — redimensiona a 1280px, JPEG 75%,
  igual o Instagram faz)

### Avaliação, denúncia, bloqueio
- Avaliação mútua pós-evento (só entre quem fez check-in de verdade)
- Score de confiabilidade + selo (bronze/prata/ouro), recalculado
  automaticamente
- Denúncia e bloqueio de usuário

### Feed de descoberta
- Ordenado por **proximidade social**: eventos de amigos primeiro,
  depois eventos onde algum amigo já confirmou presença, depois o
  resto (`FeedRankingService.ts`) — a privacidade é decidida antes
  disso, na RLS; isto só reordena o que a pessoa já podia ver
- Modalidade "Amigos" só aparece pra amigos de verdade do organizador
  (corrigido — antes vazava pra qualquer um)

### Navegação / identidade visual (EM TRANSIÇÃO — ver seção 4)
- Barra inferior de 5 posições estilo Instagram: Descobrir, Amigos,
  Criar (centro), Meus Eventos, Perfil (foto redonda da própria pessoa)
- Paleta: azul-noturno frio (`ink-*`) + coral quente (`coral-*`,
  energia/CTA) + dourado (`amber-500`, valor/pagamento) + verde-água
  exclusivo (`quorum-*`, reservado só pro estado de quórum atingido)
- Tipografia: Space Grotesk (display) + Inter (texto)

---

## 3. Esquema do banco — todas as migrações (rodar em ordem)

Arquivo por arquivo, em `supabase/migrations/`, cada um deve ser colado
no SQL Editor do Supabase e rodado **na ordem**:

| # | Arquivo | O que faz |
|---|---|---|
| 0001 | `initial_schema.sql` | Schema base inteiro: profiles, events, invites, commitments, chat_messages, ratings, reports, blocks + RLS + funções (`commit_to_event`, `cancel_commitment`, `checkin_event`, `redeem_invite`, `recompute_reliability`, `handle_new_user`) |
| 0002 | `fix_commitments_rls_recursion.sql` | Corrige recursão infinita de RLS (política de `commitments` consultava a si mesma) |
| 0003 | `fix_events_commitments_rls_recursion.sql` | Corrige recursão **cruzada** entre `events`↔`commitments` (mesmo tipo de bug, entre duas tabelas) |
| 0004 | `editable_vagas_quorum.sql` | Libera edição de vagas/quórum depois de criado, com trigger que recalcula `status` |
| 0005 | `friends_system.sql` | Sistema de amigos completo (friendships, friend_groups, friend_group_members, `are_friends()`) |
| 0006 | `event_types_and_collaborative_list.sql` | Tipos de evento (livre/pago/colaborativo) + lista colaborativa (`collaborative_items`) + `confirm_payment()` |
| 0007 | `google_calendar_integration.sql` | Tabela `google_tokens` (sem policy de RLS pro cliente — só a Edge Function acessa via service_role) + `commitments.google_calendar_event_id` |
| 0008 | `google_signup_support.sql` | Relaxa `data_nascimento`/`localizacao_base` para NULL (login Google não fornece) |
| 0009 | `organizer_calendar_sync.sql` | Campo `events.organizador_google_calendar_event_id` |
| 0010 | `fix_status_type_cast.sql` | **Bug crítico**: CASE com literais de texto vira `text`, não o enum `event_status`, dentro de UPDATE puro — quebrava `commit_to_event`/`cancel_commitment` pra QUALQUER usuário. Cast explícito `::event_status` |
| 0011 | `enable_realtime_chat.sql` | `alter publication supabase_realtime add table chat_messages, events;` — sem isso, nada de Realtime funciona, mesmo com o código certo |
| 0012 | `organizer_chat_access.sql` | Organizador não tinha linha em `commitments` → política de chat não deixava ele ler/escrever. Corrigido com `is_event_creator()` |
| 0013 | `cover_photos_and_amigos_privacy.sql` | Corrige privacidade da modalidade "Amigos" (usa `are_friends()`) + `events.capa_url` + `event_photos` (tabela) + bucket `event-media` no Storage |
| 0014 | `delete_events_without_quorum.sql` | Política de DELETE: só antes do quórum ser atingido |
| 0015 | `likes_and_photo_comments.sql` | `event_likes`, `event_photo_likes`, `event_photo_comments` |

**Funções de segurança reutilizáveis** (evitam recursão de RLS,
todas `security definer`): `is_event_creator`, `is_event_participant`,
`has_redeemed_invite`, `are_friends`.

---

## 4. Identidade visual — proposta aprovada, implementação EM ANDAMENTO

O usuário pediu uma identidade própria (a interface tava "boa mas
genérica, parecia só um clone do Instagram"). Foi proposto e
**aprovado** o conceito **"O Convite" 🎟️**:

> Instagram é retrospectivo (fotos do que já aconteceu). Zuvio é
> prospectivo — um convite pra algo que ainda vai acontecer, com prazo
> e um número mínimo de gente pra valer. Por isso o card virou uma
> **ficha de ingresso**, não um post de foto.

**As duas assinaturas visuais**:
1. **Faixa perfurada de canhoto de ingresso** entre a imagem e o texto
   (classe CSS `.ticket-stub-divider` em `src/index.css` — dois
   recortes circulares nas bordas, como um ingresso de verdade)
2. **Anel de quórum sempre no mesmo canto** da imagem (já existia como
   `QuorumMeter`, agora fixado como selo flutuante sobre a foto)

**Emprestado de referências, resolvido pro nosso mecanismo real**:
- Do Tinder: botão "Participar" decisivo (vira "Participando ✓"),
  separado de "curtir" (curtida agora é uma ação de verdade,
  independente); o momento de quórum atingido ganha uma celebração
  (confete, só na transição, nunca a cada render)
- Do TikTok: selos (categoria, contagem regressiva "faltam Xd"/"HOJE"/
  "AGORA") flutuando direto na imagem, sem caixinha, com scrim de
  gradiente pra legibilidade
- Do Instagram: mantida a barra inferior de 5 posições (reconhecimento
  do público), com o botão central de Criar agora um círculo coral
  preenchido (mais peso visual, "esse é o verbo do app")

O protótipo estático aprovado (HTML autocontido, sem dependência de
build) está descrito no chat anterior — se precisar recriá-lo, é só
pedir "recrie o protótipo HTML da identidade visual O Convite" citando
este documento.

### O que JÁ foi implementado dessa identidade (arquivos já tocados):

- `src/index.css` — `.ticket-stub-divider` e `.confetti-piece`
  (keyframe `confetti-fall`) adicionados
- `src/domain/valueObjects/EventTiming.ts` — **novo**, `getCountdownLabel()` e `isUrgent()`
- `src/application/hooks/useQuorumCelebration.ts` — **novo**, detecta a
  transição pra quórum atingido (só dispara uma vez)
- `src/presentation/components/Confetti.tsx` — **novo**, componente de
  celebração
- `src/presentation/components/CategoryBadge.tsx` — adicionado
  `CATEGORY_DOT` (cor sólida do pontinho de categoria no selo)
- `src/presentation/components/EventPostCard.tsx` — **reescrito por
  completo** no novo layout (imagem com selos flutuantes + anel de
  quórum + pilha de avatares no canto, faixa perfurada, título embaixo
  da imagem, ações + botão Participar decisivo, curtidas, organizador
  no rodapé com avatar)
- `src/presentation/layout/BottomNav.tsx` — botão central "Criar"
  trocado pra círculo coral preenchido (era caixa com contorno)

### Status desta leva (atualizado — passos 1 e 2 concluídos):

1. ✅ **`EventDetailScreen.tsx`** — já estava com o conceito completo do
   `EventPostCard`: selos flutuantes na imagem, faixa perfurada,
   `useQuorumCelebration` + `<Confetti />`, `getCountdownLabel`.
2. ✅ **`MyEventsScreen.tsx`** — `EventCard` interno atualizado: recebeu
   selos flutuantes de categoria (pontinho colorido, `CATEGORY_DOT`) e
   contagem regressiva/confirmado (`getCountdownLabel`/`isUrgent`),
   substituindo o `CategoryBadge` antigo. Mantido compacto de propósito
   (sem faixa perfurada, sem confete — é lista de gestão).
3. ✅ **Build validado** (`npm install && npx tsc -b && npm run
   build`) — rodado depois dessas mudanças, sem erros.
4. ✅ **Empacotado e entregue** — zip desta leva já entregue ao usuário.

### Próximos passos (para a próxima sessão continuar):

1. Considerar levar a faixa perfurada + confete também pro
   `MyEventsScreen`, se o usuário aprovar o visual atual e quiser
   unificar por completo (hoje é intencionalmente mais simples ali).
2. Nenhuma migração de banco pendente relacionada a esta identidade
   visual.

### Conferência contra o protótipo HTML aprovado (`proposta-identidade-visual.html`)

O protótipo estático foi reenviado e conferido linha a linha contra a
implementação React. Único gap encontrado e corrigido: a pilha de
avatares confirmados (`ConfirmedStack` em `EventPostCard.tsx`) não
mostrava o selo **"+N"** de overflow quando há mais de 3 confirmados
(visível no protótipo no card "5/5" — M, J, P, +2). Corrigido: agora
renderiza um círculo `+{extra}` do mesmo tamanho (20px) ao final da
pilha quando `participantIds.length > 3`. Resto já batia: wordmark
"Zuv**i**o" com o "i" em coral, anel de quórum com label X/Y, divisória
perfurada, selos flutuantes, confete na transição.

**Nenhuma migração de banco nova é necessária pra essa parte** — é só
código do app (CSS + componentes React).

---

## 5. Bugs reais encontrados e corrigidos (para não repetir)

Vale a pena ler antes de continuar — são padrões que mordem de novo se
esquecidos:

1. **RLS "infinite recursion detected in policy"**: acontece tanto
   quando uma política de uma tabela consulta a **si mesma** quanto
   quando duas tabelas se consultam **uma à outra** dentro de suas
   políticas (`events` ⟷ `commitments`). A solução sempre foi a mesma:
   uma função `security definer` (dona `postgres`, isenta da própria
   RLS por padrão) faz a checagem sem re-disparar a política de
   ninguém. Funções desse tipo já existem prontas: `is_event_creator`,
   `is_event_participant`, `has_redeemed_invite`, `are_friends` — use
   essas antes de escrever uma nova subquery cruzada entre tabelas.
2. **CASE com literais de texto vira `text`, não o enum de destino**,
   dentro de um `UPDATE ... SET coluna = (CASE ...)` puro em SQL — o
   Postgres não usa o tipo da coluna como contexto pros literais
   dentro do CASE (diferente de uma atribuição direta `coluna =
   'valor'`, que funciona). Sempre um cast explícito:
   `(case ... end)::nome_do_enum`. Isso NÃO afeta atribuição PL/pgSQL
   (`variavel := case ... end;` funciona sem cast, é um caminho de
   coerção de tipo diferente).
3. **Nenhuma tabela do Supabase transmite Realtime por padrão** —
   precisa ser adicionada explicitamente à publicação
   `supabase_realtime` (`alter publication supabase_realtime add table
   nome_da_tabela;`). Sem isso, o código de assinatura fica esperando
   pra sempre, e só uma recarga de página busca o estado atual.
4. **`app_metadata.provider` reflete o método ORIGINAL de cadastro da
   conta**, não o provedor usado NESTA sessão — uma conta criada por
   e-mail e depois vinculada ao Google sempre mostra `provider:
   "email"`. Pra saber se ESTA sessão veio de OAuth, use a presença de
   `session.provider_token`, nunca `app_metadata.provider`.
5. **O organizador de um evento nunca tem uma linha em
   `commitments`** (não passa pelo fluxo de "comprometer-se" no próprio
   evento) — qualquer feature nova que dependa de `commitments` pra
   decidir acesso (chat, fotos, Google Calendar) precisa de um caminho
   separado pro organizador, verificando `criador_id = auth.uid()` em
   vez de assumir que ele tem compromisso.
6. **O client Supabase NÃO usa o generic `<Database>` estrito** — o
   formato exato que o supabase-js espera (Row/Insert/Update/
   Relationships por tabela) só compila 100% certo quando gerado direto
   de um projeto real (`supabase gen types`). Em vez disso, a segurança
   de tipos fica nos mappers (`infrastructure/supabase/mappers.ts`),
   que convertem cada resposta pros tipos de domínio antes de chegar em
   qualquer hook.
7. **Migrações não podem referenciar funções/tabelas de migrações
   futuras** — ao corrigir algo no arquivo `0001` (fresh installs), só
   mexa em partes que não dependem de nada criado depois (ex.: não dá
   pra usar `are_friends()` dentro da política de `events` no `0001`,
   porque essa função só existe a partir do `0005`). Correções que
   dependem de algo posterior viram sempre uma migração numerada nova
   no final, nunca um edit retroativo no `0001`.

---

## 6. Setup/deploy — checklist de referência

- **Supabase**: projeto já criado (`bhhermoidcwneygiafnr.supabase.co`),
  todas as 15 migrações já rodadas
- **Google Cloud**: credenciais OAuth já criadas e configuradas
  (Client ID/Secret no Supabase Auth Provider E como secrets da Edge
  Function via `supabase secrets set`)
- **Edge Function**: `sync-google-calendar` já publicada
  (`supabase functions deploy sync-google-calendar`)
- **Vercel**: app já publicado, variáveis de ambiente
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) já configuradas
- **GitHub**: repositório `victorvnp10/zuvio`, pasta local
  `C:\Users\victorvnp.DIRENS\Documents\GitHub\zuvio` (⚠️ reparar que em
  algum momento apareceu uma pasta `zuvio\zuvio` aninhada — confirmar
  que não é uma cópia duplicada acidental)
- Fluxo de entrega padrão usado durante todo o desenvolvimento: editar
  código → `npm install` (se `node_modules` não existir) → `npx tsc -b`
  → `npm run build` (com `.env` placeholder) → limpar `node_modules`/
  `dist`/`.env` → zipar → entregar. Migrações SQL sempre entregues como
  arquivo novo numerado, nunca editando uma já rodada.

---

## 7. Arquivos de referência dentro do próprio projeto

- `README.md` — passo a passo de instalação do zero (Supabase, GitHub,
  Vercel, Google)
- `ARCHITECTURE.md` — registro cronológico detalhado de cada decisão
  de arquitetura tomada ao longo do desenvolvimento (mais granular que
  este resumo)
