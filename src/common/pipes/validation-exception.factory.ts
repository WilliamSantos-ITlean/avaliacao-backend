import { BadRequestException, ValidationError } from '@nestjs/common';

function messagesFrom(errors: ValidationError[]): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    if (error.constraints) {
      for (const [rule, message] of Object.entries(error.constraints)) {
        messages.push(
          rule === 'whitelistValidation'
            ? `O campo "${error.property}" não é permitido.`
            : message,
        );
      }
    }

    if (error.children?.length) {
      messages.push(...messagesFrom(error.children));
    }
  }

  return messages;
}

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const messages = messagesFrom(errors);
  return new BadRequestException(
    messages.length ? messages : ['Os dados enviados são inválidos.'],
  );
}
