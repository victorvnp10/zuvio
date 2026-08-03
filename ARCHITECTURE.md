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

## O que fica como próximo passo (fora do MVP, conforme seção 7-8 do briefing)

- **Modalidade Amigos/Híbrida**: o schema e o tipo já existem
  (`event_modality`), mas o fluxo de convite via grafo social não foi
  construído — hoje a tela de criação avisa que "Híbrida" funciona como
  "Estranhos" por enquanto.
- **Geolocalização na criação do evento**: o formulário de criação
  pede um endereço em texto, mas não captura coordenadas (mapa/GPS) —
  por isso o check-in só fica disponível para eventos com
  `geo_lat`/`geo_lng` preenchidos manualmente (ex.: direto no Supabase
  Studio, por ora).
- **Notificações push** (Web Push API): não implementado nesta rodada.
- **Stories/Reels, Clubes recorrentes, Monetização**: fases 2-4 do
  roadmap do briefing, propositalmente fora do MVP.
- **Code-splitting**: o bundle de produção ficou em ~530kB
  (aviso do Vite no build) — próximo passo natural é lazy-load das
  rotas com `React.lazy`, sem necessidade de refazer nada da
  arquitetura atual.
