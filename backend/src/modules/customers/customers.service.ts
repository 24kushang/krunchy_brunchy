import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, IsNull } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { Gender } from '../../database/entities/enums';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    location?: string;
    gender?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ data: any[]; total: number }> {
    const hasPagination = query.page !== undefined || query.limit !== undefined;
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    // 1. Build Count Query
    const qbCount = this.customerRepository.createQueryBuilder('customer');

    if (query.location) {
      qbCount.andWhere('customer.location = :location', {
        location: query.location,
      });
    }

    if (query.gender) {
      qbCount.andWhere('customer.gender = :gender', { gender: query.gender });
    }

    if (query.search) {
      qbCount.andWhere(
        '(customer.name ILIKE :search OR customer.contact ILIKE :search)',
        {
          search: `%${query.search}%`,
        },
      );
    }

    const total = await qbCount.getCount();

    // 2. Build Data Query
    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .leftJoin('customer.orders', 'order')
      .select([
        'customer.id AS id',
        'customer.name AS name',
        'customer.contact AS contact',
        'customer.gender AS gender',
        'customer.location AS location',
        'customer.address AS address',
        'customer.createdAt AS "createdAt"',
        'customer.updatedAt AS "updatedAt"',
        'COUNT(order.id)::int AS "orderCount"',
        'COALESCE(SUM(order.totalAmount), 0)::float AS ltv',
      ]);

    if (query.location) {
      qb.andWhere('customer.location = :location', {
        location: query.location,
      });
    }

    if (query.gender) {
      qb.andWhere('customer.gender = :gender', { gender: query.gender });
    }

    if (query.search) {
      qb.andWhere(
        '(customer.name ILIKE :search OR customer.contact ILIKE :search)',
        {
          search: `%${query.search}%`,
        },
      );
    }

    qb.groupBy('customer.id')
      .addGroupBy('customer.name')
      .addGroupBy('customer.contact')
      .addGroupBy('customer.gender')
      .addGroupBy('customer.location')
      .addGroupBy('customer.address')
      .addGroupBy('customer.createdAt')
      .addGroupBy('customer.updatedAt');

    const sortBy = query.sortBy || 'name';
    const sortOrder = query.sortOrder || 'ASC';

    if (sortBy === 'orderCount') {
      qb.orderBy('"orderCount"', sortOrder);
    } else if (sortBy === 'ltv') {
      qb.orderBy('ltv', sortOrder);
    } else {
      qb.orderBy(`customer.${sortBy}`, sortOrder);
    }

    if (hasPagination) {
      qb.offset(skip).limit(limit);
    }

    const data = await qb.getRawMany();

    // Map LTV to rounded decimal
    const resultData = data.map((item) => ({
      ...item,
      ltv: Math.round(item.ltv * 100) / 100,
    }));

    return { data: resultData, total };
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

  async create(data: {
    name: string;
    contact?: string;
    noContact?: boolean;
    gender: Gender;
    location: string;
    address?: string;
  }): Promise<Customer> {
    const contact = data.contact?.trim() || null;

    if (!contact && !data.noContact) {
      throw new ConflictException(
        'Contact number is required. Mark "Phone number not available" to create this customer without one.',
      );
    }

    if (contact) {
      const existing = await this.customerRepository.findOne({
        where: { contact },
      });
      if (existing) {
        throw new ConflictException(
          `Customer contact ${contact} already exists`,
        );
      }
    } else {
      const existing = await this.customerRepository.findOne({
        where: { contact: IsNull(), name: ILike(data.name.trim()) },
      });
      if (existing) {
        throw new ConflictException(
          `A customer named "${data.name}" without a phone number already exists. Use that record, or add a phone number to disambiguate.`,
        );
      }
    }

    const customer = this.customerRepository.create({
      name: data.name,
      contact,
      gender: data.gender,
      location: data.location,
      address: data.address,
    });
    return this.customerRepository.save(customer);
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    const customer = await this.findOne(id);

    if (data.contact !== undefined) {
      const nextContact = data.contact?.trim() || null;
      if (nextContact && nextContact !== customer.contact) {
        const existing = await this.customerRepository.findOne({
          where: { contact: nextContact },
        });
        if (existing) {
          throw new ConflictException(
            `Customer contact ${nextContact} already exists`,
          );
        }
      }
      data.contact = nextContact;
    }

    Object.assign(customer, data);
    return this.customerRepository.save(customer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);
  }

  async getMetrics(): Promise<any> {
    const customers = await this.customerRepository.find({
      relations: { orders: true },
    });

    // 1. Regional Hubs
    const regions: Record<string, { count: number; totalSales: number }> = {};
    // 2. Gender distribution
    const genders: Record<string, number> = { Male: 0, Female: 0, Other: 0 };
    // 3. Purchase frequencies
    const purchaseFreq: Record<string, number> = {
      '0 Orders': 0,
      '1-2 Orders': 0,
      '3-5 Orders': 0,
      '6+ Orders': 0,
    };
    // 4. LTV stats
    let totalLTV = 0;
    let maxLTV = 0;

    for (const c of customers) {
      const orderCount = c.orders ? c.orders.length : 0;
      const ltv = c.orders
        ? c.orders.reduce(
            (sum, order) => sum + parseFloat((order.totalAmount as any) || 0),
            0,
          )
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

    const regionalHubs = Object.keys(regions).map((loc) => ({
      location: loc,
      customerCount: regions[loc].count,
      totalSales: Math.round(regions[loc].totalSales * 100) / 100,
    }));

    const genderDistribution = Object.keys(genders).map((g) => ({
      gender: g,
      count: genders[g],
    }));

    const purchaseFrequency = Object.keys(purchaseFreq).map((f) => ({
      frequency: f,
      count: purchaseFreq[f],
    }));

    return {
      totalCustomers: customers.length,
      averageLTV: customers.length
        ? Math.round((totalLTV / customers.length) * 100) / 100
        : 0,
      maxLTV: Math.round(maxLTV * 100) / 100,
      regionalHubs,
      genderDistribution,
      purchaseFrequency,
    };
  }

  generateCSV(customers: any[]): string {
    const headers = [
      'Name',
      'Contact',
      'Gender',
      'Location',
      'Order Count',
      'Lifetime Value (Rs.)',
      'Created At',
    ];
    const rows = customers.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.contact || ''}"`,
      c.gender,
      `"${c.location}"`,
      c.orderCount,
      c.ltv,
      c.createdAt.toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
