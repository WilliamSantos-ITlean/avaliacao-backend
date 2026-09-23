import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateTaskDto {
  @ApiProperty({
    example: 'Montar o estande',
    minLength: 3,
    description: 'Título. Mínimo de 3 caracteres. A tarefa nasce TODO.',
  })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional({
    example: 'Levar o banner e a maquete.',
    description: 'Texto livre. Pode omitir.',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Id de um membro do projeto. Quem não é membro volta 409.',
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({
    example: '2026-11-20T00:00:00.000Z',
    description: 'Prazo em ISO 8601. Se o dia for feriado nacional, a API volta 409.',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
