import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AddProjectMemberDto {
  @ApiProperty({
    example: 'ana@email.com',
    description:
      'E-mail de quem já tem conta. O service normaliza e resolve o userId. UUID não entra neste body.',
  })
  @IsEmail()
  email!: string;
}
