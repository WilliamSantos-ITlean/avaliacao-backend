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
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiPropertyOptional({
    example: 'Estandes e prazos do time.',
    description: 'Texto livre. Pode omitir.',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  description?: string;
}