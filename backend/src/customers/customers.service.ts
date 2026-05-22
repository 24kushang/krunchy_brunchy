import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from './customer.entity';
import { Order } from '../orders/order.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly dataSource: DataSource,
  ) {}

  async getAllCustomers() {
    return this.customerRepository.find({ order: { id: 'DESC' } });
  }

  async searchCustomers(queryStr: string) {
    if (!queryStr) {
      return [];
    }
    const searchQuery = `%${queryStr}%`;
    return this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.contact ILIKE :query OR customer.name ILIKE :query', { query: searchQuery })
      .limit(8)
      .getMany();
  }

  async createCustomer(name: string, contact: string, gender: string, location: string) {
    const resolvedGender = gender || 'Prefer Not to Say';
    const customer = this.customerRepository.create({
      name,
      contact,
      gender: resolvedGender as any,
      location,
    });
    return this.customerRepository.save(customer);
  }

  async getAnalytics() {
    // 1. Gender distribution
    const genderRes = await this.customerRepository
      .createQueryBuilder('customer')
      .select("COALESCE(customer.gender, 'Not Specified')", 'label')
      .addSelect('COUNT(*)', 'value')
      .groupBy('customer.gender')
      .getRawMany();

    // 2. Location distribution
    const locationRes = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.location', 'label')
      .addSelect('COUNT(*)', 'value')
      .groupBy('customer.location')
      .orderBy('value', 'DESC')
      .getRawMany();

    // 3. Order source distribution
    const sourceRes = await this.dataSource
      .getRepository(Order)
      .createQueryBuilder('order')
      .select('order.source', 'label')
      .addSelect('COUNT(*)', 'value')
      .groupBy('order.source')
      .orderBy('value', 'DESC')
      .getRawMany();

    // 4. Top spending customers
    const topCustomersRes = await this.customerRepository
      .createQueryBuilder('c')
      .select('c.name', 'name')
      .addSelect('c.contact', 'contact')
      .addSelect('COUNT(o.id)', 'order_count')
      .addSelect('SUM(o.total_price)', 'total_spent')
      .innerJoin('c.orders', 'o')
      .where("o.status != 'Cancelled'")
      .groupBy('c.id')
      .addGroupBy('c.name')
      .addGroupBy('c.contact')
      .orderBy('total_spent', 'DESC')
      .limit(5)
      .getRawMany();

    // 5. Total customers counter
    const totalCustomers = await this.customerRepository.count();

    return {
      totalCustomers,
      genders: genderRes.map(item => ({
        label: item.label,
        value: parseInt(item.value, 10),
      })),
      locations: locationRes.map(item => ({
        label: item.label,
        value: parseInt(item.value, 10),
      })),
      sources: sourceRes.map(item => ({
        label: item.label,
        value: parseInt(item.value, 10),
      })),
      topCustomers: topCustomersRes.map(item => ({
        name: item.name,
        contact: item.contact,
        order_count: parseInt(item.order_count, 10),
        total_spent: parseFloat(item.total_spent) || 0,
      })),
    };
  }
}
