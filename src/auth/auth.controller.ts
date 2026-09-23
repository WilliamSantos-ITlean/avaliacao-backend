import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, UserResponse } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AccessTokenResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth-guard';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ApiJwt } from '../common/swagger';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Get('me')
    @ApiJwt()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'Quem está logado',
        description: 'A identidade sai do token. A resposta não traz passwordHash.',
    })
    @ApiOkResponse({ description: 'Usuário da sessão.', type: UserResponseDto })
    me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponse> {
        return this.authService.me(user.id);
    }

    @Post('login')
    @ApiOperation({
        summary: 'Entrar',
        description:
            'E-mail ou senha errados voltam 401, com a mesma mensagem nos dois casos, para não revelar se a conta existe. Este POST responde 201.',
    })
    @ApiCreatedResponse({ description: 'JWT da sessão.', type: AccessTokenResponseDto })
    @ApiBadRequestResponse({ description: 'E-mail inválido ou senha com menos de 8 caracteres.' })
    @ApiUnauthorizedResponse({ description: 'E-mail ou senha inválidos.' })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto)
    }

    @Post('register')
    @ApiOperation({
        summary: 'Criar conta',
        description: 'A conta nasce MEMBER e não cria projeto. E-mail repetido volta 409. Este POST responde 201.',
    })
    @ApiCreatedResponse({ description: 'Usuário criado, sem passwordHash.', type: UserResponseDto })
    @ApiBadRequestResponse({ description: 'E-mail inválido ou senha com menos de 8 caracteres.' })
    @ApiConflictResponse({ description: 'Este e-mail já foi cadastrado.' })
    register(@Body() dto: RegisterDto): Promise<UserResponse> {
        return this.authService.register(dto);
    }
}
