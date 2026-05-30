import { Order } from './order.entity';
import { Gender } from './enums';
export declare class Customer {
    id: string;
    name: string;
    contact: string;
    gender: Gender;
    location: string;
    address: string | null;
    orders: Order[];
    createdAt: Date;
    updatedAt: Date;
}
