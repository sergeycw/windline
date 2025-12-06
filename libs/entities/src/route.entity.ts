import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { RoutePoint } from '@windline/gpx';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'bigint' })
  userId: number;

  @Column()
  name: string;

  @Index()
  @Column({ unique: true })
  hash: string;

  @Column({ type: 'int' })
  distance: number;

  @Column({ type: 'jsonb' })
  points: RoutePoint[];

  @CreateDateColumn()
  createdAt: Date;
}
