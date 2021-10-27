import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { AppLogger } from './common/logger';
import { Database } from './domain/database';
import { Team } from './domain/team';

export interface DbStatsDTO {
  name: string;
  teams: number;
}

export interface TeamStatsDTO {
  name: string;
  members: number;
}

export interface OnboardedTeamsDTO {
  teamCount: number;
  month: string;
}
@Injectable()
export class AppService {
  constructor(
    @Inject('DB_REPOSITORY') private dbRespository: Repository<Database>,
    @Inject('TEAM_REPOSITORY') private teamRepository: Repository<Team>,
    private logger: AppLogger,
  ) {}

  async getDashboardStats() {
    try {
      const base = this.dbRespository
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.teamDbs', 'td')
        .leftJoinAndSelect('td.team', 't');

      let dbs = await base.getMany();

      const databaseStats: DbStatsDTO[] = dbs.map(
        (db) =>
          <DbStatsDTO>{
            name: db.name,
            teams: db.teamDbs.length,
          },
      );

      const teams = await this.teamRepository
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.teamMemberRoles', 'tmr')
        .leftJoinAndSelect('tmr.member', 'm')
        .leftJoinAndSelect('tmr.role', 'r')
        .where("r.id = 'TL' OR r.id IS NULL")
        .getMany();

      const teamStats: TeamStatsDTO[] = teams.map(
        (t) =>
          <TeamStatsDTO>{
            name: t.name,
            members: t.teamMemberRoles.length,
          },
      );

      /*
        We are mimicking some data for showcasing charts on the front end.
        Once sufficient data is collected, this will be removed.
      */

      const onboardingStats: OnboardedTeamsDTO[] = [
        {
          teamCount: 1,
          month: 'May',
        },
        {
          teamCount: 2,
          month: 'June',
        },
        {
          teamCount: 4,
          month: 'July',
        },
        {
          teamCount: 3,
          month: 'August',
        },
        {
          teamCount: 5,
          month: 'September',
        },
        {
          teamCount: 3,
          month: 'October',
        },
      ];

      return {
        stats: {
          database: databaseStats,
          teams: teamStats,
          onboardedTeams: onboardingStats,
        },
      };
    } catch (err) {
      this.logger.error(err);
      const errorString = JSON.stringify(err, Object.getOwnPropertyNames(err));
      throw new InternalServerErrorException(errorString);
    }
  }
}
