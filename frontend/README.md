# Norte — cliente local de teste

Esta pasta **não entra na nota**. A avaliação é a API Nest. O Norte existe para você exercitar o backend no browser enquanto constrói os módulos, ao lado do Postman e, depois, do Swagger.

A tela não decide permissão, estado nem feriado. Ela envia o contrato e mostra o status que a API devolver (`400`, `401`, `403`, `404`, `409`).

## Subir

Em um terminal, a API:

```bash
npm run start:dev
```

Em outro, o cliente:

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`.

O Vite encaminha `/api` para `http://127.0.0.1:3000`. No Postman você continua chamando a porta 3000 direto. O botão **Copiar token** na barra lateral cola o JWT para o header `Authorization: Bearer`.

## O que já dá para testar

| Tela | Endpoint |
|---|---|
| Entrar / criar conta | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| Projetos | `GET/POST /projects`, `GET/PATCH /projects/:id` |
| Quadro | tasks, status, comentários, anexo (`file`) |
| Membros | `POST/GET /projects/:id/members`, `DELETE .../members/:userId` |
| Pessoas | `PATCH /users/:id/role` |
| Feriados | `GET /holidays?year=` |
| Histórico | `GET /projects/:id/activities` |
| Laboratório | os 10 cenários da avaliação |

O JSON exato está em `CONTRATO-API.md`.

Enquanto `GET /auth/me` não devolver o usuário, a sessão lê `sub`, `email` e `role` do JWT. Isso é um apoio, não a fonte da verdade.

## Fora do build do Nest

`tsconfig.build.json` ignora esta pasta. `npm run build` na raiz continua sendo só a API.
