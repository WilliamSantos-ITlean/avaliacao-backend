import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator'
import { Role } from '../../../generated/prisma/enums';

export type UserResponse = {
    id: string;
    email: string;
    role: Role;
    createdAt: Date;
  };

export class RegisterDto {
    @ApiProperty({
        example: 'ana@email.com',
        description: 'E-mail da nova conta. Gravado em minúsculas.',
    })
    @IsEmail({}, { message: 'Informe um e-mail válido.' })
    email!: string;

    @ApiProperty({
        example: 'senha1234',
        minLength: 8,
        description: 'Mínimo de 8 caracteres. Só entra no banco como hash.',
    })
    @IsString({ message: 'A senha deve ser um texto.' })
    @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
    password!: string;
}

