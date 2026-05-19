import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "../auth.service";

@Injectable() // تأكد من وجود هذا الديكوريتور
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password'
    });
    this.logger.log('--- [LocalStrategy Initialized] ---');
    this.logger.log(`Is authService defined? ${!!this.authService}`);
  }

  async validate(email: string, password: string) {
    this.logger.log('--- [LocalStrategy Validate Called] ---');
    
    if (!this.authService) {
      this.logger.error('CRITICAL: authService is UNDEFINED inside validate!');
      throw new Error('AuthService is undefined');
    }

    try {
      const user = await this.authService.validateLocalUser(email, password);
      this.logger.log('✅ Validation successful');
      return user;
    } catch (error) {
     const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Validation failed: ${errorMessage}`);
      throw new UnauthorizedException();
    }
  }
}