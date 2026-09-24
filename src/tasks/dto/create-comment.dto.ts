import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateCommentDto {
  @ApiProperty({
    example: 'O banner chegou.',
    minLength: 1,
    maxLength: 2000,
    description: 'Texto do comentário. De 1 a 2000 caracteres. O autor é quem está no token.',
  })
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'O comentário deve ser um texto.' })
  @MinLength(1, { message: 'O comentário não pode ficar vazio.' })
  @MaxLength(2000, { message: 'O comentário deve ter no máximo 2000 caracteres.' })
  body!: string;
}
