import { ConfigService } from '@nestjs/config';
import { createConnection } from 'typeorm';
import { Database } from '../domain/database';
import { Member } from '../domain/member';
import { Role } from '../domain/role';
import { Team } from '../domain/team';
import { TeamDb } from '../domain/team-db';
import { TeamMemberRole } from '../domain/team-member-role';
import { DatabaseCredential } from '../domain/database-credential';
import { AuditLog } from 'src/domain/audit-log';

export const databaseProviders = [
  {
    provide: 'DATABASE_CONNECTION',
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) =>
      await createConnection({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [
          Database,
          Member,
          Role,
          TeamDb,
          TeamMemberRole,
          Team,
          DatabaseCredential,
          AuditLog,
        ],
        synchronize: configService.get<string>('TESTING') === 'true',
      }),
  },
];
