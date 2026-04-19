import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserInterestService } from './user-interest.service';
import { CreateUserInterestDto } from './dto/create-user-interest.dto';
import { UpdateUserInterestDto } from './dto/update-user-interest.dto';

@Controller('user-interest')
export class UserInterestController {
  constructor(private readonly userInterestService: UserInterestService) {}

  @Post()
  create(@Body() createUserInterestDto: CreateUserInterestDto) {
    return this.userInterestService.create(createUserInterestDto);
  }

  @Get()
  findAll() {
    return this.userInterestService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userInterestService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserInterestDto: UpdateUserInterestDto) {
    return this.userInterestService.update(id, updateUserInterestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userInterestService.remove(id);
  }
}
