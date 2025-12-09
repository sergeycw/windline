import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from './route.entity';

export type ForecastStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ForecastSummary {
  temperatureMin: number;
  temperatureMax: number;
  windSpeedMin: number;
  windSpeedMax: number;
  windGustsMax: number;
  precipitationProbabilityMax: number;
  precipitationTotal: number;
}

export interface WindImpactData {
  headwind: number;
  tailwind: number;
  crosswind: number;
  distribution: {
    headwindPercent: number;
    tailwindPercent: number;
    crosswindPercent: number;
  };
}

@Entity('forecast_requests')
export class ForecastRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Route, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string;

  @Index()
  @Column({ type: 'bigint' })
  userId: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  requestHash: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'smallint' })
  startHour: number;

  @Column({ type: 'smallint' })
  durationHours: number;

  @Column({ type: 'real', nullable: true })
  estimatedTimeHours: number | null;

  @Column({ type: 'int', nullable: true })
  elevationGain: number | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status: ForecastStatus;

  @Column({ type: 'jsonb', nullable: true })
  summary: ForecastSummary | null;

  @Column({ type: 'jsonb', nullable: true })
  windImpact: WindImpactData | null;

  @Column({ type: 'timestamp', nullable: true })
  fetchedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'bytea', nullable: true })
  imageBuffer: Buffer | null;

  @Column({ type: 'timestamp', nullable: true })
  imageRenderedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
