# Documentação: Sistema de Autenticação e Banco de Dados

## Índice
1. [Visão Geral](#visão-geral)
2. [Fluxo de Login](#fluxo-de-login)
3. [Integrações](#integrações)
4. [Collections no MongoDB](#collections-no-mongodb)
5. [Verificação de Integridade](#verificação-de-integridade)
6. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O aplicativo **Gym Workout** utiliza autenticação via **Google OAuth 2.0** com persistência de dados no **MongoDB Atlas**. O fluxo de autenticação é mantido pelo **Auth.js v5 (NextAuth)**, que gerencia:

- Login/logout com o Google
- Sessões de usuário
- Persistência de dados de autenticação no MongoDB
- Tokens e credenciais de forma segura

**Stack de Autenticação:**
- Frontend: `next-auth/react` (client-side)
- Backend: `Auth.js v5` (server-side)
- Adapter: `@auth/mongodb-adapter` (persistência)
- Banco: `MongoDB Atlas` (cloud database)

---

## Fluxo de Login

### 1. **Usuário clica em "Entrar com Google"**
   - Localização: [src/components/AuthButton.tsx](../src/components/AuthButton.tsx)
   - Função: `signIn("google")` do `next-auth/react`
   - Resultado: Redirecionado para o Google

### 2. **Google valida credenciais**
   - Usuário autentica com sua conta Google
   - Google verifica se a URL de callback está autorizada
   - URL esperada: `http://localhost:3000/api/auth/callback/google` ou `http://localhost:3001/api/auth/callback/google`

### 3. **Google redireciona para o callback**
   - Sistema: Next.js Route Handler em [src/app/api/auth/[...nextauth]/route.ts](../src/app/api/auth/%5B...nextauth%5D/route.ts)
   - Ação: Auth.js processa a resposta do Google

### 4. **Auth.js valida o token**
   - Validação: Token JWT do Google
   - Ação: Chama o callback `session` em [src/auth.ts](../src/auth.ts)
   - Lógica customizada: Enrichment da sessão com `user.id`

### 5. **MongoDB Adapter executa a lógica**
   - Arquivo: [src/lib/mongodb.ts](../src/lib/mongodb.ts)
   - Processo:
     1. Conecta ao MongoDB Atlas
     2. Checa se o usuário já existe na collection `users`
     3. Se não existe: insere um novo documento
     4. Se existe: reutiliza o documento existente
   - Resultado: Documento criado/atualizado em `users`

### 6. **Account é linkado**
   - Ação: Se é primeiro login, cria documento em `accounts`
   - Dados: Tokens OAuth do Google, provider, e referência ao usuário

### 7. **Session é criada**
   - Ação: Insere documento em `sessions`
   - Duração: Configurável em `AUTH_SECRET`
   - Acesso: Cliente recebe cookie de sessão

### 8. **Usuário vê seu avatar e nome**
   - Componente: [src/components/AuthButton.tsx](../src/components/AuthButton.tsx)
   - Hook: `useSession()` do `next-auth/react`
   - Dados: `session.user.name`, `session.user.image`

### 9. **Logout**
   - Função: `signOut()` do `next-auth/react`
   - Ação: Deleta documento em `sessions`
   - Cookie: Removido do navegador

---

## Integrações

### Google OAuth 2.0

**Configuração:**
- Credenciais: [.env.local](.env.local)
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

**Fluxo:**
```
Usuário → Google OAuth → Token → Auth.js → MongoDB
```

**Callbacks autorizados no Google Cloud Console:**
- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3001/api/auth/callback/google` (fallback se porta 3000 ocupada)
- URLs de produção (quando publicar)

**Erro comum:** `Erro 400: redirect_uri_mismatch`
- Causa: URL de callback não autorizada no Google
- Solução: Adicionar a URL exata no Google Cloud Console > APIs e Serviços > Credenciais

### Auth.js v5 (NextAuth)

**Arquivos principais:**
- [src/auth.ts](../src/auth.ts) — Configuração central
  - Providers (Google)
  - Adapter (MongoDB)
  - Callbacks (session enrichment)
  
- [src/app/api/auth/[...nextauth]/route.ts](../src/app/api/auth/%5B...nextauth%5D/route.ts) — Route handler
  - Expõe `GET` e `POST` para o fluxo OAuth

- [src/types/next-auth.d.ts](../src/types/next-auth.d.ts) — Type definitions
  - Estende `Session` com `user.id`

**Variáveis obrigatórias:**
- `AUTH_SECRET` — Assinatura de sessões (gere com `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` — ID público do OAuth
- `GOOGLE_CLIENT_SECRET` — Secret do OAuth

### MongoDB Adapter

**Biblioteca:** `@auth/mongodb-adapter`

**Função:** Implementa a interface de persistência do Auth.js

**O que faz:**
- Cria/atualiza usuários na collection `users`
- Vincula accounts do Google na collection `accounts`
- Gerencia sessões na collection `sessions`
- Limpa tokens expirados automaticamente

**Conexão:**
```
Node.js Client → TLS/SSL → MongoDB Atlas
```

### MongoDB Atlas

**Cluster:** `homeros.6faxin0.mongodb.net`

**Banco:** `gym-workout`

**Segurança:**
- Autenticação: Usuário `vercel-gym-workout` + senha
- IP Whitelist: Seu IP precisa estar autorizado
- TLS/SSL: Obrigatório

---

## Collections no MongoDB

### 1. **`users`** — Usuários da aplicação

**Propósito:** Armazenar dados principais do usuário logado

**Estrutura:**
```json
{
  "_id": ObjectId("..."),
  "name": "Seu Nome",
  "email": "seu@email.com",
  "emailVerified": null,
  "image": "https://lh3.googleusercontent.com/...",
  "createdAt": "2026-03-24T10:30:00Z",
  "updatedAt": "2026-03-24T10:30:00Z"
}
```

**Campos:**
- `_id` — ID único (gerado pelo MongoDB)
- `name` — Nome do usuário do Google
- `email` — Email da conta Google
- `emailVerified` — Data de verificação de email (se aplicável)
- `image` — URL do avatar do Google
- `createdAt` — Timestamp de criação
- `updatedAt` — Último update

**Quando é criada:** Primeira tentativa de login com Google

**Relações:** Um-para-muitos com `accounts` e `sessions`

**Dicas:**
- Não deletar manualmente sem deletar `accounts` e `sessions` primeiro
- `email` é única (não pode dois usuários com mesmo email)

---

### 2. **`accounts`** — Vinculação com provedores OAuth

**Propósito:** Armazenar as credenciais e tokens do provedor externo (Google)

**Estrutura:**
```json
{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),
  "type": "oauth",
  "provider": "google",
  "providerAccountId": "1234567890",
  "refresh_token": "1//...",
  "access_token": "ya29...",
  "expires_at": 1711270800,
  "token_type": "Bearer",
  "scope": "email profile ...",
  "id_token": "eyJ..."
}
```

**Campos:**
- `_id` — ID único da vinculação
- `userId` — Referência ao documento em `users` (foreign key)
- `type` — Tipo de conta ("oauth")
- `provider` — Nome do provedor ("google")
- `providerAccountId` — ID da conta no Google
- `refresh_token` — Token para renovar acesso (se não expirou)
- `access_token` — Token de acesso atual
- `expires_at` — Unix timestamp de expiração
- `token_type` — Tipo de token ("Bearer")
- `scope` — Permissões solicitadas
- `id_token` — ID token JWT do Google

**Quando é criada:** Primeiro login com Google

**Relações:** Muitos-para-um com `users` (via `userId`)

**Dicas:**
- Um usuário pode ter múltiplas contas (ex: Google + GitHub no futuro)
- A constraint `{provider, providerAccountId}` garante que não há duplicatas
- Se `userId` aponta para um usuário inexistente → dado órfão (problema)

---

### 3. **`sessions`** — Sessões ativas do usuário

**Propósito:** Rastrear sessões ativas e autorizar requisições subsequentes

**Estrutura:**
```json
{
  "_id": ObjectId("..."),
  "sessionToken": "abcd1234efgh5678...",
  "userId": ObjectId("..."),
  "expires": "2026-04-24T10:30:00Z"
}
```

**Campos:**
- `_id` — ID único da sessão
- `sessionToken` — Token opaco enviado como cookie ao navegador
- `userId` — Referência ao documento em `users`
- `expires` — Data/hora de expiração da sessão

**Quando é criada:** Após sucesso no login

**Quando é deletada:** 
- Ao fazer logout (`signOut()`)
- Automaticamente após expiração (TTL index)

**Relações:** Muitos-para-um com `users` (via `userId`)

**Dicas:**
- O navegador recebe `sessionToken` como cookie `next-auth.session-token`
- Múltiplas sessões por usuário = login em múltiplos navegadores
- Não deletar manualmente; deixar o Auth.js gerenciar

---

### 4. **`verification_tokens`** — Tokens de verificação (backup)

**Propósito:** Verificação de email ou reset de senha (uso futuro)

**Estrutura:**
```json
{
  "_id": ObjectId("..."),
  "identifier": "seu@email.com",
  "token": "abc123def456...",
  "expires": "2026-03-24T11:30:00Z"
}
```

**Campos:**
- `_id` — ID único
- `identifier` — Email ou usuário
- `token` — Token único de verificação
- `expires` — Data/hora de expiração

**Quando é criada:** Não é usado atualmente (somente Google OAuth)

**Uso futuro:** Se implementar login por email ou reset de senha

**Dicas:**
- Pode ficar vazia no seu caso
- Deletada automaticamente após expiração

---

## Verificação de Integridade

### Checklist da Integridade do Banco

**1. Acessar MongoDB Atlas**
```
mongodb.com/cloud/atlas
→ Projeto "gym-workout"
→ "Browse Collections"
```

**2. Verificar collections existentes**
- [ ] `users` existe?
- [ ] `accounts` existe?
- [ ] `sessions` existe?
- [ ] `verification_tokens` existe?

**3. Se já fez login, contar documentos:**
- [ ] `users`: 1 documento (seu usuário)
- [ ] `accounts`: 1 documento (sua conta Google) 
- [ ] `sessions`: 1+ documentos (suas sessões ativas)
- [ ] `verification_tokens`: 0 documentos (não usado)

**4. Validar referências**

Abra a coleção `users`:
- [ ] Tem um documento com seu email?
- [ ] O `_id` é do tipo `ObjectId`?
- [ ] Os campos `name`, `email`, `image` estão preenchidos?

Abra `accounts`:
- [ ] O `userId` corresponde ao `_id` em `users`?
- [ ] O `provider` é "google"?
- [ ] `access_token` não está vazio?

Abra `sessions`:
- [ ] O `userId` corresponde ao `_id` em `users`?
- [ ] `sessionToken` é uma string não-vazia?
- [ ] `expires` é uma data futura?

**5. Procurar dados órfãos**

Se encontrar:
- Document em `accounts` cujo `userId` não existe em `users` → **órfão**
- Document em `sessions` cujo `userId` não existe em `users` → **órfão**

**Ação:** Deletar manualmente no Atlas clicando no documento e `Delete`

---

## Troubleshooting

### Erro: `Erro 400: redirect_uri_mismatch`

**Causa:** URL de callback não autorizada no Google

**Solução:**
1. Abra Google Cloud Console
2. APIs e Serviços → Credenciais
3. Selecione o OAuth Client ID
4. Autorized redirect URIs:
   - Adicione: `http://localhost:3000/api/auth/callback/google`
   - Adicione: `http://localhost:3001/api/auth/callback/google`
5. Salve

---

### Erro: `MongoServerSelectionError: tlsv1 alert internal error`

**Causa:** Falha na conexão SSL/TLS com MongoDB Atlas

**Soluções:**
1. **Verificar credenciais:**
   ```
   DATABASE_URL no .env.local está correto?
   Usuário e senha estão certos?
   ```

2. **Verificar IP Whitelist:**
   - MongoDB Atlas → Network Access
   - Seu IP está na lista?
   - Se não, clique "Add Current IP Address"

3. **Caracteres especiais na senha:**
   - Se a senha tem `@`, `!`, `%`, precisa fazer URL encode
   - Use: [url-encode.com](https://www.urlencoder.org/)
   - Exemplo: `@` → `%40`

4. **Testar conexão:**
   ```bash
   node -e "
   const { MongoClient } = require('mongodb');
   const uri = 'seu-CONNECTION-STRING-aqui';
   new MongoClient(uri).connect()
     .then(() => { console.log('OK'); process.exit(0); })
     .catch(e => { console.error(e.message); process.exit(1); });
   "
   ```

---

### Erro: `Uncaught Error: Invalid src prop on next/image`

**Mensagem:** `hostname "lh3.googleusercontent.com" is not configured`

**Causa:** Image otimizada do Google não está whitelisted

**Solução:** Já corrigida em [next.config.ts](../next.config.ts)
- Arquivo contém: `remotePatterns` com `lh3.googleusercontent.com`

---

### Usuário logado, mas avatar não aparece

**Causa:**
1. Imagem ainda não foi otimizada
2. `session.user.image` é null

**Solução:**
1. Refresque a página
2. Verifique em MongoDB se o documento `users` tem o campo `image` preenchido
3. Se vazio, faça logout e login novamente

---

### Logout não funciona ou sessão persiste

**Causa:** Cookie de sessão corrompido ou expirado

**Solução:**
1. Abra DevTools → Application → Cookies
2. Delete o cookie `next-auth.session-token`
3. Refresque a página
4. Tente logout novamente

Se persistir:
1. MongoDB Atlas → `sessions`
2. Delete manualmente o documento com seu `userId`
3. Limpe cookies do navegador
4. Login novamente

---

### Múltiplos usuários no banco (esperado vs inesperado)

**Esperado:**
- Um documento por usuário único que fez login

**Inesperado:**
- Documentos órfãos em `accounts` ou `sessions` sem usuário correspondente

**Quick cleanup:**
```javascript
// No MongoDB Atlas console:
db.accounts.deleteMany({ userId: ObjectId("ID_INEXISTENTE") });
db.sessions.deleteMany({ userId: ObjectId("ID_INEXISTENTE") });
```

---

## Resumo Rápido

| Componente | Tecnologia | Responsabilidade |
|-----------|-----------|------------------|
| UI Login | `next-auth/react` | Botão "Entrar com Google" |
| Backend Auth | `Auth.js v5` | Validação do Google OAuth |
| Persistência | `@auth/mongodb-adapter` | CRUD em MongoDB |
| Banco | `MongoDB Atlas` | Armazenar usuários, contas, sessões |
| Segurança | `AUTH_SECRET` + TLS/SSL | Criptografia de sessões e transporte |

---

**Última atualização:** 24 de março de 2026  
**Status:** ✓ Completo e testado
