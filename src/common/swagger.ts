import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

/** Nome do esquema de segurança. Tem que ser o mesmo passado em addBearerAuth. */
export const ACCESS_TOKEN = 'access-token';

/** Rotas privadas. O cadeado do Swagger pede o accessToken do login. */
export function ApiJwt() {
  return applyDecorators(
    ApiBearerAuth(ACCESS_TOKEN),
    ApiBadRequestResponse({
      description:
        'Parâmetro ou body inválido. UUID malformado, e-mail inválido ou campo que o DTO não declara também voltam 400.',
    }),
    ApiUnauthorizedResponse({
      description: 'Sem token ou token inválido.',
    }),
  );
}

export function ApiUuidParam(name: string, description: string) {
  return ApiParam({ name, format: 'uuid', description });
}

export function ApiNotAMember() {
  return ApiForbiddenResponse({
    description:
      'Autenticado, mas não participa deste projeto. ADMIN acessa qualquer projeto.',
  });
}
