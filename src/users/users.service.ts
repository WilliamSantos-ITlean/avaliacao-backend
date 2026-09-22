import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums';
import { UserResponse } from '../auth/dto/register.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async updateRole(id: string, role: Role): Promise<UserResponse> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.usersRepository.updateRole(id, role);
  }
}
