import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('whatsapp_logs')
export class WhatsAppLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  recipient: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ 
    name: 'template_type', 
    type: 'varchar', 
    length: 50 
  })
  templateType: 'OrderReceived' | 'OrderReady' | 'PaymentSuccess' | 'Promotion';

  @Column({ 
    type: 'varchar', 
    length: 50, 
    default: 'Sent' 
  })
  status: 'Sent' | 'Failed' | 'Pending';

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;
}
