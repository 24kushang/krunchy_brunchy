import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ length: 100 })
  source: string;

  @Column({ type: 'timestamp', name: 'expected_delivery_date' })
  expectedDeliveryDate: Date;

  @Column({ type: 'text', name: 'expected_delivery_location' })
  expectedDeliveryLocation: string;

  @Column({ 
    type: 'enum', 
    enum: ['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled'],
    default: 'Pending'
  })
  status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';

  @Column({ 
    type: 'enum', 
    enum: ['Unpaid', 'Paid'],
    default: 'Unpaid',
    name: 'payment_status'
  })
  paymentStatus: 'Unpaid' | 'Paid';

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price', default: 0.00 })
  totalPrice: number;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Customer, (customer) => customer.orders)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items: OrderItem[];
}
