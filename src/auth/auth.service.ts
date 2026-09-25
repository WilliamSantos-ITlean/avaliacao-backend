import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { Role } from '../../generated/prisma/enums';
import { isPrismaError } from '../common/is-prisma-error';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, UserResponse } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwt: JwtService,
  ) {}

  async me(id: string): Promise<UserResponse> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return user;
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findCredentialsByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatch) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  async register(dto: RegisterDto): Promise<UserResponse> {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.usersRepository.findByEmail(email);

    if (exists) {
      throw new ConflictException('Este email ja foi cadastrado!');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      return await this.usersRepository.createMember({
        email,
        passwordHash,
        role: Role.MEMBER,
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new ConflictException('Este email ja foi cadastrado!');
      }

      throw error;
    }
  }
}
