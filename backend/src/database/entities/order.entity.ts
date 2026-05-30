import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { WhatsappLog } from './whatsapp-log.entity';
import { OrderStatus, PaymentStatus, PaymentMode } from './enums';
import { OrderSource } from './order-source.entity';
import { InventoryLocation } from './inventory-location.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  orderNumber: string;

  @ManyToOne(() => OrderSource, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sourceId' })
  source: OrderSource | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentMode, nullable: true })
  paymentMode: PaymentMode | null;

  @Column({ type: 'text', nullable: true })
  cashCollectionDetails: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paymentUpdatedAt: Date | null;

  @ManyToOne(() => InventoryLocation, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fulfillmentHubId' })
  fulfillmentHub: InventoryLocation | null;

  @Column({ type: 'timestamp', nullable: true })
  expectedDeliveryDate: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deliveryLocation: string | null;

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
