import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TaskStatus } from '../../../generated/prisma/enums';

export class UpdateTaskStatusDto {
  @ApiProperty({
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
    description:
      'Próximo estado. TODO → IN_PROGRESS ou CANCELLED. IN_PROGRESS → TODO, WAITING_MANAGER_APPROVE ou CANCELLED. WAITING_MANAGER_APPROVE → DONE, IN_PROGRESS ou CANCELLED, e só se quem chama é PROJECT_MANAGER ou ADMIN. Qualquer outro salto volta 409.',
  })
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}
