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
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({
    example: 'Levar o banner e a maquete.',
    nullable: true,
    description: 'Nova descrição. null apaga o texto.',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Novo responsável, que precisa ser membro. null tira o responsável.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  assigneeId?: string | null;

  @ApiPropertyOptional({
    example: '2026-11-20T00:00:00.000Z',
    nullable: true,
    description: 'Novo prazo em ISO 8601. Feriado volta 409. null tira o prazo.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  dueDate?: string | null;
}
