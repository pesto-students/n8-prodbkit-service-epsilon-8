import {
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeepPartial, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppLogger } from '../common/logger';
import { CreateDbDTO } from '../db-credential/db-credential.controller';
import { AuditLog } from '../domain/audit-log';
import { Database } from '../domain/database';
import { TeamMemberRole } from '../domain/team-member-role';
import { GlobalConstants } from '../common/constants';

interface CredentialsCreated {
  body: CreateDbDTO;
  user: TeamMemberRole;
}

interface CredentialsDeleted {
  id: string;
  user: TeamMemberRole;
}

interface DbCreated {
  body: DeepPartial<Database>;
  user: any;
}

interface DbUpdated {
  body: QueryDeepPartialEntity<Database>;
  user: any;
}

interface DbDeleted {
  id: string;
  user: any;
}

interface ListAuditLogDTO {
  id: string;
  actor: any;
  action: any;
  created: Date;
}

@ApiBearerAuth()
@ApiTags('audit-log')
@Controller('/api/audit-log')
export class AuditLogController {
  constructor(
    @Inject('AUDIT_LOG_REPOSITORY')
    private auditRepository: Repository<AuditLog>,
    @Inject('TEAM_MEMBER_ROLE_REPOSITORY')
    private teamMemberRoleRepository: Repository<TeamMemberRole>,
    private logger: AppLogger,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list() {
    try {
      const logs = await this.auditRepository
        .createQueryBuilder('a')
        .leftJoinAndSelect('a.actor', 'tmr')
        .leftJoinAndSelect('tmr.member', 'm')
        .leftJoinAndSelect('tmr.role', 'r')
        .leftJoinAndSelect('tmr.team', 't')
        .getMany();
      const auditLogs: ListAuditLogDTO[] = logs.map(
        (log) =>
          <ListAuditLogDTO>{
            id: log.id,
            actor: log.actor,
            action: JSON.parse(log.action),
            created: log.created,
          },
      );
      return auditLogs;
    } catch (err) {
      this.logger.error(err);
      const errorString = JSON.stringify(err, Object.getOwnPropertyNames(err));
      throw new InternalServerErrorException(errorString);
    }
  }

  @OnEvent('db-credential.created', { async: true })
  async onDbCredentialCreated(payload: CredentialsCreated) {
    const log = new AuditLog();
    log.actor = await this.toTeamMemberRoleAny(payload.user);
    log.action = JSON.stringify({
      payload: payload,
      type: 'db-credential.created',
    });
    await this.auditRepository.save(log);
  }

  @OnEvent('db-credential.recreated', { async: true })
  async onDbCredentialReCreated(payload: CredentialsCreated) {
    const log = new AuditLog();
    log.actor = await this.toTeamMemberRoleAny(payload.user);
    log.action = JSON.stringify({
      payload: payload,
      type: 'db-credential.recreated',
    });
    await this.auditRepository.save(log);
  }

  @OnEvent('db-credential.deleted', { async: true })
  async onDbCredentialDeleted(payload: CredentialsDeleted) {
    const log = new AuditLog();
    log.actor = await this.toTeamMemberRoleAny(payload.user);
    log.action = JSON.stringify({
      payload: payload,
      type: 'db-credential.deleted',
    });
    await this.auditRepository.save(log);
  }

  @OnEvent('db.created', { async: true })
  async onDbCreated(payload: DbCreated) {
    const log = new AuditLog();
    log.actor = await this.toTeamMemberRoleAdmin(payload.user);
    log.action = JSON.stringify({
      payload: payload,
      type: 'db.created',
    });
    await this.auditRepository.save(log);
  }

  @OnEvent('db.updated', { async: true })
  async onDbUpdated(payload: DbUpdated) {
    const log = new AuditLog();
    log.actor = await this.toTeamMemberRoleAdmin(payload.user);
    log.action = JSON.stringify({
      payload: payload,
      type: 'db.updated',
    });
    await this.auditRepository.save(log);
  }

  @OnEvent('db.deleted', { async: true })
  async onDbDeleted(payload: DbDeleted) {
    const log = new AuditLog();
    log.actor = await this.toTeamMemberRoleAdmin(payload.user);
    log.action = JSON.stringify({
      payload: payload,
      type: 'db.updated',
    });
    await this.auditRepository.save(log);
  }

  async toTeamMemberRoleAdmin(user: any): Promise<TeamMemberRole> {
    return this.teamMemberRoleRepository
      .createQueryBuilder('tmr')
      .leftJoinAndSelect('tmr.member', 'm')
      .leftJoinAndSelect('tmr.role', 'r')
      .leftJoinAndSelect('tmr.team', 't')
      .where('t.teamId IN (:...teams)', {
        teams: user.permissions
          .filter((p) => p.roleId === GlobalConstants.ADMIN_ROLE)
          .map((p) => p.teamId),
      })
      .andWhere('m.email = :email', { email: user.username })
      .getOneOrFail();
  }

  async toTeamMemberRoleAny(user: any): Promise<TeamMemberRole> {
    return this.teamMemberRoleRepository
      .createQueryBuilder('tmr')
      .leftJoinAndSelect('tmr.member', 'm')
      .leftJoinAndSelect('tmr.role', 'r')
      .leftJoinAndSelect('tmr.team', 't')
      .where('t.teamId IN (:...teams)', {
        teams: user.permissions.map((p) => p.teamId),
      })
      .andWhere('m.email = :email', { email: user.username })
      .getOneOrFail();
  }
}
