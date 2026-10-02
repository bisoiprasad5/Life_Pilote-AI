import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserService } from '../../users/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token missing or session expired');
    }

    try {
      const secret =
        this.configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key_lifepilot_2026';
      const payload = await this.jwtService.verifyAsync(token, { secret });

      // Verify user still exists in database
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User account no longer exists');
      }

      // Attach sanitized user to request
      request.user = this.userService.sanitizeUser(user);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication session');
    }
  }

  private extractTokenFromRequest(request: any): string | null {
    // 1. HTTP-Only cookie priority (most secure)
    if (request.cookies && request.cookies.lifepilot_session) {
      return request.cookies.lifepilot_session;
    }

    // 2. Authorization Bearer header fallback
    const authHeader = request.headers.authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    return null;
  }
}
