import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ProjectAccessService } from './project-access.service';
import { ActivitiesRepository } from './repositories/activities.repository';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly activitiesRepository: ActivitiesRepository,
  ) {}

  async listByProject(projectId: string, user: AuthenticatedUser) {
    await this.access.authorize(projectId, user);
    return this.activitiesRepository.listByProject(projectId);
  }
}
