import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { ProjectStatus } from '../../../generated/prisma/enums';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({
    example: 'Feira de ciências',
    minLength: 3,
    description: 'Novo nome. Mínimo de 3 caracteres.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'O nome deve ser um texto.' })
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres.' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Estandes e prazos do time.',
    nullable: true,
    description: 'Nova descrição. null apaga o texto.',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string | null;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    example: ProjectStatus.ARCHIVED,
    description:
      'ACTIVE ou ARCHIVED. Arquivado bloqueia qualquer alteração, menos voltar para ACTIVE.',
  })
  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'O status deve ser ACTIVE ou ARCHIVED.' })
  status?: ProjectStatus;
}
