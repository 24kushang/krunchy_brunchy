import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ItemPriceHistory } from './item-price-history.entity';
import { OrderItem } from './order-item.entity';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  name: string;

  @Column({ type: 'simple-array', nullable: true })
  ingredients: string[] | null;

  @Column({ type: 'integer' })
  bestBeforeDays: number;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;


  @OneToMany(() => ItemPriceHistory, (history) => history.item, { cascade: true })
  priceHistory: ItemPriceHistory[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.item)
  orderItems: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
