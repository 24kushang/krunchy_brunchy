import { Repository } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { Gender } from '../../database/entities/enums';
export declare class CustomersService {
    private readonly customerRepository;
    constructor(customerRepository: Repository<Customer>);
    findAll(query: {
        location?: string;
        gender?: string;
        search?: string;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
    }): Promise<any[]>;
    findOne(id: string): Promise<Customer>;
    lookup(contact: string): Promise<Customer[]>;
    create(data: {
        name: string;
        contact: string;
        gender: Gender;
        location: string;
    }): Promise<Customer>;
    update(id: string, data: Partial<Customer>): Promise<Customer>;
    remove(id: string): Promise<void>;
    getMetrics(): Promise<any>;
    generateCSV(customers: any[]): string;
}
