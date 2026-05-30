import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderSource } from '../../database/entities/order-source.entity';
import { OrderSourcesService } from './order-sources.service';
import { OrderSourcesController } from './order-sources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrderSource])],
  controllers: [OrderSourcesController],
  providers: [OrderSourcesService],
  exports: [OrderSourcesService],
})
export class OrderSourcesModule {}
