import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { WhatsappLogStatus } from './enums';

@Entity('whatsapp_logs')
export class WhatsappLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.whatsappLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  order: Order;

  @Column({ type: 'varchar', length: 150 })
  recipientName: string;

  @Column({ type: 'varchar', length: 50 })
  recipientContact: string;

  @Column({ type: 'varchar', length: 100 })
  triggeringEvent: string;

  @Column({ type: 'enum', enum: WhatsappLogStatus })
  status: WhatsappLogStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  timestamp: Date;
}
