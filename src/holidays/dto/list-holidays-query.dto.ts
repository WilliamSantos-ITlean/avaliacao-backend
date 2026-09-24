import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ListHolidaysQueryDto {
  @ApiProperty({
    example: 2026,
    minimum: 1900,
    maximum: 2100,
    description: 'Ano consultado na API externa de feriados. Fora de 1900–2100 volta 400.',
  })
  @Type(() => Number)
  @IsInt({ message: 'O ano deve ser um número inteiro.' })
  @Min(1900, { message: 'O ano deve ser maior ou igual a 1900.' })
  @Max(2100, { message: 'O ano deve ser menor ou igual a 2100.' })
  year!: number;
}
