import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../../../generated/prisma/enums';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
