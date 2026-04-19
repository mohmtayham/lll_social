import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Request,
  Res,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LocalAuthGuard } from './guards/local-auth/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth/refresh-auth.guard';
// import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';
import { Response } from 'express';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles/roles.guard';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
@Public()
@Post('signup')
async registerUser(@Body() createUserDto: CreateUserDto) {
  console.log('--- [Controller Reached] ---');
  console.log('Body received:', JSON.stringify(createUserDto, null, 2));
  
  try {
    const result = await this.authService.registerUser(createUserDto);
    console.log('✅ Registration Successful in DB');
    return result;
  } catch (error) {
    console.error('❌ Service Layer Error:', error.message);
    throw error;
  }
}
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('signin')
  login(@Request() req) {
    return this.authService.login(req.user.id, req.user.name, req.user.role);
  }

  @Roles(Role.ADMIN, Role.EDITOR)
  @Get('protected')
  getAll(@Request() req) {
    return {
      messege: `Now you can access this protected API. this is your user ID: ${req.user.id}`,
    };
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user.id, req.user.name);
  }

  // @Public()
  // @UseGuards(GoogleAuthGuard)
  // @Get('google/login')
  // googleLogin() {}

  // @Public()
  // @UseGuards(GoogleAuthGuard)
  // @Get('google/callback')
  // async googleCallback(@Request() req, @Res() res: Response) {
  //   // console.log('Google User', req.user);
  //   const resopnse = await this.authService.login(
  //     req.user.id,
  //     req.user.name,
  //     req.user.role,
  //   );
  //   res.redirect(
  //     `http://localhost:3000/api/auth/google/callback?userId=${resopnse.id}&name=${resopnse.name}&accessToken=${resopnse.accessToken}&refreshToken=${resopnse.refreshToken}&role=${resopnse.role}`,
  //   );
  // }

 @Post('signout')
async signOut(@Req() req) {
  // الـ Guard يفك التوكن ويضع البيانات هنا
  const userId = req.user.id; 
  
  console.log("--- [Backend: SignOut Received] ---");
  console.log("🔍 Revoking session for User ID:", userId);

  // مرر الـ userId فقط وليس التوكن
  return await this.authService.revokeToken(userId);
}
// async signOut(@Req() req) {
//   const token = req.headers.authorization;
//   console.log("--- [Backend: SignOut Received] ---");
//   console.log("🔍 Token received for revocation:", token ? "Exists" : "Missing");

//   try {
//     // منطق إبطال التوكن في قاعدة البيانات
//     const result = await this.authService.revokeToken(token);
    
//     console.log("✅ Token successfully revoked in DB:", result);
//     return { message: "Signed out" };
//   } catch (err) {
//     console.error("❌ Failed to revoke token:", err);
//     throw err;
//   }
}
