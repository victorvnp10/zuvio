# Zuvio

Rede social de eventos por compromisso mútuo — o chat só libera quando o
quórum mínimo de confirmações reais é atingido (não curtida, não
"interessado"). MVP conforme `zuvio-plano-negocio-e-especificacao.md`.

Este guia parte do zero: nenhuma conta criada ainda em nenhum dos três
serviços (Supabase, GitHub, Vercel).

---

## Passo 1 — Criar o projeto no Supabase (banco + autenticação)

1. Crie uma conta em [supabase.com](https://supabase.com) (dá para
   entrar direto com GitHub).
2. **New Project** → escolha um nome (ex.: `zuvio`), uma senha para o
   banco (guarde em local seguro — raramente precisa dela depois) e a
   região mais perto de onde seus usuários estarão.
3. Espere o projeto provisionar (1-2 minutos).
4. No menu lateral, abra o **SQL Editor** → **New query**.
5. Rode, **em ordem**, todos os arquivos de `supabase/migrations/`:
   `0001_initial_schema.sql`, `0002_fix_commitments_rls_recursion.sql`,
   `0003_fix_events_commitments_rls_recursion.sql`,
   `0004_editable_vagas_quorum.sql`, `0005_friends_system.sql`,
   `0006_event_types_and_collaborative_list.sql`,
   `0007_google_calendar_integration.sql`,
   `0008_google_signup_support.sql`. Para cada um: copie o conteúdo,
   cole no editor e clique em **Run** — espere "Success" antes de ir
   para o próximo. Isso cria todas as tabelas, as políticas de
   segurança (RLS), o sistema de amigos e as funções do backend.
   - Se der erro de "relation already exists" (rodou duas vezes sem
     limpar), rode antes: `drop schema public cascade; create schema public;`
     — só faça isso se ainda não tiver dados de teste que importam.
6. Confirme que o e-mail/senha está habilitado como método de login:
   **Authentication → Providers → Email** deve estar **Enabled**
   (já vem assim por padrão).
7. Em **Project Settings → API**, copie dois valores — vai precisar
   deles no Passo 3:
   - **Project URL**
   - **anon public** key (a chave pública, não a `service_role`)

---

## Passo 2 — Subir o projeto para o GitHub

1. Crie uma conta em [github.com](https://github.com), se ainda não tiver.
2. Crie um repositório novo (**New repository**) — pode ser privado.
   Não inicialize com README/gitignore (este projeto já tem os dois).
3. Na pasta do projeto, no terminal:
   ```bash
   git init
   git add .
   git commit -m "Zuvio MVP"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```
   O arquivo `.env` (com suas chaves) **não vai junto** — está no
   `.gitignore` de propósito, para as chaves não ficarem expostas
   publicamente no repositório.

---

## Passo 3 — Publicar na Vercel

1. Crie uma conta em [vercel.com](https://vercel.com) — o mais simples
   é entrar direto com sua conta do GitHub (facilita a próxima etapa).
2. **Add New → Project** → selecione o repositório que você acabou de
   subir.
3. A Vercel detecta automaticamente que é um projeto Vite — não precisa
   mudar nada em "Build Command" nem "Output Directory" (`npm run
   build` e `dist`, respectivamente, já vêm certos).
4. Antes de clicar em **Deploy**, abra a seção **Environment Variables**
   e adicione as duas chaves do Passo 1:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | a Project URL do Supabase |
   | `VITE_SUPABASE_ANON_KEY` | a anon public key do Supabase |

   Marque para os três ambientes (Production, Preview, Development).
5. Clique em **Deploy**. Em 1-2 minutos o app estará no ar num endereço
   tipo `https://seu-projeto.vercel.app`.

### Se esquecer de adicionar as variáveis antes do deploy

Adicione depois em **Project Settings → Environment Variables**, e então
force um novo build: **Deployments** → menu "..." do deploy mais
recente → **Redeploy**. A Vercel só aplica variáveis novas em builds
futuros, nunca retroativamente.

---

## Passo 4 — Testar

1. Acesse a URL da Vercel, crie uma conta (**Criar conta**).
2. Se aparecer algum erro de rede ao cadastrar/logar, quase sempre é
   uma das duas variáveis de ambiente erradas ou faltando — confira
   com calma se copiou a URL e a chave certas do Supabase (sem espaços
   nem caracteres a mais na frente).
3. Crie uma proposta de evento e confira no **Table Editor** do
   Supabase (tabela `events`) se ela apareceu — é o sinal de que a
   conexão entre app, Supabase e Vercel está tudo certa.

---

## Desenvolvimento local (opcional, além do deploy)

```bash
npm install
cp .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
# (as mesmas chaves do Passo 1)
npm run dev
```

### Gerar tipos reais do banco (recomendado depois que o projeto existir)

O arquivo `src/infrastructure/supabase/database.types.ts` foi escrito à
mão, espelhando a migração SQL. Para ter os tipos exatos do seu projeto:

```bash
npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/infrastructure/supabase/database.types.ts
```

(O `SEU_PROJECT_ID` aparece na URL do painel do Supabase ou em
**Project Settings → General**.)

### Build de produção local

```bash
npm run build
```

Gera `dist/` com o service worker, manifest e ícones do PWA já
configurados — é exatamente o que a Vercel roda automaticamente a cada
push.

---

## Passo 5 — Login com Google + sincronização com a Agenda (opcional)

Essa parte precisa de configuração fora do código, no Google Cloud e
no Supabase. Sem ela, o app funciona normalmente com e-mail/senha —
é só o botão "Continuar com Google" que fica sem efeito.

### 5.1 — Criar as credenciais OAuth no Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) → crie um projeto (ou use um existente).
2. **APIs e serviços → Tela de consentimento OAuth**: configure como
   "Externo", preencha nome do app, e-mail de suporte. Não precisa
   submeter para verificação enquanto estiver testando com poucos
   usuários (modo "Testing").
3. **APIs e serviços → Biblioteca**: busque e ative a **Google Calendar API**.
4. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo Web**.
   - **Origens JavaScript autorizadas**: a URL do seu app na Vercel
     (e `http://localhost:5173` para testar local).
   - **URIs de redirecionamento autorizados**: a URL de callback do
     Supabase — algo como
     `https://SEU_PROJETO.supabase.co/auth/v1/callback`
     (o Supabase mostra essa URL exata na tela do próximo passo).
5. Copie o **Client ID** e o **Client Secret** gerados.

### 5.2 — Conectar o Google como provedor no Supabase

1. No painel do Supabase: **Authentication → Providers → Google**.
2. Ative, cole o **Client ID** e **Client Secret** do passo anterior.
3. Copie a **Callback URL** mostrada ali e confirme que é a mesma que
   você colocou no Google Cloud no passo 5.1.

### 5.3 — Deploy da Edge Function (sincronização com a Agenda)

A troca seria do token do Google (necessária para acessar a agenda
depois que o access_token expira) exige o Client Secret — por isso
roda numa Edge Function, nunca no navegador. Com a
[Supabase CLI](https://supabase.com/docs/guides/cli) instalada:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_ID
supabase functions deploy sync-google-calendar

# Segredos da função (nunca vão para o código do cliente):
supabase secrets set GOOGLE_CLIENT_ID=seu_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=seu_client_secret
```

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já ficam disponíveis
automaticamente em toda Edge Function do projeto — não precisa
configurar esses dois.

### O que acontece depois de configurado

- No login com Google, o app pede também permissão de escrever na
  Agenda (`calendar.events`) — a pessoa vê essa permissão na tela de
  consentimento do próprio Google.
- Sempre que alguém confirma presença num evento, o app tenta criar
  um evento correspondente na Agenda do Google dela automaticamente
  (best-effort — se falhar, não impede a confirmação de presença).
- Ao cancelar a presença, o evento correspondente é removido da
  Agenda.

---

## Arquitetura

Veja [`ARCHITECTURE.md`](./ARCHITECTURE.md) para a organização em
camadas, as decisões de design e o que está implementado vs. planejado
para as próximas fases.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS v4 (config CSS-first, ver `src/index.css`)
- Supabase (Postgres + Auth + Realtime + RLS) — sem backend customizado
- Edge Function (Deno) para a integração com o Google Calendar
- React Router + TanStack Query
- PWA via `vite-plugin-pwa`
- Deploy: Vercel
