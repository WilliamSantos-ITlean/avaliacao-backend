import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({
    example: 'Montar o estande',
    minLength: 3,
    description: 'Novo título. Mínimo de 3 caracteres.',
  })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'O título deve ser um texto.' })
  @MinLength(3, { message: 'O título deve ter no mínimo 3 caracteres.' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Levar o banner e a maquete.',
    nullable: true,
    description: 'Nova descrição. null apaga o texto.',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Novo responsável, que precisa ser membro. null tira o responsável.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID(undefined, { message: 'O responsável deve ser um UUID válido.' })
  assigneeId?: string | null;

  @ApiPropertyOptional({
    example: '2026-11-20T00:00:00.000Z',
    nullable: true,
    description: 'Novo prazo em ISO 8601. O dia civil é o de Brasília. Feriado volta 409. null tira o prazo.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString({}, { message: 'O prazo deve ser uma data no formato ISO 8601.' })
  dueDate?: string | null;
}
