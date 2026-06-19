import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  // Get current logged-in user's profile
  @Get('me')
  async getProfile(@Req() req: any) {
    // TODO: Replace with req.user.id once your AuthGuard is set up
    const userId = req.user?.id || '1'; 
    return this.userService.findOne(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Get('email/:email')
  async findByEmail(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Patch(':id/profile')
  // @UseGuards(JwtAuthGuard) // Recommended: protect this route
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return await this.userService.updateProfile(id, updateProfileDto);
  }
}