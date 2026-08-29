import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  OrderStatus,
  Gender,
  PaymentStatus,
  PaymentMode,
  UserRole,
} from '../../database/entities/enums';
import { Roles } from '../auth/roles.decorator';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(UserRole.SUPER_ADMIN)
  @Get('reconciliation')
  async getReconciliationReport() {
    return this.ordersService.getReconciliationReport();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('reconciliation/cleanup-orphaned')
  async cleanupOrphanedItems() {
    return this.ordersService.cleanupOrphanedItems();
  }

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
    @Query('kanban') kanban?: boolean,
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
      kanban,
    });
  }

  @Get('metrics/revenue')
  async getRevenueMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: 'daily' | 'monthly' | 'quarterly' | 'yearly',
    @Query('paymentMode') paymentMode?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.ordersService.getRevenueMetrics({
      startDate,
      endDate,
      type,
      paymentMode: paymentMode && paymentMode !== 'ALL' ? paymentMode as PaymentMode : undefined,
      paymentStatus: paymentStatus && paymentStatus !== 'ALL' ? paymentStatus as PaymentStatus : undefined,
    });
  }

  @Get('metrics/revenue/details')
  async getRevenueDetails(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentMode') paymentMode?: PaymentMode,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
  ) {
    return this.ordersService.getRevenueDetails({
      page,
      limit,
      startDate,
      endDate,
      paymentMode,
      paymentStatus,
    });
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
    @Body()
    body: {
      customerContact?: string;
      noContact?: boolean;
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

  @Put(':id')
  async updateFullOrder(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.ordersService.updateFullOrder(id, body);
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
    @Body()
    body: {
      paymentStatus: PaymentStatus;
      paymentMode?: PaymentMode;
      cashDetails?: string;
    },
  ) {
    return this.ordersService.updatePayment(
      id,
      body.paymentStatus,
      body.paymentMode,
      body.cashDetails,
    );
  }

  @Post(':id/whatsapp-url')
  async getWhatsappUrl(
    @Param('id') id: string,
    @Body() body?: { status?: OrderStatus },
  ) {
    return this.ordersService.getWhatsappUrl(id, body?.status);
  }
}
