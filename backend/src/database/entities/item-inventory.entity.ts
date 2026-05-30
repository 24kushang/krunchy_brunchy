import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Item } from './item.entity';
import { InventoryLocation } from './inventory-location.entity';

@Entity('item_inventories')
@Unique(['item', 'location'])
export class ItemInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Item, { onDelete: 'CASCADE', eager: true })
  item: Item;

  @ManyToOne(() => InventoryLocation, { onDelete: 'CASCADE', eager: true })
  location: InventoryLocation;

  @Column({ type: 'integer', default: 0 })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
