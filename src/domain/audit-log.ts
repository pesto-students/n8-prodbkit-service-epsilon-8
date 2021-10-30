import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TeamMemberRole } from './team-member-role';

@Index('audit_log_pkey', ['id'], { unique: true })
@Entity('audit_log', { schema: 'public' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('character varying', { name: 'action', nullable: true })
  action: string | null;

  @CreateDateColumn()
  created!: Date;

  @UpdateDateColumn()
  updated!: Date;

  @DeleteDateColumn()
  deleted?: Date;

  @ManyToOne(() => TeamMemberRole, (teamMemberRole) => teamMemberRole.auditLogs)
  @JoinColumn([{ name: 'actor_id', referencedColumnName: 'id' }])
  actor: TeamMemberRole;
}
