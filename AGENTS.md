# Contexto para agentes — Avaliação Backend

Leia este arquivo **antes** de gerar código, scaffolds ou refactors neste repositório.

## Fonte da verdade

1. **Avaliação (nota):** `docs/AV-03-PROJETOS.md` — o que o professor cobra.
2. **Produto/MVP:** `docs/MVP-gestao-projetos-times.md` — decisões nossas (`[CRITÉRIO NOSSO]`).
3. Se os dois conflitarem, **o arquivo do professor vence**. Ajuste o MVP e documente no README.

## Como trabalhar com o William

- Fale **sempre em português**.
- Grave arquivos **só neste workspace local**. Sem nuvem, Notion, agente cloud, push ou repo remoto, a menos que ele peça.
- Prioridade: **aprender arquitetura**, não só entregar.
- **Não** despejar implementação completa. Explicar o conceito, fazer perguntas, dar dicas, deixar ele escrever. Código fechado só se ele pedir (“me dá o código”).
- Mix mão × IA (4 dias, não 5):
  - **IA:** boilerplate, Prisma 7.10, wiring Nest, `.env.example`, esqueleto de módulo.
  - **William:** regras de negócio, máquina de estados, autorização, DTOs, exceptions, README da apresentação.
  - **IA depois:** review de camada, SRP, DIP, edge cases — lógica antes de sintaxe.

## Fora de escopo

Pagamento, fila de projeto, SMTP, frontend, `canCreateProject` separado da role.

## Stack obrigatória

NestJS + TypeScript, PostgreSQL, **Prisma 7.10.0** (`prisma.config.ts`, driver adapter, migrations), JWT + `@CurrentUser()`, DTOs + `class-validator` + `ValidationPipe`, Helmet, Compression, `HttpService`, upload de anexo de **tarefa**, 1 interceptor (sem regra de negócio), `ConfigService`, HTTP `400/401/403/404/409`, `npm run build` limpo.

## Arquitetura alvo (não negociar sem discutir)

```
HTTP → Guards (JWT / role) → Pipes (DTO)
    → Controller (fino: parse + chamar use case)
    → Service / domínio (regras, estados, auth de recurso)
    → Repository (Prisma encapsulado)
    → PostgreSQL
```

- Interceptor: log ou timing. Sem máquina de estados aqui.
- Imports: caminho relativo (`./`, `../`). Sem specifier solto `src/...` ou `generated/...`. O `main.ts` fica em `src/`; produção usa `dist/main`.
- Feriados: adapter com `HttpService`. Service de Task **não** conhece URL da API.
- Activity: efeito das ações de domínio, não “log HTTP”.
- Dois eixos de autorização:
  1. **Role global:** `MEMBER` | `PROJECT_MANAGER` | `ADMIN`
  2. **Membro do projeto:** `ProjectMember` (ADMIN = exceção global, documentada)

## Fluxo de produto (apresentação)

1. Seed/admin cria `ADMIN`.
2. `register` → `MEMBER` (não cria projeto).
3. ADMIN promove → `PROJECT_MANAGER`.
4. PM cria `Project` e adiciona membros.
5. Membros: tasks, comments, attachments, status até `WAITING_MANAGER_APPROVE`.
6. Só PM/ADMIN: aprovar (`DONE`) ou reprovar (`IN_PROGRESS`).
7. Ações relevantes gravam `Activity`.

Estados da Task: `TODO ⇄ IN_PROGRESS → WAITING_MANAGER_APPROVE → DONE`, com `CANCELLED` a partir de TODO/IN_PROGRESS (membro) e também de WAITING (PM/ADMIN). **Ninguém** vai direto para `DONE`. Assignee **obrigatoriamente** membro. Projeto `ARCHIVED` → criar/mover task = `409`.

## Plano de 4 dias (comprimido)

| Dia | Foco | William na mão | IA ajuda |
|-----|------|----------------|----------|
| 1 | Scaffold, Prisma, Auth JWT, Helmet, Compression, Interceptor, Config | DTO auth, hash, `@CurrentUser`, o que cada camada faz | Nest + Prisma 7.10 wiring |
| 2 | Project, Member, Activity, promote role, guards de membro | Quem pode o quê; unique member; 403 vs 404 | Esqueleto de módulos |
| 3 | Task + estados + comment + upload + feriados/`dueDate` | Transições, assignee membro, ARCHIVED, feriado = 409 | Multer, HttpService adapter |
| 4 | README, 10 cenários, build; seed/Swagger se sobrar | Narrativa da apresentação | Checklist vs `AV-03` |

Bônus (seed, Swagger, Docker, paginação) **só depois** do obrigatório. Seed ADMIN é o bônus mais útil para a demo.

## Testes a demonstrar (README)

1. Fluxo principal OK  
2. Body inválido → 400  
3. Sem token / token inválido → 401  
4. Autenticado sem permissão → 403  
5. Recurso inexistente → 404  
6. Conflito de negócio → 409  
7. Acesso a recurso de terceiro  
8. Upload válido e inválido  
9. Integração externa OK e falha controlada  
10. Mudança de estado completa (incluir aprovação `WAITING_MANAGER_APPROVE` → `DONE`)

## Checklist rápido antes de merge/entregar

- [ ] Nada de `passwordHash` na resposta
- [ ] Identidade vem do JWT, não de `userId` no body
- [ ] MEMBER não acessa projeto alheio só mudando ID
- [ ] README lista método, URL, auth, body, respostas
