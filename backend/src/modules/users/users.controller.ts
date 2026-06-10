import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../database/entities/enums';
import { Public } from '../auth/public.decorator';

@Controller('api/users')
@Roles(UserRole.SUPER_ADMIN) // Only SuperAdmins can interact with the users endpoints
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Roles()
  @Post('init')
  async init(
    @Headers('x-api-key') apiKey: string,
    @Body() userData: Partial<User>,
  ) {
    const expectedKey = process.env.ADMIN_SETUP_KEY || 'krunchy_brunchy_setup_key_2026';
    if (!apiKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }
    return this.usersService.create(userData);
  }

  @Post()
  create(@Body() userData: Partial<User>) {
    return this.usersService.create(userData);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserData: Partial<User>) {
    return this.usersService.update(id, updateUserData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
