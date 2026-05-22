import { Controller, Get, Post, Query, Body, HttpException, HttpStatus } from '@nestjs/common';
import { CustomersService } from './customers.service';

@Controller('api/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async getCustomers() {
    try {
      return await this.customersService.getAllCustomers();
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('search')
  async searchCustomers(@Query('q') q: string) {
    try {
      return await this.customersService.searchCustomers(q);
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics')
  async getAnalytics() {
    try {
      return await this.customersService.getAnalytics();
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async createCustomer(@Body() body: { name: string; contact: string; gender: string; location: string }) {
    const { name, contact, gender, location } = body;
    if (!name || !contact || !location) {
      throw new HttpException('Name, contact, and location are required', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.customersService.createCustomer(name, contact, gender, location);
    } catch (err: any) {
      if (err.code === '23505') {
        throw new HttpException('A customer with this contact number already exists', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
