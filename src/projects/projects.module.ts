import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../common/authorization.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ProjectAccessService } from './project-access.service';
import { ProjectMembersController } from './project-members.controller';
import { ProjectMembersService } from './project-members.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ActivitiesRepository } from './repositories/activities.repository';
import { ProjectMembersRepository } from './repositories/project-members.repository';
import { ProjectsRepository } from './repositories/projects.repository';

@Module({
  imports: [PrismaModule, AuthorizationModule, UsersModule],
  controllers: [
    ProjectsController,
    ProjectMembersController,
    ActivitiesController,
  ],
  providers: [
    ProjectsService,
    ProjectMembersService,
    ActivitiesService,
    ProjectAccessService,
    ProjectsRepository,
    ProjectMembersRepository,
    ActivitiesRepository,
  ],
  exports: [
    ProjectAccessService,
    ActivitiesRepository,
    ProjectsRepository,
    ProjectMembersRepository,
  ],
})
export class ProjectsModule {}
