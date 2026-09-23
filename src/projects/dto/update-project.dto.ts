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
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({
    example: 'Estandes e prazos do time.',
    nullable: true,
    description: 'Nova descrição. null apaga o texto.',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    enum: ProjectStatus,
    example: ProjectStatus.ARCHIVED,
    description:
      'ACTIVE ou ARCHIVED. Arquivar bloqueia criar e mover tarefa, comentar e anexar.',
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
