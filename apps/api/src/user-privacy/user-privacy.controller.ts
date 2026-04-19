import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserPrivacyService } from './user-privacy.service';
import { CreateUserPrivacyDto } from './dto/create-user-privacy.dto';
import { UpdateUserPrivacyDto } from './dto/update-user-privacy.dto';

@Controller('user-privacy')
export class UserPrivacyController {
  constructor(private readonly userPrivacyService: UserPrivacyService) {}

  @Post()
  create(@Body() createUserPrivacyDto: CreateUserPrivacyDto) {
    return this.userPrivacyService.create(createUserPrivacyDto);
  }

  @Get()
  findAll() {
    return this.userPrivacyService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userPrivacyService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserPrivacyDto: UpdateUserPrivacyDto) {
    return this.userPrivacyService.update(id, updateUserPrivacyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userPrivacyService.remove(id);
  }
}
