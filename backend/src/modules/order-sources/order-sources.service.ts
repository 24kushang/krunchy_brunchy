import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderSource } from '../../database/entities/order-source.entity';

@Injectable()
export class OrderSourcesService {
  constructor(
    @InjectRepository(OrderSource)
    private readonly orderSourceRepo: Repository<OrderSource>,
  ) {}

  async findAll(): Promise<OrderSource[]> {
    return this.orderSourceRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<OrderSource> {
    const source = await this.orderSourceRepo.findOne({ where: { id } });
    if (!source) {
      throw new NotFoundException(`Order source with ID ${id} not found`);
    }
    return source;
  }

  async create(name: string): Promise<OrderSource> {
    if (!name || !name.trim()) {
      throw new BadRequestException('Name is required');
    }
    const trimmed = name.trim();
    const existing = await this.orderSourceRepo.findOne({ where: { name: trimmed } });
    if (existing) {
      throw new BadRequestException(`Order source with name "${trimmed}" already exists`);
    }
    const source = new OrderSource();
    source.name = trimmed;
    return this.orderSourceRepo.save(source);
  }

  async update(id: string, name: string): Promise<OrderSource> {
    if (!name || !name.trim()) {
      throw new BadRequestException('Name is required');
    }
    const trimmed = name.trim();
    const source = await this.findOne(id);
    
    // Check if name is taken by another source
    const existing = await this.orderSourceRepo.findOne({ where: { name: trimmed } });
    if (existing && existing.id !== id) {
      throw new BadRequestException(`Order source with name "${trimmed}" already exists`);
    }
    
    source.name = trimmed;
    return this.orderSourceRepo.save(source);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const source = await this.findOne(id);
    await this.orderSourceRepo.remove(source);
    return { success: true };
  }
}
