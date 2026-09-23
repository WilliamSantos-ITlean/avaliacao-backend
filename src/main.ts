import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ACCESS_TOKEN } from './common/swagger';

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
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Gestão de projetos e times')
    .setDescription(
      [
        'API da avaliação. A identidade de quem chama vem do JWT, nunca de um id no body.',
        '',
        'Papéis: o cadastro nasce MEMBER. Só o ADMIN promove alguém a PROJECT_MANAGER. PROJECT_MANAGER e ADMIN criam projeto, e quem cria vira dono e membro.',
        '',
        'Tarefa: TODO pode ir para IN_PROGRESS ou CANCELLED. IN_PROGRESS pode voltar para TODO, seguir para WAITING_MANAGER_APPROVE ou CANCELLED. Só PROJECT_MANAGER ou ADMIN saem de WAITING_MANAGER_APPROVE: aprovam (DONE), devolvem (IN_PROGRESS) ou cancelam. Ninguém vai direto para DONE.',
        '',
        'Projeto ARCHIVED rejeita criar ou mover tarefa, comentar e anexar (409). O responsável precisa ser membro do projeto (409). Prazo em feriado nacional também volta 409.',
        '',
        'passwordHash não aparece em resposta nenhuma.',
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'API — Gestão de projetos',
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
