# MVP — Gestão de Projetos e Times (NestJS)

Documento de especificação do **MVP** para a avaliação de 5 dias.  
Use este arquivo como contexto/prompt inicial no Cursor.

> **Legenda**
> - **[OBRIGATÓRIO]** — exigido pelo arquivo referencial da avaliação (`.md` do curso)
> - **[CRITÉRIO NOSSO]** — decisão de produto/arquitetura não detalhada no referencial; deve ser coerente, implementada e documentada no README

---

## 1. Objetivo

Implementar uma **API backend** de Gestão de Projetos e Times (estilo Trello/Jira leve), sem frontend.

A avaliação observa: modelagem, arquitetura, integração, regras de negócio, segurança, erros, testes e qualidade da entrega.

---

## 2. Stack e conteúdos obrigatórios [OBRIGATÓRIO]

- NestJS + TypeScript
- PostgreSQL
- Prisma **7.10.0**, com `prisma.config.ts`, driver adapter e migrations
- DTOs + `class-validator` + `ValidationPipe`
- JWT + `@CurrentUser()` (ou equivalente)
- Autorização por papel/permissão
- Relacionamentos Prisma
- Upload de arquivo
- `HttpService`
- Pelo menos um Interceptor útil (sem regra principal de negócio no interceptor)
- `.env` / `ConfigService`
- Helmet
- Compression
- Tratamento coerente de `400`, `401`, `403`, `404`, `409`
- Build de produção (`npm run build` sem erros)
- README/documentação completa

---

## 3. Perfis [OBRIGATÓRIO + CRITÉRIO NOSSO]

Perfis exigidos: `MEMBER`, `PROJECT_MANAGER`, `ADMIN`.

### Matriz do MVP [CRITÉRIO NOSSO]

| Capacidade | MEMBER | PROJECT_MANAGER | ADMIN |
|---|---|---|---|
| Register / login / me | ✓ | ✓ | ✓ |
| Criar projeto | | ✓ | ✓ |
| Ver projetos em que é membro | ✓ | ✓ | ✓ (global) |
| Editar projeto (nome, descrição, arquivar) | | ✓ (nos seus) | ✓ |
| Listar todos os projetos | | | ✓ |
| Add/remove membros do projeto | | ✓ (nos seus) | ✓ |
| CRUD tasks no projeto (membro) | ✓ | ✓ | ✓ |
| Mover status intermediário | ✓ | ✓ | ✓ |
| Aprovar → `DONE` / reprovar | | ✓ | ✓ |
| Promover role de usuário | | | ✓ |
| Acesso a recurso sem ser membro | | | ✓ |

**Regras transversais [OBRIGATÓRIO]**

- Usuários não podem manipular recursos de terceiros apenas alterando IDs na requisição.
- Operações pessoais usam a identidade autenticada (JWT), não `userId` enviado pelo cliente.
- Dados sensíveis (ex.: `passwordHash`) nunca retornam na API.

**Projeto alheio → `403` [CRITÉRIO NOSSO]** (decidido em 22/09/2026)

Quem está autenticado e abre um projeto do qual não é membro recebe `403`. O projeto precisa existir: id que não está no banco continua `404`. Sem token, ou com token inválido, continua `401`. ADMIN acessa qualquer projeto (exceção global). A mesma ordem vale para ver, membros, tasks e activities daquele projeto. O `403` revela que o id existe; isso é aceito e deve constar no README.

Em `PATCH /projects/:id` o `@Roles(PROJECT_MANAGER, ADMIN)` responde antes do service. `MEMBER` recebe `403` de papel mesmo se o id não existe ou não é UUID. O `404` e o `400` dessa rota se demonstram com PM ou ADMIN. PM que passa no papel e não é membro daquele projeto continua no `403` de participação.

Ordem no service, depois do guard de JWT:

1. Recurso não encontrado → `404`
2. Autenticado, não membro e não ADMIN → `403`
3. Regra de negócio incompatível (membro duplicado, projeto `ARCHIVED`, transição inválida) → `409`

### Decisões fechadas no dia 2 [CRITÉRIO NOSSO]

- Quem cria o projeto vira `owner` e também `ProjectMember`, na mesma transação.
- `MEMBER` vê os projetos em que é membro. Não edita nome, descrição nem status, e não adiciona nem remove membros. A ficha do projeto (inclusive arquivar) é de `PROJECT_MANAGER` e `ADMIN`. Decidido em 22/09/2026: o membro mexe nas tasks, não no projeto.
- `PROJECT_MANAGER` adiciona e remove membros só nos projetos em que ele mesmo participa. `ADMIN` faz isso em qualquer projeto.
- Membro repetido → `409`. O `@@unique([projectId, userId])` é a garantia; a consulta anterior só melhora a mensagem.
- Remover o `owner` → `409`. Este MVP não transfere a posse do projeto.
- Nas rotas de um projeto, o papel usado na regra vem do banco (`ProjectAccessService`), no mesmo espírito do `RolesGuard`.
- `POST` e `DELETE` de membro não usam `@Roles()`. O `404` do projeto precisa acontecer antes do `403` de papel. A checagem de papel fica no service, depois que o projeto existe.

---

## 4. Entidades mínimas [OBRIGATÓRIO]

`User`, `Project`, `ProjectMember`, `Task`, `Comment`, `Attachment`, `Activity`  
(Entidades auxiliares permitidas.)

### Modelagem sugerida do MVP [CRITÉRIO NOSSO]

#### User
- `id`, `email` (unique), `passwordHash`, `role` (`MEMBER` | `PROJECT_MANAGER` | `ADMIN`), `createdAt`

#### Project
- `id`, `name`, `description?`, `status` (`ACTIVE` | `ARCHIVED`), `ownerId` → User, `createdAt`, `updatedAt`
- Projeto `ARCHIVED`: não permite criar/mover tasks (operação incompatível com estado → `409`)

#### ProjectMember
- `id`, `projectId`, `userId`, `createdAt`
- Unique `(projectId, userId)`
- Convite: criar vínculo `ProjectMember` (campo `email` opcional só como dado; **sem SMTP** neste MVP)

#### Task
- `id`, `projectId`, `title`, `description?`, `status`, `assigneeId?` → User, `dueDate?`, `createdAt`, `updatedAt`
- **Responsável da tarefa deve ser membro do projeto** [OBRIGATÓRIO] → senão `409`

#### Comment
- `id`, `taskId`, `authorId`, `body`, `createdAt`

#### Attachment
- `id`, `taskId`, `uploadedById`, `filename`, `mimeType`, `size`, `path`, `createdAt`

#### Activity
- `id`, `actorId`, `action`, `projectId?`, `taskId?`, `metadata` (JSON), `createdAt`
- Ações relevantes geram histórico [OBRIGATÓRIO]

---

## 5. Estados da Task [CRITÉRIO NOSSO]

O referencial **não** nomeia os status; exige fluxo coerente e rejeição de transição inválida.

### Status
- `TODO`
- `IN_PROGRESS`
- `WAITING_MANAGER_APPROVE`
- `DONE`
- `CANCELLED`

### Transições permitidas

```
TODO ⇄ IN_PROGRESS → WAITING_MANAGER_APPROVE → DONE
         │                    │
         └→ CANCELLED ←───────┘
```

| De | Para | Quem |
|---|---|---|
| TODO | IN_PROGRESS | MEMBER, PROJECT_MANAGER, ADMIN (membros do projeto; ADMIN global) |
| IN_PROGRESS | TODO | MEMBER, PM, ADMIN |
| IN_PROGRESS | WAITING_MANAGER_APPROVE | MEMBER, PM, ADMIN |
| WAITING_MANAGER_APPROVE | IN_PROGRESS (reprovar) | PM, ADMIN |
| WAITING_MANAGER_APPROVE | DONE (aprovar) | PM, ADMIN |
| TODO / IN_PROGRESS | CANCELLED | MEMBER, PM, ADMIN |
| WAITING_MANAGER_APPROVE | CANCELLED | PM, ADMIN |
| * | DONE direto (ex.: MEMBER → DONE) | **proibido** → `409` |

---

## 6. Fluxo de produto do MVP [CRITÉRIO NOSSO]

1. Seed (bônus) cria conta `ADMIN` (dono da aplicação).
2. Qualquer pessoa pode `register` → nasce como `MEMBER` (ainda **não** cria projeto).
3. `ADMIN` promove o usuário para `PROJECT_MANAGER`.
4. `PROJECT_MANAGER` cria `Project` e adiciona `ProjectMember`s.
5. Membros criam/trabalham tasks, comentam, anexam arquivos, movem status até `WAITING_MANAGER_APPROVE`.
6. Só `PROJECT_MANAGER` / `ADMIN` aprova (`DONE`) ou reprova (volta `IN_PROGRESS`).
7. Ações relevantes gravam `Activity`.

### Fora deste MVP (ganchos para depois)
- Fila de solicitação de projeto
- Pagamento
- Limite de projetos “free”
- `canCreateProject` separado da role
- Envio real de e-mail
- Painel web/admin frontend

---

## 7. Funcionalidades mínimas [OBRIGATÓRIO]

Cobrir na API:

- autenticação
- CRUD/gestão das entidades administrativas relevantes
- operações do usuário autenticado
- consultas por relacionamento
- fluxo de estados do domínio
- histórico quando necessário
- autorização
- validações
- tratamento dos conflitos de negócio

### Regras obrigatórias do referencial

1. Responsável da tarefa deve ser membro
2. Acesso restrito aos membros (ADMIN é exceção global no nosso critério)
3. Ações relevantes geram histórico
4. Recursos inexistentes → tratados (`404`)
5. Operações incompatíveis com o estado atual → rejeitadas
6. Transições de status coerentes
7. Dados sensíveis não aparecem nas respostas
8. Operações pessoais usam identidade autenticada

---

## 8. Endpoints do MVP [CRITÉRIO NOSSO]

API REST suficiente para todos os fluxos. README deve listar método, URL, auth/permissão, body e respostas principais [OBRIGATÓRIO].

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Admin
- `PATCH /users/:id/role` — só ADMIN
- O `RolesGuard` confere a role no banco, não a role gravada no JWT. A assinatura do token continua obrigatória (`401` se for adulterada). Usuário apagado → `401`. Role insuficiente → `403`. A role nova vale na request seguinte, sem esperar o token expirar. [CRITÉRIO NOSSO]

### Projects
- `POST /projects` — PM, ADMIN
- `GET /projects` — autenticado (ADMIN: todos; demais: só onde é membro)
- `GET /projects/:id`
- `PATCH /projects/:id` — PM (membro daquele projeto) ou ADMIN. `MEMBER` → `403` do `@Roles()`, antes do `404`

### Members
- `POST /projects/:id/members`
- `GET /projects/:id/members`
- `DELETE /projects/:id/members/:userId`

### Tasks
- `POST /projects/:id/tasks`
- `GET /projects/:id/tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `PATCH /tasks/:id/status`

### Comments
- `POST /tasks/:id/comments`
- `GET /tasks/:id/comments`

### Attachments [OBRIGATÓRIO: upload de anexo de tarefa]
- `POST /tasks/:id/attachments` — multipart; validar presença, tamanho e tipo
- `GET /tasks/:id/attachments`

### Activity
- `GET /projects/:id/activities`

### Integração externa [OBRIGATÓRIO]
- `GET /holidays?year=` — via `HttpService` (feriados ou mock)
- URL/config no `.env`; tratar erro/timeout
- Ao criar/atualizar task: se `dueDate` cair em feriado → rejeitar (`409` ou `400`; documentar a escolha — sugerido `409`)

---

## 9. Activity — quando gravar [CRITÉRIO NOSSO]

Gerar histórico em, no mínimo:

- criar/editar/arquivar projeto
- add/remove membro
- criar/editar task
- mudança de status
- novo comentário
- upload de anexo

---

## 10. Interceptor [OBRIGATÓRIO]

Implementar pelo menos um, por exemplo:

- log estruturado, ou
- tempo de execução, ou
- transformação padronizada da resposta

Documentar a finalidade no README. **Não** colocar regra principal de negócio no Interceptor.

---

## 11. Segurança e performance [OBRIGATÓRIO]

- JWT secret por ambiente
- `.env` fora do Git
- Helmet habilitado
- Compression habilitado
- Rotas privadas protegidas
- Autorização testada
- Logs sem segredos
- Senhas nunca retornadas

---

## 12. Testes obrigatórios a demonstrar [OBRIGATÓRIO]

1. Fluxo principal com sucesso
2. Body inválido → `400`
3. Ausência/token inválido → `401`
4. Autenticado sem permissão → `403`
5. Recurso inexistente → `404`
6. Conflito de regra de negócio → `409`
7. Tentativa de acesso a recurso de terceiro
8. Upload válido e inválido
9. Integração externa funcionando e falhando de forma controlada
10. Fluxo completo de mudança de estado (incluir `WAITING_MANAGER_APPROVE` → `DONE`)

---

## 13. Entregáveis [OBRIGATÓRIO]

- Código-fonte
- Schema Prisma + migrations
- `.env.example` (sem segredos)
- README completo (install, migrate, run, build, endpoints, exemplos)
- `npm run build` sem erros

### Bônus (somente depois do obrigatório) [OBRIGATÓRIO respeitar ordem]
Paginação, filtros, ordenação, Swagger, **seed**, testes automatizados, Docker, indicadores do domínio.

Seed do ADMIN é bônus, mas altamente recomendado para demo.

---

## 14. Plano sugerido de 5 dias [CRITÉRIO NOSSO]

- **D1** — Scaffold Nest, Prisma 7.10, User/auth/JWT/roles, Interceptor, Helmet, Compression, ConfigModule
- **D2** — Project, ProjectMember, guards de membro, Activity base, promote role
- **D3** — Task + máquina de estados + assignee membro + ARCHIVED
- **D4** — Comment, upload Attachment, HttpService feriados + validação dueDate
- **D5** — README, demonstrar 10 testes, build; depois bônus (seed/Swagger/etc.)

---

## 15. Prompt inicial sugerido (copiar no Cursor)

```text
Implemente do zero uma API NestJS conforme o arquivo MVP-gestao-projetos-times.md (anexo/contexto).

Respeite tudo marcado como [OBRIGATÓRIO].
Implemente as decisões [CRITÉRIO NOSSO] exatamente como documentadas (roles, estados da Task incluindo WAITING_MANAGER_APPROVE, promote para PROJECT_MANAGER, etc.).

Stack: NestJS + TS + PostgreSQL + Prisma 7.10.0 (prisma.config.ts, driver adapter, migrations), JWT, class-validator, Helmet, Compression, HttpService, upload de anexo de task, pelo menos 1 Interceptor.

Entregue código organizado em módulos, .env.example, migrations, README com endpoints e como testar os 10 cenários obrigatórios. npm run build deve passar.

Não implemente agora: pagamento, fila de solicitação de projeto, e-mail SMTP, frontend.
```

---

## 16. Critérios de sucesso do MVP

- Cobertura completa dos itens obrigatórios do referencial
- Matriz de permissões coerente e documentada
- Task com `WAITING_MANAGER_APPROVE` e aprovação só PM/ADMIN
- Assignee sempre membro do projeto
- Acesso a recursos do projeto restrito a membros (ADMIN global)
- Activity nas ações relevantes
- Upload validado ligado a Task
- HttpService de feriados com falha controlada
- README + build OK + 10 cenários demonstráveis
