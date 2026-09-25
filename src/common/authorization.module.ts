import { Module } from '@nestjs/common';
import { UsersRepositoryModule } from '../users/users-repository.module';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [UsersRepositoryModule],
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class AuthorizationModule {}
