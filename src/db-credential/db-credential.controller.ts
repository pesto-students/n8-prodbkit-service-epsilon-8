import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  InternalServerErrorException,
  Param,
  Post,
  Request,
  UnauthorizedException,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiProperty, ApiTags } from '@nestjs/swagger';
import { GlobalConstants } from '../common/constants';

import {
  Connection as PostgresConnection,
  createConnection,
  EntityManager,
  Repository,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppLogger } from '../common/logger';
import { decryptExternalDatabases } from '../database/external.providers';
import { Database } from '../domain/database';
import { DatabaseCredential } from '../domain/database-credential';
import { Member } from '../domain/member';
import { TeamMemberRole } from '../domain/team-member-role';

export class ReCreateDbDTO {
  @ApiProperty()
  id: string;
}

export class CreateDbDTO {
  @ApiProperty()
  name: string;
  @ApiProperty()
  purpose: string;
  @ApiProperty()
  expiration: Date;
  @ApiProperty()
  accessLevel: string;
  @ApiProperty()
  member_id: string;
  @ApiProperty()
  team_id: string;
  @ApiProperty()
  role_id: string;
  @ApiProperty()
  cluster_id: string;
  @ApiProperty()
  db_name: string;
  @ApiProperty({ nullable: true })
  username: string;
}

interface ListCredentialDTO {
  id: string;
  name: string;
  purpose: string;
  expiration: Date | null;
  status: string;
  connection_string: string;
  accessLevel: string;
  created?: Date | null;
  updated?: Date | null;
  member: MemberDTO;
  team: TeamDTO;
  database: DatabaseDTO;
  cluster: ClusterDTO;
}

interface MemberDTO {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TeamDTO {
  team_id: string;
  name: string;
}

interface DatabaseDTO {
  id: string;
  name: string;
  description: string;
  connection_string: string;
  status: string;
  platform: string;
  environment: string;
  mode: string;
}

interface ClusterDTO {
  id: string;
  name: string;
  description: string;
  connection_string: string;
  status: string;
  platform: string;
  environment: string;
  mode: string;
}

interface ICredential {
  host: string;
  user: string;
  pass: string;
  db: string;
  access_level: string;
}

@ApiBearerAuth()
@ApiTags('db-credential')
@Controller('/api/db-credential')
export class DbCredentialController {
  constructor(
    @Inject('DB_CREDENTIAL_REPOSITORY')
    private dbCredentialRepository: Repository<DatabaseCredential>,
    @Inject('DB_REPOSITORY')
    private dbRespository: Repository<Database>,
    @Inject('TEAM_MEMBER_ROLE_REPOSITORY')
    private teamMemberRoleRepository: Repository<TeamMemberRole>,
    @Inject('MEMBER_REPOSITORY') private memberRepository: Repository<Member>,
    private logger: AppLogger,
    private configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Request() req: any) {
    try {
      const base = this.dbCredentialRepository
        .createQueryBuilder('dc')
        .leftJoinAndSelect('dc.creator', 'tmr')
        .leftJoinAndSelect('tmr.member', 'm')
        .leftJoinAndSelect('tmr.role', 'r')
        .leftJoinAndSelect('tmr.team', 't')
        .leftJoinAndSelect('dc.database', 'd');

      let dbCredentials = [];
      if (
        req.user.permissions.some(
          (p) => p.roleId === GlobalConstants.ADMIN_ROLE,
        )
      ) {
        dbCredentials = await base.getMany();
      } else if (
        req.user.permissions.some(
          (p) => p.roleId === GlobalConstants.TEAM_LEAD_ROLE,
        )
      ) {
        dbCredentials = await base
          .where('t.teamId IN (:...teams)', {
            teams: req.user.permissions
              .filter((p) => p.roleId === GlobalConstants.TEAM_LEAD_ROLE)
              .map((p) => p.teamId),
          })
          .getMany();
      } else {
        dbCredentials = await base
          .where('m.email = :email', { email: req.user.username })
          .getMany();
      }

      const dtos = dbCredentials.map(
        (dc: DatabaseCredential) =>
          <ListCredentialDTO>{
            id: dc.id,
            name: dc.name,
            purpose: dc.purpose,
            expiration: dc.expiration,
            status: dc.status,
            connection_string: dc.connectionString,
            accessLevel: dc.accessLevel,
            created: dc.created,
            updated: dc.updated,
            member: <MemberDTO>{
              name: dc.creator.member.name,
              id: dc.creator.member.id,
              email: dc.creator.member.email,
              role: dc.creator.role.id,
            },
            team: <TeamDTO>{
              team_id: dc.creator.team.teamId,
              name: dc.creator.team.name,
            },
            database: <DatabaseDTO>{
              name: dc.database?.name,
              id: dc.database?.id,
              connection_string: dc.database?.connectionString,
              status: dc.database?.status,
              mode: dc.database?.mode,
              environment: dc.database?.environment,
              platform: dc.database?.platform,
              description: dc.database?.description,
            },
          },
      );

      return dtos;
    } catch (err) {
      this.logger.error(err);
      const errorString = JSON.stringify(err, Object.getOwnPropertyNames(err));
      throw new InternalServerErrorException(errorString);
    }
  }

  @ApiBody({ type: CreateDbDTO })
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req: any, @Body() body: CreateDbDTO) {
    try {
      const teamMemberRole = await this.teamMemberRoleRepository
        .createQueryBuilder('tmr')
        .leftJoinAndSelect('tmr.member', 'm')
        .leftJoinAndSelect('tmr.role', 'r')
        .leftJoinAndSelect('tmr.team', 't')
        .where('t.teamId = :teamId', { teamId: body.team_id })
        .andWhere('m.id = :member_id', { member_id: body.member_id })
        .andWhere('r.id = :role_id', { role_id: body.role_id })
        .getOneOrFail();
      const db = await this.dbRespository
        .createQueryBuilder('d')
        .leftJoinAndSelect('d.cluster', 'c')
        .where('d.name = :name', { name: body.db_name })
        .andWhere('c.id = :cluster_id', { cluster_id: body.cluster_id })
        .getOneOrFail();
      const newCredential = new DatabaseCredential();
      if (
        req.user.permissions.some(
          (p) => p.roleId === GlobalConstants.ADMIN_ROLE,
        )
      ) {
        newCredential.database = db;
        newCredential.creator = teamMemberRole;
        newCredential.connectionString = db.connectionString;
        newCredential.name = body.name;
        newCredential.purpose = body.purpose;
        newCredential.status = 'pending';
        newCredential.accessLevel = body.accessLevel;
        newCredential.expiration = new Date(body.expiration);
      } else if (
        req.user.permissions.some(
          (p) =>
            p.roleId === GlobalConstants.TEAM_LEAD_ROLE &&
            p.teamId === teamMemberRole.team.teamId,
        )
      ) {
        newCredential.database = db;
        newCredential.creator = teamMemberRole;
        newCredential.connectionString = db.connectionString;
        newCredential.name = body.name;
        newCredential.purpose = body.purpose;
        newCredential.status = 'pending';
        newCredential.accessLevel = body.accessLevel;
        newCredential.expiration = new Date(body.expiration);
      } else {
        const oldCredential = await this.dbCredentialRepository
          .createQueryBuilder('dc')
          .leftJoinAndSelect('dc.cluster', 'c')
          .leftJoinAndSelect('dc.creator', 'tmr')
          .leftJoinAndSelect('tmr.member', 'm')
          .leftJoinAndSelect('tmr.role', 'r')
          .leftJoinAndSelect('tmr.team', 't')
          .where('t.teamId = :teamId', { teamId: body.team_id })
          .andWhere('m.id = :member_id', { member_id: body.member_id })
          .andWhere('r.id = :role_id', { role_id: body.role_id })
          .andWhere('c.id = :cluster_id', { cluster_id: body.cluster_id })
          .getOne();
        if (oldCredential) {
          newCredential.database = oldCredential.database;
          newCredential.creator = oldCredential.creator;
          newCredential.connectionString = oldCredential.connectionString;
          newCredential.name = oldCredential.name;
          newCredential.purpose = oldCredential.purpose;
          newCredential.status = 'pending';
          newCredential.accessLevel = oldCredential.accessLevel;
          newCredential.expiration = new Date(oldCredential.expiration);
        } else {
          throw new UnauthorizedException(
            'No older credentials found. Ask TL/ADMIN to issue you credentials',
          );
        }
      }

      let username;
      if (body.username) {
        const member = await this.memberRepository
          .createQueryBuilder('m')
          .where('m.email LIKE :username', { username: `%${body.username}%` })
          .getOne();
        if (member) {
          throw new UnauthorizedException(
            'Specifying the username of a human user is not allowed.',
          );
        }
        username = `app_${
          body.username
        }_${newCredential.expiration?.getTime()}_${newCredential.accessLevel}`;
      } else {
        username = `usr_${
          newCredential.creator.member.email.match(/^([^@]*)@/)[1]
        }_${newCredential.expiration?.getTime()}_${newCredential.accessLevel}`;
      }
      const result = await this.dbCredentialRepository.save(newCredential);
      const password = uuidv4();

      // Don't provision if master credentials cannot be decrypted
      if (process.env.KEY) {
        if (result.database.platform === 'aurora-postgresql') {
          await this.provisionPostgresCredential(<ICredential>{
            host: result.connectionString,
            pass: password,
            user: username,
            db: result.database.name,
            access_level: result.accessLevel,
          });
        } else {
          throw new UnprocessableEntityException(
            `Unknown type of database: ${result.database.platform}`,
          );
        }
      }

      result.username = username;
      result.status = 'provisioned';
      await this.dbCredentialRepository.update(result.id, result);

      return {
        id: result.id,
        name: result.name,
        purpose: result.purpose,
        expiration: result.expiration,
        accessLevel: result.accessLevel,
        member_id: result.creator.member.id,
        team_id: result.creator.team.teamId,
        role_id: result.creator.role.id,
        database_id: result.database.id,
        connection_string: result.connectionString,
        password: password,
        username: username,
      };
    } catch (err) {
      this.logger.error(err);
      const errorString = JSON.stringify(err, Object.getOwnPropertyNames(err));
      throw new InternalServerErrorException(errorString);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async softDelete(@Request() req: any, @Param('id') id: string) {
    const dc = await this.dbCredentialRepository
      .createQueryBuilder('dc')
      .leftJoinAndSelect('dc.creator', 'tmr')
      .where('dc.id = :id', { id })
      .getOneOrFail();
    return this.dbCredentialRepository.softDelete(id);
  }

  async provisionPostgresCredential(credential: ICredential) {
    let connection: PostgresConnection;
    try {
      const key = this.configService.get<string>('KEY');
      const externalDatabases = decryptExternalDatabases(key);
      if (!(credential.host in externalDatabases)) {
        throw {
          message: 'We have no rights to provision credentials for this DB.',
        };
      }
      console.info('Attempting to connect to db');
      this.logger.log('Attempting to connect to db');
      connection = await createConnection({
        name: credential.host,
        type: 'postgres',
        host: credential.host,
        port: 5432,
        username: externalDatabases[credential.host].user,
        password: externalDatabases[credential.host].pass,
        database: 'postgres',
        entities: [],
        synchronize: false,
      });

      await this.reconnectIfNecessary(connection);

      const manager: EntityManager = connection.manager;
      console.info('Attempting to provision role');
      this.logger.log('Attempting to provision role');
      await manager.query(
        `
          DROP ROLE IF EXISTS ${credential.user}
        `,
      );
      await manager.query(
        `
          CREATE ROLE ${credential.user} LOGIN PASSWORD '${credential.pass}'
        `,
      );
      if (credential.access_level === 'rw') {
        await manager.query(
          `
          GRANT ALL PRIVILEGES ON DATABASE "${credential.db}" TO ${credential.user}
        `,
        );
        await manager.query(
          `
          GRANT xnd_readwrite TO ${credential.user}
        `,
        );
      } else if (credential.access_level === 'ro') {
        await manager.query(
          `
          GRANT CONNECT ON DATABASE "${credential.db}" TO ${credential.user}
        `,
        );
        await manager.query(
          `
          GRANT xnd_readonly TO ${credential.user}
        `,
        );
      }
    } catch (err) {
      console.dir(err);
      this.logger.log(err);
      const errorString = JSON.stringify(err, Object.getOwnPropertyNames(err));
      throw new InternalServerErrorException(errorString);
    } finally {
      console.info('Disconnecting from db');
      this.logger.log('Disconnecting from db');
      if (connection) {
        connection.close();
      }
    }
  }

  async reconnectIfNecessary(connection: PostgresConnection) {
    const driver = connection.driver as any;
    for (const client of driver.master._clients) {
      try {
        await client.query('SELECT 1');
      } catch (error) {
        console.info('Reconnecting ...');
        await connection.driver.disconnect();
        await connection.driver.connect();
        break;
      }
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('/recreate/:id')
  async recreate(@Request() req: any, @Param('id') id: string) {
    try {
      const base = await this.dbCredentialRepository
        .createQueryBuilder('dc')
        .leftJoinAndSelect('dc.database', 'd')
        .leftJoinAndSelect('dc.cluster', 'c')
        .leftJoinAndSelect('dc.creator', 'tmr')
        .leftJoinAndSelect('tmr.member', 'm')
        .leftJoinAndSelect('tmr.role', 'r')
        .leftJoinAndSelect('tmr.team', 't')
        .where('dc.id = :id', { id });
      let result;
      if (
        req.user.permissions.some(
          (p) => p.roleId === GlobalConstants.ADMIN_ROLE,
        )
      ) {
        result = await base.getOneOrFail();
      } else {
        result = await base
          .andWhere('m.email = :email', { email: req.user.username })
          .getOneOrFail();
      }
      const password = uuidv4();

      // Don't provision if master credentials cannot be decrypted
      if (process.env.KEY) {
        if (result.status === 'pending') {
          if (result.database.platform === 'aurora-postgresql') {
            this.provisionPostgresCredential(<ICredential>{
              host: result.connectionString,
              pass: password,
              user: result.username,
              db: result.database.name,
              access_level: result.accessLevel,
            });
          } else {
            throw new UnprocessableEntityException(
              `Unknown database type: ${result.database.platform}`,
            );
          }
        } else if (result.status === 'provisioned') {
          if (result.database.platform === 'aurora-postgresql') {
            await this.reProvisionPostgresCredential(<ICredential>{
              host: result.connectionString,
              pass: password,
              user: result.username,
              db: result.database.name,
              access_level: result.accessLevel,
            });
          } else {
            throw new UnprocessableEntityException(
              `Unknown database type: ${result.database.platform}`,
            );
          }
        } else {
          throw new UnprocessableEntityException(
            'The credential is neither provisioned nor pending provisioning',
          );
        }
      }

      return {
        id: result.id,
        name: result.name,
        purpose: result.purpose,
        expiration: result.expiration,
        accessLevel: result.accessLevel,
        member_id: result.creator.member.id,
        team_id: result.creator.team.teamId,
        role_id: result.creator.role.id,
        cluster_id: result.cluster.id,
        database_id: result.database.id,
        connection_string: result.cluster.connectionString,
        password: password,
        username: result.username,
      };
    } catch (err) {
      this.logger.error(err);
      const errorString = JSON.stringify(err, Object.getOwnPropertyNames(err));
      throw new InternalServerErrorException(errorString);
    }
  }

  async reProvisionPostgresCredential(credential: ICredential) {
    let connection: PostgresConnection;
    try {
      const key = this.configService.get<string>('KEY');
      const externalDatabases = decryptExternalDatabases(key);
      if (!(credential.host in externalDatabases)) {
        throw {
          message: 'We have no rights to provision credentials for this DB.',
        };
      }
      console.info('Attempting to connect to db');
      this.logger.log('Attempting to connect to db');
      connection = await createConnection({
        name: credential.host,
        type: 'postgres',
        host: credential.host,
        port: 5432,
        username: externalDatabases[credential.host].user,
        password: externalDatabases[credential.host].pass,
        database: 'postgres',
        entities: [],
        synchronize: false,
      });

      await this.reconnectIfNecessary(connection);

      const manager: EntityManager = connection.manager;
      console.info('Attempting to re-provision role');
      this.logger.log('Attempting to re-provision role');
      await manager.query(
        `ALTER USER "${credential.user}" WITH PASSWORD '${credential.pass}'`,
      );
    } catch (err) {
      console.dir(err);
      this.logger.log(err);
      const errorString = JSON.stringify(err, Object.getOwnPropertyNames(err));
      throw new InternalServerErrorException(errorString);
    } finally {
      console.info('Disconnecting from db');
      this.logger.log('Disconnecting from db');
      if (connection) {
        connection.close();
      }
    }
  }
}
