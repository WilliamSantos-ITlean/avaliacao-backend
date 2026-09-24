# Gestão de Projetos e Times

API NestJS da avaliação. O fluxo é: cadastro nasce `MEMBER`, o `ADMIN` promove a `PROJECT_MANAGER`, o gestor cria o projeto e adiciona membros, os membros trabalham tarefas até `WAITING_MANAGER_APPROVE`, e só gestor ou `ADMIN` aprovam para `DONE`.

A identidade de quem chama sai do JWT. `passwordHash` não aparece em resposta nenhuma.

## Como subir

Requisitos: Node.js, npm e Docker (só o Postgres).

```bash
npm install
copy .env.example .env
docker compose up -d
npx prisma migrate deploy
npm run seed
npm run start:dev
```

Produção:

```bash
npm run build
npm run start:prod
```

A API escuta em `http://localhost:3000`. O Swagger fica em `http://localhost:3000/docs` (bônus). O seed cria o `ADMIN` com `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env`.

Toda rota, inclusive cadastro e login, exige o header `x-api-key` com o valor de `API_KEY`. Sem ele a resposta é `401`, antes de qualquer checagem de JWT. Nas rotas privadas, o header seguinte é `Authorization: Bearer <accessToken>`. Cole só o token no Swagger, sem a palavra Bearer.

`GET /` devolve um texto de saúde e também exige `x-api-key`. Não faz parte do domínio.

## Papéis

| Capacidade | MEMBER | PROJECT_MANAGER | ADMIN |
|---|---|---|---|
| Register, login, me | sim | sim | sim |
| Criar projeto | | sim | sim |
| Ver projetos | seus projetos | seus projetos | todos |
| Editar projeto (nome, descrição, arquivar, desarquivar) | | seus projetos | sim |
| Adicionar e remover membro | | seus projetos | sim |
| Criar, editar e mover tarefa intermediária | seus projetos | seus projetos | sim |
| Aprovar, devolver ou cancelar em `WAITING_MANAGER_APPROVE` | | seus projetos | sim |
| Apagar o próprio comentário ou a própria imagem | autor / quem enviou | autor / quem enviou | qualquer um |
| Apagar projeto (lógico) | se for o dono | se for o dono | sim |
| Apagar tarefa (lógico) | membro | membro | sim |
| Ver projetos apagados | | | sim |
| Promover papel | | | sim |

`ADMIN` entra em qualquer projeto. Os outros papéis precisam ser `ProjectMember`. Quem cria o projeto vira dono e membro na mesma transação. O dono não pode ser removido (`409`). Este MVP não transfere a posse.

A role `PROJECT_MANAGER` é da conta, não do projeto. Um gestor adicionado a um projeto de outra pessoa continua gestor: aprova tarefa, edita e arquiva o projeto, adiciona e remove membro. Ele não vira dono ao entrar. Fora do projeto, a role global sozinha responde `403`.

Apagar o projeto é a exceção. Só o dono ou o `ADMIN` chamam `DELETE /projects/:id`. O gestor que só é membro recebe `403` e pode ser removido do projeto. O dono não pode ser removido.

A role usada na regra é a do banco, não a gravada no token. Promover alguém vale na request seguinte. Usuário apagado do banco recebe `401`. Promoção de papel não grava `Activity`: o histórico é do projeto, não da conta global.

## Ordem dos erros

Depois do JWT, no recurso de um projeto:

1. Recurso inexistente: `404`
2. Autenticado, não membro e não `ADMIN`: `403`
3. Regra de negócio (membro duplicado, `ARCHIVED`, transição inválida, feriado, responsável fora do time): `409`

O `403` de não membro revela que o id existe. Sem token, ou com token inválido: `401`.

Em `PATCH /projects/:id`, o `@Roles(PROJECT_MANAGER, ADMIN)` responde antes do service. `MEMBER` recebe `403` de papel mesmo se o id não existe. O `404` dessa rota se demonstra com PM ou ADMIN.

`POST` e `DELETE` de membro não usam `@Roles`. O `404` do projeto acontece primeiro; o `403` de papel sai no service.

`DELETE /projects/:id` também não usa `@Roles`. O `404` vem primeiro. Quem participa, mas não é o dono nem `ADMIN`, recebe `403` no service.

Body inválido, campo extra (`forbidNonWhitelisted`) ou UUID malformado: `400`.

## Estados da tarefa

```
TODO ⇄ IN_PROGRESS → WAITING_MANAGER_APPROVE → DONE
         │                    │
         └→ CANCELLED ←───────┘
```

| De | Para | Quem | Se falhar |
|---|---|---|---|
| TODO | IN_PROGRESS ou CANCELLED | membro, PM, ADMIN | outro destino: `409` |
| IN_PROGRESS | TODO, WAITING_MANAGER_APPROVE ou CANCELLED | membro, PM, ADMIN | outro destino: `409` |
| WAITING_MANAGER_APPROVE | DONE, IN_PROGRESS ou CANCELLED | PM, ADMIN | MEMBER: `403` |
| qualquer outro salto, inclusive ir direto para DONE | | | `409` |
| repetir o status atual | | | `200`, sem `Activity` |

`DONE` e `CANCELLED` não têm saída. A tarefa nasce `TODO`. O body de criação não aceita status.

`assigneeId` é opcional. Se vier, a pessoa precisa ser membro do projeto (`409`). `null` tira o responsável.

## Projeto arquivado

`ARCHIVED` rejeita qualquer alteração, com `409`. Isso inclui criar ou editar tarefa (título, descrição, responsável e prazo), mudar status, comentar, anexar, apagar comentário ou imagem, e adicionar ou remover membro.

A única alteração de ficha aceita no projeto arquivado é voltar o status para `ACTIVE`. Apagar o projeto ou uma tarefa (apagamento lógico) também é aceito com o projeto arquivado.

## Apagamento lógico

`DELETE /projects/:id` e `DELETE /tasks/:id` preenchem `deletedAt`. A linha não sai do banco, e o histórico de `Activity` continua.

Projeto apagado some de `GET /projects` para todo mundo. `GET /projects/:id` devolve `404` para quem não é `ADMIN`. O `ADMIN` ainda abre esse id e lista todos em `GET /projects/deleted`. Tarefa apagada some da lista do projeto ativo. O `ADMIN` ainda abre `GET /tasks/:id`. No projeto apagado, a listagem de tarefas do `ADMIN` inclui as tarefas apagadas.

## Feriados

`GET /holidays?year=` usa `HttpService`. A URL vem de `HOLIDAYS_API_URL`. Timeout de 5 segundos. Falha, timeout, URL ausente ou payload inesperado voltam `502`, também quando o erro acontece dentro de criar ou editar tarefa com prazo.

O dia comparado com a Brasil API é o calendário `America/Sao_Paulo` (UTC−3, sem horário de verão). Se esse dia civil for feriado nacional, criar ou atualizar a tarefa volta `409`.

## Upload

`POST /tasks/:id/attachments` recebe `multipart/form-data` no campo `file`.

- sem arquivo: `400`
- acima de 2 MB: `400`
- MIME diferente de `image/jpeg` ou `image/png`: `400`

A validação usa o MIME declarado. Não há leitura da assinatura dos bytes. O arquivo fica em `UPLOAD_DIR` (padrão `./uploads`, fora do Git) e a linha em `Attachment` liga o arquivo à tarefa. `GET .../attachments/:attachmentId` devolve os bytes para membro ou `ADMIN`.

## Interceptor

`LoggingInterceptor` é global. Depois de cada request bem-sucedida ele grava método, URL, status HTTP e duração em milissegundos. Não grava body, header, token nem senha. Não decide regra de negócio.

## Activity

Grava, na mesma transação da ação: criar, editar e arquivar projeto; adicionar e remover membro; criar e editar tarefa; mudar status; criar e apagar comentário; enviar e apagar anexo.

Apagar projeto ou tarefa grava `PROJECT_DELETED` ou `TASK_DELETED` e não remove a linha. `ARCHIVED`, `CANCELLED` e `DONE` continuam sendo estado, não exclusão.

## Endpoints

Headers comuns das rotas privadas: `x-api-key` e `Authorization: Bearer <token>`.

### Autenticação

`POST /auth/register` — público (só `x-api-key`). Body: `{ "email", "password" }` (senha com no mínimo 8 caracteres). `201` usuário sem `passwordHash`, papel `MEMBER`. `400` body inválido. `409` e-mail repetido.

`POST /auth/login` — público (só `x-api-key`). Body: `{ "email", "password" }`. `201` `{ "accessToken" }`. `401` e-mail ou senha inválidos, com a mesma mensagem nos dois casos. `400` body inválido.

`GET /auth/me` — autenticado. `200` usuário da sessão, sem `passwordHash`. `401` sem token ou token inválido.

### Usuários

`PATCH /users/:id/role` — só `ADMIN`. Body: `{ "role": "MEMBER" | "PROJECT_MANAGER" | "ADMIN" }`. `200` usuário atualizado. `403` quem não é ADMIN. `404` usuário inexistente. `400` UUID ou papel inválido.

### Projetos

`POST /projects` — PM ou ADMIN. Body: `{ "name", "description"? }`. `201` projeto; quem cria vira dono e membro. `403` MEMBER.

`GET /projects` — autenticado. ADMIN vê todos. Os outros veem só onde são membros. `200`.

`GET /projects/deleted` — só ADMIN. `200` projetos com `deletedAt`. `403` qualquer outro papel.

`GET /projects/:id` — membro ou ADMIN. `200`. `404` inexistente. Projeto apagado também é `404`, exceto para o ADMIN. `403` autenticado fora do projeto.

`PATCH /projects/:id` — PM membro ou ADMIN. Body: `{ "name"?, "description"?, "status"?: "ACTIVE" | "ARCHIVED" }`. Pelo menos um campo. `200`. `400` body vazio ou inválido. `403` MEMBER (mesmo com id inexistente) ou PM que não participa. `404` inexistente, quando quem chama passou no papel. `409` se o projeto está `ARCHIVED` e a mudança não é só voltar para `ACTIVE`, ou se já foi apagado.

`DELETE /projects/:id` — dono ou ADMIN. `200` com `deletedAt`. `403` quem não é o dono (inclusive PM membro) ou quem está fora do projeto. `404` inexistente. `409` se o ADMIN tentar apagar de novo.

### Membros

`POST /projects/:id/members` — PM membro ou ADMIN. Body: `{ "email" }`. `201`. `404` projeto ou e-mail sem conta. `403` MEMBER. `409` já é membro.

`GET /projects/:id/members` — membro ou ADMIN. `200` e-mail e papel, nunca `passwordHash`. `404` / `403` como nas outras rotas do projeto.

`DELETE /projects/:id/members/:userId` — PM membro ou ADMIN. `200`. `404` projeto ou membro. `403` MEMBER. `409` tentativa de remover o dono.

### Tarefas

`POST /projects/:id/tasks` — membro ou ADMIN. Body: `{ "title", "description"?, "assigneeId"?, "dueDate"? }`. Nasce `TODO`. `201`. `404` projeto. `403` fora do projeto. `409` projeto arquivado, responsável que não é membro, ou prazo em feriado. `502` se a consulta de feriados falhar.

`GET /projects/:id/tasks` — membro ou ADMIN. `200`.

`GET /tasks/:id` — membro do projeto da tarefa, ou ADMIN. `200`. `404` tarefa. `403` fora do projeto.

`PATCH /tasks/:id` — membro ou ADMIN. Body com pelo menos um de `title`, `description`, `assigneeId`, `dueDate`. Não muda status. `200`. `400` body vazio. `409` projeto arquivado ou apagado, responsável fora do time, feriado, ou tarefa já apagada. `502` se a consulta de feriados falhar.

`PATCH /tasks/:id/status` — membro ou ADMIN, com a máquina de estados acima. Body: `{ "status" }`. `200`. `403` MEMBER tenta sair de `WAITING_MANAGER_APPROVE`. `409` salto inválido, projeto arquivado ou apagado, ou tarefa já apagada.

`DELETE /tasks/:id` — membro ou ADMIN. `200` com `deletedAt`. `404` inexistente, ou tarefa já apagada para quem não é ADMIN. `409` projeto apagado, ou ADMIN apagando de novo. Projeto `ARCHIVED` ainda aceita este delete.

### Comentários

`POST /tasks/:id/comments` — membro ou ADMIN. Body: `{ "body" }` (1 a 2000 caracteres). O autor é o token. `201`. `409` projeto arquivado. `404` tarefa. `403` fora do projeto.

`GET /tasks/:id/comments` — membro ou ADMIN. `200`.

`DELETE /tasks/:id/comments/:commentId` — autor do comentário ou ADMIN. `200` comentário apagado. `404` tarefa, ou comentário inexistente ou de outra tarefa. `403` outro membro (inclusive PM que não é o autor) ou quem está fora do projeto. `409` projeto arquivado.

### Anexos

`POST /tasks/:id/attachments` — membro ou ADMIN. Campo `file`. `201`. `400` ausência, tamanho ou tipo. `409` projeto arquivado.

`GET /tasks/:id/attachments` — membro ou ADMIN. `200` metadados, sem o binário.

`GET /tasks/:id/attachments/:attachmentId` — membro ou ADMIN. `200` bytes (`image/jpeg` ou `image/png`). `404` anexo inexistente ou de outra tarefa.

`DELETE /tasks/:id/attachments/:attachmentId` — quem enviou ou ADMIN. `200`. `404` tarefa, ou anexo inexistente ou de outra tarefa. `403` outro membro (inclusive PM que não enviou) ou quem está fora do projeto. `409` projeto arquivado. O arquivo sai do disco depois que o banco confirma.

### Atividades e feriados

`GET /projects/:id/activities` — membro ou ADMIN. `200` histórico de domínio, não o log HTTP.

`GET /holidays?year=2026` — qualquer autenticado. `200` lista `{ date, name }`. `400` ano fora de 1900–2100. `502` falha controlada da API externa.

## Dez cenários para demonstrar

Substitua `<KEY>` e cole o token devolvido pelo login. A base é `http://localhost:3000`.

1. Fluxo principal. `POST /auth/register` de um membro. Login do ADMIN do seed. `PATCH /users/:id/role` com `{ "role": "PROJECT_MANAGER" }`. Login do gestor. `POST /projects`. `POST /projects/:id/members` com o e-mail do membro. Login do membro. `POST /projects/:id/tasks`. `PATCH /tasks/:id/status` até `WAITING_MANAGER_APPROVE`. Login do gestor. `PATCH /tasks/:id/status` com `{ "status": "DONE" }`. Esperado: `201` e `200` ao longo do caminho, tarefa `DONE`.

2. Body inválido. `POST /auth/register` com senha de 3 caracteres. Esperado: `400`.

3. Token. `GET /auth/me` sem `Authorization`. Esperado: `401`. Repetir com `Bearer` adulterado. Esperado: `401`. `POST /auth/login` sem `x-api-key`. Esperado: `401`.

4. Sem permissão. Membro autenticado chama `POST /projects`. Esperado: `403`. O mesmo membro, com a tarefa em `WAITING_MANAGER_APPROVE`, chama `PATCH /tasks/:id/status` com `{ "status": "DONE" }`. Esperado: `403`, não `409`.

5. Inexistente. PM ou ADMIN chama `GET /projects/<uuid que não está no banco>`. Esperado: `404`.

6. Conflito. Adicionar o mesmo e-mail duas vezes em `POST /projects/:id/members`. Esperado: `409`. Arquivar o projeto e tentar `POST /projects/:id/tasks`. Esperado: `409`.

7. Recurso de terceiro. Usuário membro do projeto A chama `GET /projects/<id do projeto B>`. Esperado: `403`. O mesmo usuário chama `DELETE /tasks/:id/comments/:commentId` de um comentário cujo autor é outra pessoa. Esperado: `403`.

8. Upload. `POST /tasks/:id/attachments` com um JPEG de até 2 MB. Esperado: `201`. Repetir sem o campo `file`, com PDF, ou com arquivo maior que 2 MB. Esperado: `400`.

9. Feriados. `GET /holidays?year=2026` com `HOLIDAYS_API_URL` válida. Esperado: `200`. Apontar a URL para um host inexistente e repetir. Esperado: `502`. Criar tarefa com `dueDate` no dia civil de Brasília igual a um feriado nacional (por exemplo `2026-01-01T22:00:00-03:00`, que em UTC já é 2 de janeiro, mas em Brasília ainda é 1 de janeiro). Esperado: `409`.

10. Máquina de estados. `TODO` → `IN_PROGRESS` → `WAITING_MANAGER_APPROVE` como membro (`200`). Tentar `DONE` como membro (`403`). Gestor aprova para `DONE` (`200`). Tentar sair de `DONE` (`409`). Tentar `TODO` direto para `DONE` em outra tarefa (`409`).
