import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Order } from '../orders/order.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, unique: true })
  contact: string;

  @Column({ 
    type: 'varchar', 
    length: 20, 
    nullable: true,
    default: 'Prefer Not to Say'
  })
  gender: 'Male' | 'Female' | 'Other' | 'Prefer Not to Say';

  @Column({ length: 255 })
  location: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];
}
