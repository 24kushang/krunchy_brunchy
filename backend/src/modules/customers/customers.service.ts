import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { Gender } from '../../database/entities/enums';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findAll(query: {
    location?: string;
    gender?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<any[]> {
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

    // Map customers with aggregates (LTV, order count)
    const result = customers.map(c => {
      const orderCount = c.orders ? c.orders.length : 0;
      const ltv = c.orders 
        ? c.orders.reduce((sum, order) => sum + parseFloat(order.totalAmount as any || 0), 0)
        : 0;

      return {
        id: c.id,
        name: c.name,
        contact: c.contact,
        gender: c.gender,
        location: c.location,
        address: c.address,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        orderCount,
        ltv: Math.round(ltv * 100) / 100,
      };
    });

    // Handle manual sort on computed fields (e.g. LTV, orderCount) or model columns
    const sortBy = query.sortBy || 'name';
    const sortOrder = query.sortOrder || 'ASC';
    
    result.sort((a, b) => {
      let valA = (a as any)[sortBy];
      let valB = (b as any)[sortBy];
      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });

    return result;
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: { orders: true },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async lookup(contact: string): Promise<Customer[]> {
    return this.customerRepository.find({
      where: { contact: Like(`%${contact}%`) },
      take: 10,
    });
  }

  async create(data: { name: string; contact: string; gender: Gender; location: string; address?: string }): Promise<Customer> {
    const existing = await this.customerRepository.findOne({ where: { contact: data.contact } });
    if (existing) {
      throw new ConflictException(`Customer contact ${data.contact} already exists`);
    }

    const customer = this.customerRepository.create(data);
    return this.customerRepository.save(customer);
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const customer = await this.findOne(id);
    
    if (data.contact && data.contact !== customer.contact) {
      const existing = await this.customerRepository.findOne({ where: { contact: data.contact } });
      if (existing) {
        throw new ConflictException(`Customer contact ${data.contact} already exists`);
      }
    }

    Object.assign(customer, data);
    return this.customerRepository.save(customer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);
  }

  async getMetrics(): Promise<any> {
    const customers = await this.customerRepository.find({ relations: { orders: true } });

    // 1. Regional Hubs
    const regions: Record<string, { count: number; totalSales: number }> = {};
    // 2. Gender distribution
    const genders: Record<string, number> = { Male: 0, Female: 0, Other: 0 };
    // 3. Purchase frequencies
    const purchaseFreq: Record<string, number> = { '0 Orders': 0, '1-2 Orders': 0, '3-5 Orders': 0, '6+ Orders': 0 };
    // 4. LTV stats
    let totalLTV = 0;
    let maxLTV = 0;

    for (const c of customers) {
      const orderCount = c.orders ? c.orders.length : 0;
      const ltv = c.orders 
        ? c.orders.reduce((sum, order) => sum + parseFloat(order.totalAmount as any || 0), 0)
        : 0;

      totalLTV += ltv;
      if (ltv > maxLTV) maxLTV = ltv;

      // Region count
      if (!regions[c.location]) {
        regions[c.location] = { count: 0, totalSales: 0 };
      }
      regions[c.location].count += 1;
      regions[c.location].totalSales += ltv;

      // Gender count
      if (genders[c.gender] !== undefined) {
        genders[c.gender] += 1;
      } else {
        genders[c.gender] = 1;
      }

      // Purchase frequency distribution
      if (orderCount === 0) {
        purchaseFreq['0 Orders'] += 1;
      } else if (orderCount <= 2) {
        purchaseFreq['1-2 Orders'] += 1;
      } else if (orderCount <= 5) {
        purchaseFreq['3-5 Orders'] += 1;
      } else {
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

  generateCSV(customers: any[]): string {
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
}
