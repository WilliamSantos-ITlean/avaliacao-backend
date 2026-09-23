import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';

export class UpdateRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.PROJECT_MANAGER,
    description:
      'Novo papel. Na demo, o ADMIN promove MEMBER para PROJECT_MANAGER. Esse passo é o que libera criar projeto.',
  })
  @IsEnum(Role)
  role!: Role;
}