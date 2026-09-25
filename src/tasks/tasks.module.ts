import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../common/authorization.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { AttachmentStorage } from './attachment-storage';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { ProjectTasksController } from './project-tasks.controller';
import { TaskAccess } from './task-access';
import { AttachmentsRepository } from './repositories/attachments.repository';
import { CommentsRepository } from './repositories/comments.repository';
import { TasksRepository } from './repositories/tasks.repository';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { HolidaysModule } from '../holidays/holidays.module';

@Module({
  imports: [PrismaModule, AuthorizationModule, ProjectsModule, HolidaysModule, UsersModule],
  controllers: [
    ProjectTasksController,
    TasksController,
    CommentsController,
    AttachmentsController,
  ],
  providers: [
    TasksService,
    TaskAccess,
    CommentsService,
    AttachmentsService,
    AttachmentStorage,
    TasksRepository,
    CommentsRepository,
    AttachmentsRepository,
  ],
})
export class TasksModule {}
