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
  teams: number;
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

      const allTeams = await this.teamRepository
        .createQueryBuilder('t')
        .groupBy('t.teamId')
        .addGroupBy('t.created')
        .getMany();

      const modifiedTeams = allTeams.map(({ name, created }) => ({
        name,
        created: new Date(created).toLocaleString('default', { month: 'long' }),
      }));

      const monthWiseTeamCountObj = {};

      modifiedTeams.forEach((team) => {
        if (!Object.keys(monthWiseTeamCountObj).includes(team.created)) {
          monthWiseTeamCountObj[team.created] = 1;
        } else {
          monthWiseTeamCountObj[team.created]++;
        }
      });

      const onboardingStats: OnboardedTeamsDTO[] = Object.entries(
        monthWiseTeamCountObj,
      ).map((monthWiseTeamCount) => ({
        month: monthWiseTeamCount[0],
        teams: monthWiseTeamCount[1] as number,
      }));

      return {
        stats: {
          databases: databaseStats,
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
