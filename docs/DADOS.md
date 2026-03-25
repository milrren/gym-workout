# Documentação: Registro de Dados e Gestão de Acesso

## Índice
1. [Visão Geral](#visão-geral)
2. [Regras de Acesso](#regras-de-acesso)
3. [Identidade do Usuário](#identidade-do-usuário)
4. [Fluxo de Migração](#fluxo-de-migração)
5. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
6. [Segurança](#segurança)
7. [Verificação de Integridade](#verificação-de-integridade)

---

## Visão Geral

Fichas e sessões de treino são persistidas no **MongoDB Atlas** para todos os usuários — com ou sem login. A diferença está em como o usuário é identificado e por quanto tempo seus dados são mantidos.

> **Não há mais uso de `localStorage`**. O banco é a única fonte de verdade.

```
Usuário Anônimo  →  Cookie httpOnly (UUID)  →  MongoDB  →  Expira em 30 dias
Usuário Logado   →  Session (Auth.js)       →  MongoDB  →  Nunca expira
```

---

## Regras de Acesso

### Usuário Anônimo

| Regra | Detalhe |
|---|---|
| Identificação | Cookie `gym-workout-guest-id` (httpOnly, UUID v4) |
| Geração do cookie | Automática no servidor na primeira chamada a qualquer API route |
| Acesso aos dados | Somente no dispositivo que possui o cookie |
| Expiração dos dados | 30 dias a partir da criação (TTL index no MongoDB) |
| Visibilidade do UUID | **Zero** — o cookie é httpOnly, JavaScript do client nunca acessa |
| Cross-device | **Não** — dados ficam presos ao dispositivo/navegador |

### Usuário Autenticado

| Regra | Detalhe |
|---|---|
| Identificação | `session.user.id` fornecido pelo Auth.js (MongoDB ObjectId) |
| Acesso aos dados | Qualquer dispositivo onde o usuário fizer login |
| Expiração dos dados | Nunca (campo `expiresAt` ausente → TTL index não age) |
| Dados de sessões anteriores anônimas | Migrados automaticamente no login (ver [Migração](#fluxo-de-migração)) |
| Cross-device | **Sim** |

### Isolamento entre usuários

Todas as queries ao banco incluem `{ userId }` como filtro obrigatório. Um usuário jamais consegue acessar, modificar ou deletar dados de outro usuário, independente de estar autenticado ou não.

```typescript
// Exemplo: getFichas — sempre filtra pelo userId resolvido server-side
await col.find({ userId }).sort({ createdAt: -1 }).toArray();
```

---

## Identidade do Usuário

A identidade é resolvida no servidor pela função `resolveIdentity()` em [src/lib/identity.ts](../src/lib/identity.ts). O client nunca envia ou recebe um `userId` diretamente.

### Algoritmo de resolução

```
1. Verificar se existe sessão Auth.js ativa
   └─ SIM → retornar { userId: session.user.id, isAnonymous: false }

2. Verificar se o cookie `gym-workout-guest-id` existe
   └─ SIM → retornar { userId: cookie.value, isAnonymous: true }

3. Nenhum dos dois → gerar novo UUID
   └─ Criar cookie httpOnly com o UUID (maxAge: 30 dias)
   └─ retornar { userId: UUID, isAnonymous: true }
```

### Cookie `gym-workout-guest-id`

```
Nome:     gym-workout-guest-id
Valor:    UUID v4 (ex: 550e8400-e29b-41d4-a716-446655440000)
httpOnly: true   ← JavaScript do browser não consegue ler
sameSite: lax    ← proteção CSRF
secure:   true   ← apenas em produção (HTTPS)
path:     /
maxAge:   2.592.000 segundos (30 dias)
```

---

## Fluxo de Migração

Quando um usuário anônimo faz login, os dados criados previamente são transferidos para a conta autenticada de forma transparente.

### Passo a passo

```
1. Usuário usa app sem login (fichas/sessões criadas com guestId)

2. Usuário faz login com Google
   └─ Auth.js cria sessão + seta cookie de sessão

3. MigrationTrigger detecta estado "authenticated"
   └─ Arquivo: src/components/MigrationTrigger.tsx
   └─ Consulta localStorage: já migrou para este userId antes?
      └─ SIM → não faz nada (evita re-migração)
      └─ NÃO → chama POST /api/auth/migrate

4. Server em /api/auth/migrate:
   └─ Lê session.user.id (autenticado)
   └─ Lê cookie gym-workout-guest-id (anônimo)
   └─ Se guestId == userId → já autenticado, nada a fazer
   └─ Executa UPDATE em fichas e sessoes:
      - userId = authId
      - isAnonymous = false
      - UNSET expiresAt (dados não expiram mais)
   └─ Deleta cookie gym-workout-guest-id

5. Client salva gym-workout:migrated = <userId> no localStorage
   └─ Garante que a migração não seja executada novamente
```

### Diagrama

```
Pré-login:
  fichas   { userId: "uuid-anonimo", expiresAt: "2026-04-23", ... }
  sessoes  { userId: "uuid-anonimo", expiresAt: "2026-04-23", ... }

Pós-migração:
  fichas   { userId: "ObjectId-do-usuario", isAnonymous: false }
  sessoes  { userId: "ObjectId-do-usuario", isAnonymous: false }
  (campo expiresAt removido — TTL não age sobre o documento)
```

---

## Estrutura do Banco de Dados

Banco: `gym-workout` no cluster MongoDB Atlas.

### Collection `fichas`

Armazena as fichas de treino de cada usuário.

```json
{
  "_id": "ficha-550e8400-...",
  "userId": "68012abc...",
  "isAnonymous": false,
  "nome": "Treino A - Peito e Tríceps",
  "exercicios": [
    {
      "id": "exercicio-...",
      "descricao": "Supino reto com barra",
      "series": 4,
      "pesoSugerido": 60
    }
  ],
  "descanso": 90,
  "createdAt": "2026-03-24T10:00:00Z",
  "updatedAt": "2026-03-24T10:00:00Z"
}
```

**Campos:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `_id` | string | ✓ | ID gerado pela app (`ficha-<uuid>`) |
| `userId` | string | ✓ | ID do dono (authId ou guestId) |
| `isAnonymous` | boolean | ✓ | `true` para dados anônimos |
| `nome` | string | ✓ | Nome da ficha |
| `exercicios` | array | ✓ | Lista de exercícios (ver tipo `Exercicio`) |
| `descanso` | number | ✓ | Tempo de descanso em segundos |
| `createdAt` | Date | ✓ | Timestamp de criação |
| `updatedAt` | Date | ✓ | Timestamp da última atualização |
| `expiresAt` | Date | — | Presente apenas em anônimos; TTL index remove após esta data |

**Índices:**
- `{ userId: 1 }` — acelera a query de listagem por usuário
- `{ expiresAt: 1 }` com `expireAfterSeconds: 0`, `sparse: true` — TTL automático para dados anônimos

---

### Collection `sessoes`

Armazena as sessões de treino executadas (em andamento ou finalizadas).

```json
{
  "_id": "sessao-550e8400-...",
  "userId": "68012abc...",
  "isAnonymous": false,
  "fichaId": "ficha-...",
  "fichaNome": "Treino A - Peito e Tríceps",
  "exercicios": [...],
  "exerciciosConcluidosIds": ["exercicio-1", "exercicio-2"],
  "startedAt": "2026-03-24T10:30:00Z",
  "endedAt": "2026-03-24T11:15:00Z",
  "createdAt": "2026-03-24T10:30:00Z",
  "updatedAt": "2026-03-24T11:15:00Z"
}
```

**Campos:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `_id` | string | ✓ | ID gerado pela app (`sessao-<uuid>`) |
| `userId` | string | ✓ | ID do dono |
| `isAnonymous` | boolean | ✓ | `true` para dados anônimos |
| `fichaId` | string | ✓ | Referência à ficha usada |
| `fichaNome` | string | ✓ | Nome da ficha no momento da sessão (snapshot) |
| `exercicios` | array | ✓ | Snapshot dos exercícios no momento da sessão |
| `exerciciosConcluidosIds` | string[] | ✓ | IDs dos exercícios marcados como concluídos |
| `startedAt` | Date | ✓ | Quando a sessão foi iniciada |
| `endedAt` | Date? | — | `null` enquanto em andamento; preenchido ao concluir |
| `createdAt` | Date | ✓ | Timestamp de criação |
| `updatedAt` | Date | ✓ | Timestamp da última atualização |
| `expiresAt` | Date | — | Presente apenas em anônimos |

> **Nota sobre snapshots:** `fichaNome` e `exercicios` são copiados da ficha no momento em que a sessão é criada. Isso garante que o relatório histórico da sessão não seja afetado por edições futuras na ficha.

**Índices:**
- `{ userId: 1 }` — acelera listagem
- `{ expiresAt: 1 }` com `expireAfterSeconds: 0`, `sparse: true` — TTL

---

### Collections gerenciadas pelo Auth.js

Estas quatro collections são criadas e mantidas automaticamente pelo `@auth/mongodb-adapter`. Não devem ser modificadas manualmente.

| Collection | Propósito |
|---|---|
| `users` | Dados do usuário (nome, email, avatar) |
| `accounts` | Vinculação com o provedor OAuth (Google) |
| `sessions` | Sessões de autenticação ativas |
| `verification_tokens` | Tokens de verificação de email (uso futuro) |

Consulte [AUTENTICACAO.md](./AUTENTICACAO.md) para detalhes dessas collections.

---

## Segurança

### O cliente nunca vê o MongoDB

Toda a comunicação com o banco acontece exclusivamente em arquivos marcados com `import "server-only"`:

```
src/lib/identity.ts     → import "server-only"
src/lib/db/fichas.ts    → import "server-only"
src/lib/db/sessoes.ts   → import "server-only"
```

O client (browser) interage apenas com as API routes via `fetch`:

```
Browser  →  POST /api/fichas       →  Server  →  MongoDB
Browser  →  GET  /api/sessoes      →  Server  →  MongoDB
Browser  →  PUT  /api/sessoes/:id  →  Server  →  MongoDB
```

A string de conexão `DATABASE_URL` existe apenas no servidor (via `.env.local`) e jamais é exposta ao bundle do client.

### Validação de entrada nas API routes

Toda entrada recebida nas API routes passa por um normalizador antes de ir ao banco:

- `normalizeFicha()` — valida nome, descanso > 0, array de exercícios
- Sessão: valida `fichaId` existe e pertence ao `userId` antes de criar
- Update de sessão: `exerciciosConcluidosIds` deve ser array de strings; `endedAt` deve ser string ISO ou null

Inputs inválidos retornam `400 Bad Request` sem tocar o banco.

### Autorização por userId

Nenhuma API route aceita um `userId` vindo do body do request. O `userId` é sempre resolvido exclusivamente pelo servidor via `resolveIdentity()`, que lê:
1. A sessão Auth.js (httpOnly cookie de sessão)
2. O cookie `gym-workout-guest-id` (httpOnly)

Um usuário mal-intencionado que envie um `userId` forjado no body da requisição terá esse valor ignorado.

---

## Verificação de Integridade

### Checklist pós-deploy

**Collections de dados:**

- [ ] Collection `fichas` existe no Atlas com índice em `userId` e TTL em `expiresAt`
- [ ] Collection `sessoes` existe com os mesmos índices
- [ ] Documentos anônimos possuem campo `expiresAt`; documentos autenticados não possuem

**Fluxo anônimo:**

1. Abra o app sem estar logado
2. Crie uma ficha e inicie uma sessão
3. No MongoDB Atlas → Browse Collections → `fichas`:
   - [ ] Documento existe com `isAnonymous: true`
   - [ ] Campo `expiresAt` está presente (~30 dias no futuro)
   - [ ] `userId` é um UUID (ex: `550e8400-e29b-41d4-a716-...`)

**Fluxo de migração:**

4. Faça login com Google
5. Aguarde ~1 segundo (MigrationTrigger executa)
6. No MongoDB Atlas → Browse Collections → `fichas`:
   - [ ] O documento agora tem `userId` = MongoDB ObjectId do usuário
   - [ ] Campo `expiresAt` foi removido
   - [ ] `isAnonymous: false`
7. No Atlas → `accounts`:
   - [ ] Cookie `gym-workout-guest-id` foi removido do navegador (DevTools → Application → Cookies)
   - [ ] `localStorage.getItem('gym-workout:migrated')` retorna o userId

**Fluxo autenticado:**

8. Crie uma segunda ficha estando logado
9. Faça logout e login em outro dispositivo
   - [ ] Fichas do passo 8 aparecem no segundo dispositivo
   - [ ] Fichas criadas anonimamente (passo 3) também aparecem (foram migradas)

---

## Camada de Acesso — Arquivos de Referência

| Arquivo | Função |
|---|---|
| [src/lib/identity.ts](../src/lib/identity.ts) | Resolve `userId` (autenticado ou anônimo) |
| [src/lib/db/fichas.ts](../src/lib/db/fichas.ts) | CRUD de fichas no MongoDB |
| [src/lib/db/sessoes.ts](../src/lib/db/sessoes.ts) | CRUD de sessões no MongoDB |
| [src/app/api/fichas/route.ts](../src/app/api/fichas/route.ts) | API: listar e criar fichas |
| [src/app/api/fichas/[id]/route.ts](../src/app/api/fichas/%5Bid%5D/route.ts) | API: editar e remover fichas |
| [src/app/api/sessoes/route.ts](../src/app/api/sessoes/route.ts) | API: listar e criar sessões |
| [src/app/api/sessoes/[id]/route.ts](../src/app/api/sessoes/%5Bid%5D/route.ts) | API: buscar e atualizar sessão |
| [src/app/api/auth/migrate/route.ts](../src/app/api/auth/migrate/route.ts) | API: migrar dados anônimos → conta |
| [src/components/MigrationTrigger.tsx](../src/components/MigrationTrigger.tsx) | Dispara migração após login |

---

**Última atualização:** 24 de março de 2026  
**Status:** ✓ Implementado e validado (lint + tsc sem erros)
