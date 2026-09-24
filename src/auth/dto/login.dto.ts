import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator'
import { Role } from '../../../generated/prisma/enums';

export type UserResponse = {
    id: string;
    email: string;
    role: Role;
    createdAt: Date;
  };

export class LoginDto {
    @ApiProperty({
        example: 'ana@email.com',
        description: 'E-mail da conta. O service tira espaços e põe em minúsculas antes de buscar.',
    })
    @IsEmail({}, { message: 'Informe um e-mail válido.' })
    email!: string;

    @ApiProperty({
        example: 'senha1234',
        minLength: 8,
        description: 'Mínimo de 8 caracteres.',
    })
    @IsString({ message: 'A senha deve ser um texto.' })
    @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
    password!: string;
}

