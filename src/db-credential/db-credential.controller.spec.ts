import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { Test, TestingModule } from '@nestjs/testing';
import { join } from 'path';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { DbController } from '../db/db.controller';
import { MemberController } from '../member/member.controller';
import { RepositoryModule } from '../repository/repository.module';
import { TeamController } from '../team/team.controller';
import { UsersModule } from '../users/users.module';
import { DbCredentialController } from './db-credential.controller';

describe('DbCredentialController', () => {
  let controller: DbCredentialController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        EventEmitterModule.forRoot(),
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '..', 'frontend/dist'),
          exclude: ['/api/(.*)'],
        }),
        AuthModule,
        UsersModule,
        DatabaseModule,
        RepositoryModule,
        CommonModule,
      ],
      controllers: [
        AppController,
        TeamController,
        MemberController,
        DbController,
        DbCredentialController,
      ],
      providers: [AppService],
    }).compile();

    controller = module.get<DbCredentialController>(DbCredentialController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
