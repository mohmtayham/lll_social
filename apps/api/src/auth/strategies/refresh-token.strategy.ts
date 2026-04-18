// استيرادات ضرورية
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // 1. استيراد ConfigService
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import type { AuthJwtPayload } from '../types/auth-jwtPayload';

@Injectable()
// اسم الاستراتيجية 'refresh-jwt' صحيح ومهم للتمييز
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh-jwt') {
  constructor(
    // 2. حقن ConfigService و AuthService
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    // 3. جلب المفتاح السري من متغيرات البيئة
    const secret =
      configService.get<string>('REFRESH_JWT_SECRET') ??
      configService.get<string>('REFRESH_SECRET');

    // 4. التحقق من وجود المفتاح السري ورمي خطأ إذا لم يكن موجوداً
    if (!secret) {
      throw new Error('REFRESH_JWT_SECRET or REFRESH_SECRET is not defined in the environment variables');
    }

    // 5. استدعاء super() مع الإعدادات الصحيحة
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh'),
      secretOrKey: secret, // الآن القيمة هي string بالتأكيد
      ignoreExpiration: false,
      passReqToCallback: true, // هذا الخيار يسمح بتمرير كائن Request إلى دالة validate
    });
  }

  // دالة validate الآن تتلقى كائن Request كأول وسيط
  validate(req: Request, payload: AuthJwtPayload) {
    const userId = payload.sub;
    const refreshToken = req.body.refresh;

    // التحقق من أن الـ refreshToken موجود في الطلب
    if (!refreshToken) {
      // يمكنك رمي خطأ هنا إذا كان ضرورياً
      // throw new UnauthorizedException('Refresh token not found');
    }

    // استدعاء الخدمة للتحقق من صلاحية الـ Refresh Token
    return this.authService.validateRefreshToken(userId, refreshToken);
  }
}
