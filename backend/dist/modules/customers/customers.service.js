"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("../../database/entities/customer.entity");
let CustomersService = class CustomersService {
    customerRepository;
    constructor(customerRepository) {
        this.customerRepository = customerRepository;
    }
    async findAll(query) {
        const qb = this.customerRepository.createQueryBuilder('customer')
            .leftJoinAndSelect('customer.orders', 'order');
        if (query.location) {
            qb.andWhere('customer.location = :location', { location: query.location });
        }
        if (query.gender) {
            qb.andWhere('customer.gender = :gender', { gender: query.gender });
        }
        if (query.search) {
            qb.andWhere('(customer.name ILIKE :search OR customer.contact ILIKE :search)', {
                search: `%${query.search}%`,
            });
        }
        const customers = await qb.getMany();
        const result = customers.map(c => {
            const orderCount = c.orders ? c.orders.length : 0;
            const ltv = c.orders
                ? c.orders.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0)
                : 0;
            return {
                id: c.id,
                name: c.name,
                contact: c.contact,
                gender: c.gender,
                location: c.location,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                orderCount,
                ltv: Math.round(ltv * 100) / 100,
            };
        });
        const sortBy = query.sortBy || 'name';
        const sortOrder = query.sortOrder || 'ASC';
        result.sort((a, b) => {
            let valA = a[sortBy];
            let valB = b[sortBy];
            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }
            if (valA < valB)
                return sortOrder === 'ASC' ? -1 : 1;
            if (valA > valB)
                return sortOrder === 'ASC' ? 1 : -1;
            return 0;
        });
        return result;
    }
    async findOne(id) {
        const customer = await this.customerRepository.findOne({
            where: { id },
            relations: { orders: true },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        return customer;
    }
    async lookup(contact) {
        return this.customerRepository.find({
            where: { contact: (0, typeorm_2.Like)(`%${contact}%`) },
            take: 10,
        });
    }
    async create(data) {
        const existing = await this.customerRepository.findOne({ where: { contact: data.contact } });
        if (existing) {
            throw new common_1.ConflictException(`Customer contact ${data.contact} already exists`);
        }
        const customer = this.customerRepository.create(data);
        return this.customerRepository.save(customer);
    }
    async update(id, data) {
        const customer = await this.findOne(id);
        if (data.contact && data.contact !== customer.contact) {
            const existing = await this.customerRepository.findOne({ where: { contact: data.contact } });
            if (existing) {
                throw new common_1.ConflictException(`Customer contact ${data.contact} already exists`);
            }
        }
        Object.assign(customer, data);
        return this.customerRepository.save(customer);
    }
    async remove(id) {
        const customer = await this.findOne(id);
        await this.customerRepository.remove(customer);
    }
    async getMetrics() {
        const customers = await this.customerRepository.find({ relations: { orders: true } });
        const regions = {};
        const genders = { Male: 0, Female: 0, Other: 0 };
        const purchaseFreq = { '0 Orders': 0, '1-2 Orders': 0, '3-5 Orders': 0, '6+ Orders': 0 };
        let totalLTV = 0;
        let maxLTV = 0;
        for (const c of customers) {
            const orderCount = c.orders ? c.orders.length : 0;
            const ltv = c.orders
                ? c.orders.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0)
                : 0;
            totalLTV += ltv;
            if (ltv > maxLTV)
                maxLTV = ltv;
            if (!regions[c.location]) {
                regions[c.location] = { count: 0, totalSales: 0 };
            }
            regions[c.location].count += 1;
            regions[c.location].totalSales += ltv;
            if (genders[c.gender] !== undefined) {
                genders[c.gender] += 1;
            }
            else {
                genders[c.gender] = 1;
            }
            if (orderCount === 0) {
                purchaseFreq['0 Orders'] += 1;
            }
            else if (orderCount <= 2) {
                purchaseFreq['1-2 Orders'] += 1;
            }
            else if (orderCount <= 5) {
                purchaseFreq['3-5 Orders'] += 1;
            }
            else {
                purchaseFreq['6+ Orders'] += 1;
            }
        }
        const regionalHubs = Object.keys(regions).map(loc => ({
            location: loc,
            customerCount: regions[loc].count,
            totalSales: Math.round(regions[loc].totalSales * 100) / 100,
        }));
        const genderDistribution = Object.keys(genders).map(g => ({
            gender: g,
            count: genders[g],
        }));
        const purchaseFrequency = Object.keys(purchaseFreq).map(f => ({
            frequency: f,
            count: purchaseFreq[f],
        }));
        return {
            totalCustomers: customers.length,
            averageLTV: customers.length ? Math.round((totalLTV / customers.length) * 100) / 100 : 0,
            maxLTV: Math.round(maxLTV * 100) / 100,
            regionalHubs,
            genderDistribution,
            purchaseFrequency,
        };
    }
    generateCSV(customers) {
        const headers = ['Name', 'Contact', 'Gender', 'Location', 'Order Count', 'Lifetime Value (Rs.)', 'Created At'];
        const rows = customers.map(c => [
            `"${c.name.replace(/"/g, '""')}"`,
            `"${c.contact}"`,
            c.gender,
            `"${c.location}"`,
            c.orderCount,
            c.ltv,
            c.createdAt.toISOString(),
        ]);
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CustomersService);
//# sourceMappingURL=customers.service.js.map