import { Controller, Get, Post, Put, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { OrdersService, CreateOrderDto } from './orders.service';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async getOrders() {
    try {
      return await this.ordersService.getAllOrders();
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async createOrder(@Body() body: CreateOrderDto) {
    try {
      return await this.ordersService.createOrder(body);
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    try {
      return await this.ordersService.updateOrderStatus(parseInt(id, 10), body.status);
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/payment')
  async updatePayment(@Param('id') id: string, @Body() body: { payment_status: string }) {
    try {
      return await this.ordersService.updateOrderPaymentStatus(parseInt(id, 10), body.payment_status);
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
