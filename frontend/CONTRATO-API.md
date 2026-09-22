# Contrato que o Norte envia

A fonte da regra continua sendo `docs/AV-03-PROJETOS.md` e `docs/MVP-gestao-projetos-times.md`. Este arquivo só trava o JSON do cliente, para a tela e a API não divergirem no meio do caminho.

Respostas de lista podem ser o array direto ou `{ "data": [...] }`. Objeto único pode vir puro ou em `{ "data": { ... } }`. `passwordHash` nunca volta.

Datas de prazo saem como meio-dia UTC do dia escolhido (`2026-11-20T12:00:00.000Z`), para o fuso não empurrar o dia.

## Auth

`POST /auth/register` e `POST /auth/login`

```json
{ "email": "ana@email.com", "password": "senha1234" }
```

Login precisa devolver:

```json
{ "accessToken": "<jwt>" }
```

O JWT que o Norte entende carrega `sub`, `email` e `role`.

`GET /auth/me` com `Authorization: Bearer <token>`:

```json
{ "id": "...", "email": "ana@email.com", "role": "MEMBER", "createdAt": "..." }
```

Register nasce `MEMBER`. E-mail repetido → `409`. Body inválido → `400`.

## Papel

`PATCH /users/:id/role` — só ADMIN. Os outros → `403`.

```json
{ "role": "PROJECT_MANAGER" }
```

`role` é `MEMBER`, `PROJECT_MANAGER` ou `ADMIN`.

Não há `GET /users` no MVP. A busca por e-mail na tela de Pessoas é opcional (`GET /users?email=`). Se responder 404, use o id.

Se a role mora dentro do JWT, a pessoa precisa entrar de novo depois da promoção. O `JwtStrategy.validate` de hoje lê o payload, não o banco.

## Projeto

`POST /projects` — gestor e admin. Membro → `403`.

```json
{ "name": "Site", "description": "opcional" }
```

`PATCH /projects/:id`

```json
{ "name": "Site", "description": null, "status": "ARCHIVED" }
```

`status`: `ACTIVE` ou `ARCHIVED`. Projeto arquivado: criar ou mover tarefa → `409`.

`GET /projects` — admin vê todos; os demais, só onde são membros.

`GET /projects/:id` — quem não é membro: escolha `403` ou `404` e documente no README. Admin entra em qualquer um.

## Membros

`POST /projects/:id/members`

Com `@` no campo, o Norte manda `{ "email": "ana@email.com" }`. Sem `@`, manda `{ "userId": "..." }`.

Repetir o mesmo par projeto+usuário → `409`.

`DELETE /projects/:id/members/:userId` — o `:userId` é o id do usuário, não o id da linha `ProjectMember`.

`GET` pode devolver o membro com `userId` e `email`, ou `user: { id, email, role }`.

## Tarefa

`POST /projects/:id/tasks`

```json
{
  "title": "Publicar",
  "description": "opcional",
  "assigneeId": "uuid-de-um-membro",
  "dueDate": "2026-11-20T12:00:00.000Z"
}
```

Campos vazios não vão no create. No `PATCH /tasks/:id`, limpar responsável ou prazo manda `null`.

Responsável, se existir, tem que ser membro → senão `409`. Prazo em feriado → `409`.

`PATCH /tasks/:id/status`

```json
{ "status": "IN_PROGRESS" }
```

Transições:

| De | Para | Quem |
|---|---|---|
| TODO | IN_PROGRESS, CANCELLED | membro do projeto |
| IN_PROGRESS | TODO, WAITING_MANAGER_APPROVE, CANCELLED | membro do projeto |
| WAITING_MANAGER_APPROVE | DONE, IN_PROGRESS, CANCELLED | gestor ou admin |
| qualquer outro salto, inclusive ir direto para DONE | — | `409` |

## Comentário, anexo, histórico

`POST /tasks/:id/comments`

```json
{ "body": "texto" }
```

`POST /tasks/:id/attachments` — `multipart/form-data`, campo **`file`**. Sem arquivo, tipo proibido ou tamanho acima do limite → `400`.

`GET /projects/:id/activities` — cada item com `action`, `actorId` (ou `actor.email`) e, se houver, `metadata`.

## Feriados

`GET /holidays?year=2026` — o service de tarefa não conhece a URL. Ela vem do ambiente e sai por um adapter com `HttpService`. Falha e timeout voltam com status tratado, não com processo caído.
