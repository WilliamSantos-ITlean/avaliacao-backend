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
  @IsString({ message: 'O título deve ser um texto.' })
  @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres.' })
  title!: string;

  @ApiPropertyOptional({
    example: 'Levar o banner e a maquete.',
    description: 'Texto livre. Pode omitir.',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Id de um membro do projeto. Quem não é membro volta 409.',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'O responsável deve ser um UUID válido.' })
  assigneeId?: string;

  @ApiPropertyOptional({
    example: '2026-11-20T00:00:00.000Z',
    description: 'Prazo em ISO 8601. O dia civil é o de Brasília. Se for feriado nacional, a API volta 409.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'O prazo deve ser uma data no formato ISO 8601.' })
  dueDate?: string;
}
