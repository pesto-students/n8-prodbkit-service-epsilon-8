import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
export class LoginDTO {
  @ApiProperty()
  id_token: string;
}

@ApiTags('auth')
@Controller('/api/auth')
export class AppController {
  constructor(
    private authService: AuthService,
    private appService: AppService,
  ) {}

  @ApiBody({ type: LoginDTO })
  @Post('login')
  async login(@Body('id_token') id_token: string) {
    return this.authService.loginWithIdToken(id_token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard-stats')
  getDashboardStats() {
    return this.appService.getDashboardStats();
  }
}
