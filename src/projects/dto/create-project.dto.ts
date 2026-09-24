import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateProjectDto {
  @ApiProperty({
    example: 'Feira de ciências',
    minLength: 3,
    description: 'Nome do projeto. Mínimo de 3 caracteres, já sem espaços nas pontas.',
  })
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'O nome deve ser um texto.' })
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres.' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Estandes e prazos do time.',
    description: 'Texto livre. Pode omitir.',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;
}