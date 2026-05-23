import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { WhatsappLog } from './whatsapp-log.entity';
import { OrderStatus, OrderSource } from './enums';


@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  orderNumber: string;

  @Column({ type: 'enum', enum: OrderSource, default: OrderSource.PHONE })
  source: OrderSource;

  @Column({ type: 'timestamp', nullable: true })
  expectedDeliveryDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deliveryLocation: string;

  @ManyToOne(() => Customer, (customer) => customer.orders, { eager: true, onDelete: 'CASCADE' })
  customer: Customer;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value),
  }})
  totalAmount: number;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (history) => history.order, { cascade: true })
  statusHistory: OrderStatusHistory[];

  @OneToMany(() => WhatsappLog, (log) => log.order)
  whatsappLogs: WhatsappLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
