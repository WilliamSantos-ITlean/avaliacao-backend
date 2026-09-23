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
    @IsEmail()
    email!: string;

    @ApiProperty({
        example: 'senha1234',
        minLength: 8,
        description: 'Mínimo de 8 caracteres. Só entra no banco como hash.',
    })
    @IsString()
    @MinLength(8)
    password!: string;
}

