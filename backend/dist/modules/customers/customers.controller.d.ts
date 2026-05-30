import { CustomersService } from './customers.service';
import { Gender } from '../../database/entities/enums';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    findAll(location?: string, gender?: string, search?: string, sortBy?: string, sortOrder?: 'ASC' | 'DESC'): Promise<any[]>;
    lookup(contact: string): Promise<import("../../database/entities/customer.entity").Customer[]>;
    getMetrics(): Promise<any>;
    export(res: any, location?: string, gender?: string, search?: string): Promise<any>;
    create(body: {
        name: string;
        contact: string;
        gender: Gender;
        location: string;
        address?: string;
    }): Promise<import("../../database/entities/customer.entity").Customer>;
    update(id: string, body: {
        name?: string;
        contact?: string;
        gender?: Gender;
        location?: string;
        address?: string;
    }): Promise<import("../../database/entities/customer.entity").Customer>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
