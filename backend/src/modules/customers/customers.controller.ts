import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Header,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomersService } from './customers.service';
import { Gender } from '../../database/entities/enums';

@Controller('api/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(
    @Query('location') location?: string,
    @Query('gender') gender?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.customersService.findAll({
      location,
      gender,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('lookup')
  async lookup(@Query('contact') contact: string) {
    return this.customersService.lookup(contact || '');
  }

  @Get('metrics')
  async getMetrics() {
    return this.customersService.getMetrics();
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  async export(
    @Res() res: any,
    @Query('location') location?: string,
    @Query('gender') gender?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.customersService.findAll({
      location,
      gender,
      search,
    });
    const csv = this.customersService.generateCSV(data);
    res.attachment('customers_directory.csv');
    return res.status(200).send(csv);
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      contact: string;
      gender: Gender;
      location: string;
      address?: string;
    },
  ) {
    return this.customersService.create(body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      contact?: string;
      gender?: Gender;
      location?: string;
      address?: string;
    },
  ) {
    return this.customersService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.customersService.remove(id);
    return { success: true };
  }
}
