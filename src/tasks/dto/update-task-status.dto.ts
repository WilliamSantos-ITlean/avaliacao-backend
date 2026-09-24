import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TaskStatus } from '../../../generated/prisma/enums';

export class UpdateTaskStatusDto {
  @ApiProperty({
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
    description:
      'Próximo estado. TODO → IN_PROGRESS ou CANCELLED. IN_PROGRESS → TODO, WAITING_MANAGER_APPROVE ou CANCELLED. WAITING_MANAGER_APPROVE → DONE, IN_PROGRESS ou CANCELLED só para PROJECT_MANAGER ou ADMIN; MEMBER recebe 403. Qualquer outro salto volta 409.',
  })
  @IsEnum(TaskStatus, {
    message: 'O status deve ser TODO, IN_PROGRESS, WAITING_MANAGER_APPROVE, DONE ou CANCELLED.',
  })
  status!: TaskStatus;
}
