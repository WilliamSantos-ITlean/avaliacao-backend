import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, UserResponse } from './dto/register.dto';
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { Role } from '../../generated/prisma/enums';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
    ) { }

    async me(id: string): Promise<UserResponse> {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        };
    }

    async login(dto: LoginDto) {
        const email = dto.email.trim().toLowerCase();

        const user = await this.prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            throw new UnauthorizedException("Email ou senha inválidos")
        }

        const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash)

        if (!passwordMatch) {
            throw new UnauthorizedException("Email ou senha inválidos")
        }

        const accessToken = await this.jwt.signAsync({
            sub: user.id,
            email: user.email,
            role: user.role,
        })
        return { accessToken };
    }

    async register(dto: RegisterDto) {
        const email = dto.email.trim().toLowerCase();

        const exists = await this.prisma.user.findUnique({
            where: { email }
        })

        if (exists) {
            throw new ConflictException("Este email ja foi cadastrado!")
        }

        const passwordHash = await bcrypt.hash(dto.password, 10)

        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                role: Role.MEMBER,
            },
        })
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        };
    }
}