import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid', description: 'Id do usuário.' })
  id!: string;

  @ApiProperty({
    example: 'ana@email.com',
    description: 'E-mail da conta. A senha nunca volta na resposta.',
  })
  email!: string;

  @ApiProperty({
    enum: Role,
    example: Role.MEMBER,
    description: 'MEMBER, PROJECT_MANAGER ou ADMIN. O cadastro nasce MEMBER.',
  })
  role!: Role;

  @ApiProperty({ format: 'date-time', description: 'Quando a conta foi criada.' })
  createdAt!: Date;
}

export class AccessTokenResponseDto {
  @ApiProperty({
    description:
      'JWT da sessão. No botão Authorize, cole só este valor. O Swagger envia Authorization: Bearer <token>.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIuLi4ifQ.assinatura',
  })
  accessToken!: string;
}
