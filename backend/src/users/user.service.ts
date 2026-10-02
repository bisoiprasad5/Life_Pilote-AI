import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as crypto from 'crypto';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
  preference?: {
    id: string;
    userId: string;
    theme: string;
    timezone: string;
    energyLevel: number;
    morningBriefingEnabled: boolean;
    morningBriefingTime: string;
    nightReviewEnabled: boolean;
    nightReviewTime: string;
    dailyWaterTargetMl: number;
    defaultPomodoroLength: number;
  };
}

interface ResetTokenRecord {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  // In-memory fallback stores for offline/local development resilience
  private memoryUsers = new Map<string, UserEntity>();
  private memoryResetTokens: ResetTokenRecord[] = [];

  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async create(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    avatarUrl?: string;
  }): Promise<UserEntity> {
    const normalizedEmail = data.email.toLowerCase().trim();

    if (this.prisma.isConnected) {
      try {
        const user = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: data.passwordHash,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl || null,
            preference: {
              create: {
                theme: 'dark',
                timezone: 'UTC',
                energyLevel: 3,
                morningBriefingEnabled: true,
                morningBriefingTime: '07:00',
                nightReviewEnabled: true,
                nightReviewTime: '21:00',
                dailyWaterTargetMl: 2500,
                defaultPomodoroLength: 25,
              },
            },
          },
          include: {
            preference: true,
          },
        });
        return user as unknown as UserEntity;
      } catch (err) {
        this.logger.warn(`Prisma create failed, falling back to local store: ${err.message}`);
      }
    }

    // Memory fallback
    const id = crypto.randomUUID();
    const now = new Date();
    const user: UserEntity = {
      id,
      email: normalizedEmail,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      avatarUrl: data.avatarUrl || null,
      role: 'USER',
      createdAt: now,
      updatedAt: now,
      preference: {
        id: crypto.randomUUID(),
        userId: id,
        theme: 'dark',
        timezone: 'UTC',
        energyLevel: 3,
        morningBriefingEnabled: true,
        morningBriefingTime: '07:00',
        nightReviewEnabled: true,
        nightReviewTime: '21:00',
        dailyWaterTargetMl: 2500,
        defaultPomodoroLength: 25,
      },
    };
    this.memoryUsers.set(id, user);
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalizedEmail = email.toLowerCase().trim();

    if (this.prisma.isConnected) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { preference: true },
        });
        if (user) return user as unknown as UserEntity;
      } catch (err) {
        this.logger.warn(`Prisma findByEmail error: ${err.message}`);
      }
    }

    // Check memory store
    for (const u of this.memoryUsers.values()) {
      if (u.email === normalizedEmail) {
        return u;
      }
    }
    return null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    if (this.prisma.isConnected) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id },
          include: { preference: true },
        });
        if (user) return user as unknown as UserEntity;
      } catch (err) {
        this.logger.warn(`Prisma findById error: ${err.message}`);
      }
    }

    return this.memoryUsers.get(id) || null;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserEntity> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const {
      fullName,
      avatarUrl,
      theme,
      timezone,
      energyLevel,
      morningBriefingEnabled,
      morningBriefingTime,
      nightReviewEnabled,
      nightReviewTime,
      dailyWaterTargetMl,
      defaultPomodoroLength,
    } = dto;

    if (this.prisma.isConnected) {
      try {
        const updated = await this.prisma.user.update({
          where: { id },
          data: {
            ...(fullName !== undefined ? { fullName } : {}),
            ...(avatarUrl !== undefined ? { avatarUrl } : {}),
            preference: {
              upsert: {
                create: {
                  theme: theme ?? 'dark',
                  timezone: timezone ?? 'UTC',
                  energyLevel: energyLevel ?? 3,
                  morningBriefingEnabled: morningBriefingEnabled ?? true,
                  morningBriefingTime: morningBriefingTime ?? '07:00',
                  nightReviewEnabled: nightReviewEnabled ?? true,
                  nightReviewTime: nightReviewTime ?? '21:00',
                  dailyWaterTargetMl: dailyWaterTargetMl ?? 2500,
                  defaultPomodoroLength: defaultPomodoroLength ?? 25,
                },
                update: {
                  ...(theme !== undefined ? { theme } : {}),
                  ...(timezone !== undefined ? { timezone } : {}),
                  ...(energyLevel !== undefined ? { energyLevel } : {}),
                  ...(morningBriefingEnabled !== undefined ? { morningBriefingEnabled } : {}),
                  ...(morningBriefingTime !== undefined ? { morningBriefingTime } : {}),
                  ...(nightReviewEnabled !== undefined ? { nightReviewEnabled } : {}),
                  ...(nightReviewTime !== undefined ? { nightReviewTime } : {}),
                  ...(dailyWaterTargetMl !== undefined ? { dailyWaterTargetMl } : {}),
                  ...(defaultPomodoroLength !== undefined ? { defaultPomodoroLength } : {}),
                },
              },
            },
          },
          include: { preference: true },
        });
        return updated as unknown as UserEntity;
      } catch (err) {
        this.logger.warn(`Prisma updateProfile error: ${err.message}`);
      }
    }

    // Fallback update
    if (fullName !== undefined) existing.fullName = fullName;
    if (avatarUrl !== undefined) existing.avatarUrl = avatarUrl;
    if (existing.preference) {
      if (theme !== undefined) existing.preference.theme = theme;
      if (timezone !== undefined) existing.preference.timezone = timezone;
      if (energyLevel !== undefined) existing.preference.energyLevel = energyLevel;
      if (morningBriefingEnabled !== undefined)
        existing.preference.morningBriefingEnabled = morningBriefingEnabled;
      if (morningBriefingTime !== undefined)
        existing.preference.morningBriefingTime = morningBriefingTime;
      if (nightReviewEnabled !== undefined)
        existing.preference.nightReviewEnabled = nightReviewEnabled;
      if (nightReviewTime !== undefined)
        existing.preference.nightReviewTime = nightReviewTime;
      if (dailyWaterTargetMl !== undefined)
        existing.preference.dailyWaterTargetMl = dailyWaterTargetMl;
      if (defaultPomodoroLength !== undefined)
        existing.preference.defaultPomodoroLength = defaultPomodoroLength;
    }
    existing.updatedAt = new Date();
    this.memoryUsers.set(id, existing);
    return existing;
  }

  async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    if (this.prisma.isConnected) {
      try {
        await this.prisma.user.update({
          where: { id },
          data: { passwordHash: newPasswordHash },
        });
        return;
      } catch (err) {
        this.logger.warn(`Prisma updatePassword error: ${err.message}`);
      }
    }

    const user = this.memoryUsers.get(id);
    if (user) {
      user.passwordHash = newPasswordHash;
      user.updatedAt = new Date();
      this.memoryUsers.set(id, user);
    }
  }

  async storeResetToken(userId: string, rawToken: string, expiresAt: Date): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    // Remove existing tokens for user
    this.memoryResetTokens = this.memoryResetTokens.filter((r) => r.userId !== userId);
    this.memoryResetTokens.push({ userId, tokenHash, expiresAt });
  }

  async validateResetToken(rawToken: string): Promise<string | null> {
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();
    const record = this.memoryResetTokens.find(
      (r) => r.tokenHash === tokenHash && r.expiresAt > now,
    );
    return record ? record.userId : null;
  }

  async clearResetToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    this.memoryResetTokens = this.memoryResetTokens.filter((r) => r.tokenHash !== tokenHash);
  }

  sanitizeUser(user: UserEntity) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
