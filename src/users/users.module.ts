import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../common/authorization.module';
import { UsersController } from './users.controller';
import { UsersRepositoryModule } from './users-repository.module';
import { UsersService } from './users.service';

@Module({
  imports: [UsersRepositoryModule, AuthorizationModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersRepositoryModule],
})
export class UsersModule {}
