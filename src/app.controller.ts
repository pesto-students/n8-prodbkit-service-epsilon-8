import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
export class GoogleLoginDTO {
  @ApiProperty()
  id_token: string;
}

export class LoginDTO {
  @ApiProperty()
  email: string;
  password: string;
}

@ApiTags('auth')
@Controller('/api/auth')
export class AppController {
  constructor(
    private authService: AuthService,
    private appService: AppService,
  ) {}

  @ApiBody({ type: GoogleLoginDTO })
  @Post('loginViaGoogle')
  async loginViaGoogle(@Body('id_token') id_token: string) {
    return this.authService.loginWithIdToken(id_token);
  }

  @ApiBody({ type: LoginDTO })
  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.loginWithEmailAndPassword(email, password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard-stats')
  getDashboardStats() {
    return this.appService.getDashboardStats();
  }
}
