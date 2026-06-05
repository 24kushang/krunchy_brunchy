import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus, Gender, PaymentStatus, PaymentMode } from '../../database/entities/enums';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.ordersService.findAll({
      page,
      limit,
      status,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });
  }

  @Get('metrics/revenue')
  async getRevenueMetrics() {
    return this.ordersService.getRevenueMetrics();
  }

  @Post('import')
  async importOrders(@Body() body: { csvText: string }) {
    return this.ordersService.importOrders(body.csvText);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post()
  async create(
    @Body() body: {
      customerContact: string;
      customerName?: string;
      customerGender?: Gender;
      customerLocation?: string;
      customerAddress?: string;
      sourceId?: string;
      fulfillmentHubId?: string;
      expectedDeliveryDate?: string | Date;
      deliveryLocation?: string;
      status?: OrderStatus;
      items: { itemId: string; quantity: number; priceAtOrder?: number }[];
      createdAt?: string;
      paymentStatus?: PaymentStatus;
      paymentMode?: PaymentMode;
      cashCollectionDetails?: string;
      totalAmount?: number;
    },
  ) {
    return this.ordersService.create(body);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus; changedBy?: string },
  ) {
    const changedBy = body.changedBy || 'Admin';
    return this.ordersService.updateStatus(id, body.status, changedBy);
  }

  @Patch(':id/payment')
  async updatePayment(
    @Param('id') id: string,
    @Body() body: { paymentStatus: PaymentStatus; paymentMode?: PaymentMode; cashDetails?: string },
  ) {
    return this.ordersService.updatePayment(
      id,
      body.paymentStatus,
      body.paymentMode,
      body.cashDetails,
    );
  }
}
