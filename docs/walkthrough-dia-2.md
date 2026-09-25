# Walkthrough — Dia 2

CRUD de criar/ler/atualizar você já domina. O dia 2 é a parte em que a API decide **quem pode ver o quê** e **o que fica gravado junto com a ação**. Este arquivo é o mapa do que entrou no código. Leia ele ao lado dos arquivos, nesta ordem.

1. `src/projects/project-access.service.ts`
2. `src/projects/project-members.service.ts`
3. `src/projects/projects.service.ts`
4. `src/prisma/unit-of-work.ts`
5. `src/projects/repositories/project-members.repository.ts` (só o `select`)
6. Os controllers, por último. Eles só encaminham.

Pule a leitura linha a linha dos `findMany`. Ali não tem regra.

---

## O que a request atravessa

```
HTTP
  → ApiKeyGuard (global, já existia)
  → JwtAuthGuard (a rota é privada)
  → ValidationPipe (DTO: 400 se o body estiver errado)
  → Controller (não decide nada)
  → Service (regra, 404 / 403 / 409, activity)
  → Repository (Prisma, sem if de permissão)
  → PostgreSQL
```

O interceptor de log continua só medindo a request. Ele **não** grava `Activity`. Histórico é efeito da regra de negócio. Se o interceptor gravasse, um `GET` também viraria histórico, e uma falha no meio deixaria activity de uma ação que não aconteceu.

---

## Dois eixos de autorização

São perguntas diferentes. Misturar as duas é o erro que a banca pega.

| Eixo | Pergunta | Onde vive | Exemplo |
|---|---|---|---|
| Papel global | Este usuário é `MEMBER`, `PROJECT_MANAGER` ou `ADMIN`? | `RolesGuard` no banco, ou `assertCanManageMembers` | `MEMBER` não cria projeto |
| Participação | Esta pessoa está em **este** projeto? | `ProjectAccessService.authorize` | `MEMBER` de outro projeto não abre o id |

`ADMIN` é a exceção global: não precisa ser `ProjectMember` para ver, editar, listar membros e ver activities. Isso está escrito no MVP.

O papel **não** é o do JWT. O token pode estar velho (a pessoa foi promovida e ainda não fez login de novo). `loadActor` lê `role` no banco. O `RolesGuard` do dia 1 já fazia isso nas rotas com `@Roles()`.

---

## A ordem dos erros

Combinado no MVP, e é o que eu mais quero que você consiga explicar de olhos fechados:

1. Sem token, ou token inválido → `401`
2. Body inválido, ou id que não é UUID → `400` (isso é o pipe, antes do service)
3. Usuário do token não existe mais → `401`
4. Projeto não existe → `404`
5. Autenticado, não é membro e não é `ADMIN` → `403`
6. Regra incompatível (membro repetido, remover o dono) → `409`

O `403` do passo 5 **revela que o projeto existe**. O MVP aceita isso. Tem que constar no README do dia 4.

`ProjectAccessService.authorize` faz os passos 3, 4 e 5, nessa ordem. Três consultas de propósito. Dá para juntar num SQL só, mas aí a ordem dos erros fica escondida. Clareza primeiro.

### Por que `POST /projects/:id/members` não usa `@Roles()`

O `@Roles()` roda **antes** do service. Se eu colocasse `@Roles(PROJECT_MANAGER, ADMIN)` nessa rota, um `MEMBER` batendo num id que não existe receberia `403` em vez de `404`. A ordem do MVP quebraria.

Por isso o controller de membros só tem `JwtAuthGuard`. A checagem de papel acontece **depois** que o projeto existe:

1. `authorize` → `404` se não existe, `403` se não participa
2. `assertCanManageMembers` → `403` se participa, mas é só `MEMBER`
3. usuário alvo não existe → `404`
4. já é membro → `409`

São dois `403` com mensagens diferentes. Na apresentação, mostra os dois:

- "Você não participa deste projeto" — papel ok ou não, mas não está no projeto
- "Sem permissão para gerenciar membros" — está no projeto, mas é `MEMBER`

`POST /projects` **tem** `@Roles()`. Ali não existe id de projeto ainda, então não há `404` para proteger. `MEMBER` criando projeto é `403` direto.

---

## Rotas

| Método | URL | Quem passa | O que o service faz |
|---|---|---|---|
| `POST` | `/projects` | `PROJECT_MANAGER`, `ADMIN` | Cria projeto, coloca o criador como membro e grava `PROJECT_CREATED` |
| `GET` | `/projects` | autenticado | `ADMIN` vê todos. Os outros só onde são membros |
| `GET` | `/projects/:id` | membro ou `ADMIN` | `404` / `403` via `authorize` |
| `PATCH` | `/projects/:id` | `PM` membro do projeto, ou `ADMIN` | Edita nome, descrição, status. Arquivar grava `PROJECT_ARCHIVED`. `MEMBER` → `403` do `@Roles()` |
| `POST` | `/projects/:id/members` | `PM` membro, ou `ADMIN` | Body: `{ "userId" }`. Duplicado → `409` |
| `GET` | `/projects/:id/members` | membro ou `ADMIN` | Lista sem `passwordHash` |
| `DELETE` | `/projects/:id/members/:userId` | `PM` membro, ou `ADMIN` | Dono → `409`. Vínculo inexistente → `404` |
| `GET` | `/projects/:id/activities` | membro ou `ADMIN` | Histórico, mais novo primeiro |
| `PATCH` | `/users/:id/role` | `ADMIN` | Já existia. Continua igual por fora |

O `userId` do body de membro é **quem entra no projeto**, não quem está logado. Quem executa a ação sai do token (`@CurrentUser()`).

---

## Activity é parte da mesma transação

Criar projeto faz três escritas: o projeto, o vínculo do dono, o histórico. Se a activity falhar e o projeto ficar salvo, a banca vê uma ação sem rastro. `UnitOfWork.run` abre um `prisma.$transaction`. Ou as três entram, ou nenhuma entra.

O mesmo vale para editar, arquivar, adicionar membro e remover membro.

Ações deste dia, em `src/projects/activity-actions.ts`:

- `PROJECT_CREATED`
- `PROJECT_UPDATED` (nome, descrição, ou reativar um projeto arquivado)
- `PROJECT_ARCHIVED` (o status foi para `ARCHIVED`; se no mesmo PATCH o nome também mudou, essa é a ação, e o metadata leva os dois)
- `MEMBER_ADDED`
- `MEMBER_REMOVED`

`PATCH` sem campo nenhum → `400`. `PATCH` com os mesmos valores que já estão no banco → `200` e **não** grava activity. Histórico é mudança, não request.

Promover role **não** grava activity. A lista mínima do MVP não inclui isso, e não existe `projectId` nessa ação. Se quiser no dia 4, a gente acrescenta com `projectId` nulo. Não inventei agora.

No dia 3, task/comentário/anexo entram no mesmo lugar: `ActivityAction` ganha as ações novas, e o service da task chama `activitiesRepository.record` **dentro** do `UnitOfWork`.

---

## O repositório não decide permissão

O repository só traduz a intenção em query. Dois detalhes que valem ponto:

O `select` de membro pede `id`, `email` e `role` do usuário. `passwordHash` nem sai do banco nessa query. A camada de cima não tem como vazar um campo que não recebeu. O `UsersRepository` da promoção faz a mesma coisa.

O `create` / `update` / `delete` de membro e o `record` de activity **exigem** o `tx` da transação no tipo. O TypeScript não deixa gravar activity "solta", fora do `UnitOfWork`.

Membro duplicado: o service consulta antes, para devolver `409` com mensagem clara. Se duas requests passarem juntas, o `@@unique([projectId, userId])` estoura `P2002` e o `catch` vira o mesmo `409`. A constraint é a garantia. A consulta é a mensagem.

---

## Decisões que você precisa conseguir defender

Estão no `docs/MVP-gestao-projetos-times.md`, seção "Decisões fechadas no dia 2".

- Quem cria o projeto vira `owner` **e** `ProjectMember`. Sem o vínculo, o próprio PM cairia no `403` de "não participa".
- `MEMBER` vê os projetos em que participa. Não edita nome, descrição nem status. A ficha do projeto, inclusive arquivar, é de `PROJECT_MANAGER` (se for membro) e `ADMIN`. Adicionar e remover gente segue a mesma dupla.
- `PROJECT_MANAGER` mexe em membros só nos projetos em que **ele** participa. "Nos seus" não significa "em qualquer projeto".
- Remover o `owner` → `409`. Não existe transferência de posse neste MVP.
- Convite é por `userId` de alguém que já tem conta. Sem SMTP, sem coluna de e-mail no `ProjectMember`.
- Projeto `ARCHIVED` ainda aceita editar dados e mexer em membros. O bloqueio de criar/mover **task** é o dia 3, e aí o status vira `409`.

O `PATCH /projects/:id` segue a mesma ordem do `authorize`: id inexistente é `404` até para `MEMBER`. Quem participa e é só `MEMBER` recebe `403` no service. PM de outro projeto cai no `403` do `authorize`.

---

## O que eu verifiquei

`npm run build` passou.

Com a API no ar, percorri o fluxo e apaguei os dados de teste em seguida:

- sem token → `401`
- nome com menos de 3 caracteres → `400`
- id que não é UUID → `400`
- `MEMBER` criando projeto → `403`
- UUID válido que não existe → `404`
- autenticado fora do projeto → `403`
- `ADMIN` abrindo projeto de outro → `200`
- adicionar membro → `201`, resposta sem `passwordHash`
- adicionar de novo → `409`
- `MEMBER` do projeto tentando adicionar gente → `403`
- remover o dono → `409`
- `PATCH {}` → `400`
- `MEMBER` no `PATCH` → `403`; PM membro arquivando → `200`
- activities com `PROJECT_CREATED`, `MEMBER_ADDED` e `PROJECT_ARCHIVED`

---

## O que ficou para o dia 3

Task, máquina de estados, comentário, upload, feriado. Quando for a sua vez de escrever a regra da task, o acesso ao projeto **não** se repete: chama `ProjectAccessService.authorize`. A activity da task entra no `UnitOfWork`, do lado do service, não no interceptor.
