import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';
import { ACCESS_TOKEN } from './common/swagger';

const API_KEY = 'x-api-key';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helmet padrão manda Cross-Origin-Resource-Policy: same-origin e o browser
  // na porta 5173 não consegue ler o JSON. O proxy do Vite evita isso no dia a dia;
  // esta abertura cobre quando a base da API é http://localhost:3000.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // A página /docs injeta o script e o CSS do Swagger UI. Sem estes
      // diretivos o Helmet abre a rota e o navegador deixa a tela em branco.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://validator.swagger.io'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  });
  app.use(compression());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Gestão de projetos e times')
    .setDescription(
      [
        'API da avaliação. No **Authorize** preencha os dois campos: `x-api-key` (vale em toda rota) e o Bearer JWT (rotas privadas). A identidade sai do token, nunca de um id no body. `passwordHash` não aparece em resposta nenhuma.',
        '',
        '### Papéis',
        '- O cadastro nasce **MEMBER**.',
        '- Só o **ADMIN** promove alguém a **PROJECT_MANAGER**.',
        '- **PROJECT_MANAGER** e **ADMIN** criam projeto. Quem cria vira dono e membro.',
        '',
        '### Tarefa',
        '| De | Para | Quem |',
        '| --- | --- | --- |',
        '| `TODO` | `IN_PROGRESS`, `CANCELLED` | membro |',
        '| `IN_PROGRESS` | `TODO`, `WAITING_MANAGER_APPROVE`, `CANCELLED` | membro |',
        '| `WAITING_MANAGER_APPROVE` | `DONE`, `IN_PROGRESS`, `CANCELLED` | **PROJECT_MANAGER** ou **ADMIN** |',
        '',
        'MEMBER nos três destinos da espera recebe **403**. Qualquer outro salto, inclusive ir direto para `DONE`, volta **409**.',
        '',
        '### Projeto arquivado',
        'Projeto `ARCHIVED` rejeita qualquer alteração (**409**): título, descrição, responsável e prazo. A saída é voltar para `ACTIVE`, ou apagar. O apagamento de projeto e de tarefa é lógico. Só o **ADMIN** lista e abre projetos apagados.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addTag('Autenticação', 'Cadastro, login e a sessão do token.')
    .addTag('Usuários', 'Promoção de papel. Só o ADMIN.')
    .addTag('Projetos', 'Criar e manter projetos. MEMBER não cria.')
    .addTag('Membros', 'Quem participa do projeto. O convite é por e-mail.')
    .addTag('Tarefas', 'Quadro e máquina de estados.')
    .addTag('Comentários', 'Comentários da tarefa.')
    .addTag('Anexos', 'Imagem JPEG ou PNG da tarefa, até 2 MB.')
    .addTag('Atividades', 'Histórico das ações de domínio, não das requisições HTTP.')
    .addTag('Feriados', 'Consulta externa. O prazo da tarefa não pode cair num feriado.')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'accessToken devolvido por POST /auth/login. Cole só o token, sem a palavra Bearer.',
      },
      ACCESS_TOKEN,
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Valor de API_KEY no ambiente. O guard global exige este header em toda rota.',
      },
      API_KEY,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== 'object' || !('responses' in operation)) continue;
      const security = operation.security ?? [];
      operation.security = security.length
        ? security.map((requirement) => ({ ...requirement, [API_KEY]: [] }))
        : [{ [API_KEY]: [] }];
    }
  }
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'API — Gestão de projetos',
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
