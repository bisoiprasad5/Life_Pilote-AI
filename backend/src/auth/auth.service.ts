import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserService, UserEntity } from '../users/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: any; accessToken: string }> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.userService.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });

    const accessToken = await this.generateToken(user);
    const sanitized = this.userService.sanitizeUser(user);

    return { user: sanitized, accessToken };
  }

  async login(dto: LoginDto): Promise<{ user: any; accessToken: string }> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.generateToken(user);
    const sanitized = this.userService.sanitizeUser(user);

    return { user: sanitized, accessToken };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; resetToken?: string }> {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      // Return safe message to prevent email enumeration
      return {
        message: 'If an account with that email exists, reset instructions have been dispatched.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userService.storeResetToken(user.id, resetToken, expiresAt);
    this.logger.log(`Password reset token generated for user: ${user.email}`);

    return {
      message: 'If an account with that email exists, reset instructions have been dispatched.',
      resetToken, // Provided in response for easy developer/E2E testing
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const userId = await this.userService.validateResetToken(dto.token);
    if (!userId) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    await this.userService.updatePassword(userId, newPasswordHash);
    await this.userService.clearResetToken(dto.token);

    this.logger.log(`Password reset successfully executed for user ID: ${userId}`);
    return {
      message: 'Password has been successfully updated. You may now log in with your new credentials.',
    };
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return this.userService.sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<any> {
    const updated = await this.userService.updateProfile(userId, dto);
    return this.userService.sanitizeUser(updated);
  }

  private async generateToken(user: UserEntity): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const secret =
      this.configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key_lifepilot_2026';

    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: '7d',
    });
  }
}
