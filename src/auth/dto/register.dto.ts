import { IsEmail, IsString, MinLength } from 'class-validator'
import { Role } from '../../../generated/prisma/enums';

export type UserResponse = {
    id: string;
    email: string;
    role: Role;
    createdAt: Date;
  };

export class RegisterDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8)
    password!: string;
}

