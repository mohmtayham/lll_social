import { UpdateUserPrivacyDto } from './../user-privacy/dto/update-user-privacy.dto';
// 1. Added the missing NestJS exceptions here
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
// 2. Added the missing DTO import (adjust the path if yours is different)
import { UpdateProfileDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
// 3. Added Prisma to handle the error typing
import { Role, Prisma } from '@prisma/client';
import { serializeMedia } from 'src/media/media-storage';

import { hash } from 'argon2';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(userId: string | number | bigint): bigint {
    if (typeof userId === 'bigint') return userId;
    if (typeof userId === 'number') return BigInt(userId);
    return BigInt(userId);
  }

  async create(createUserDto: CreateUserDto) {
    const { password, ...user } = createUserDto;
    const hashedPassword = await hash(password);
    return await this.prisma.user.create({
      data: {
        password: hashedPassword,
        ...user,
        role: user.role || Role.USER,
      },
    });
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findOne(userId: string | number | bigint) {
    return await this.prisma.user.findUnique({
      where: {
        id: this.toBigInt(userId),
      },
    });
  }

  async updateHashedRefreshToken(userId: string | number | bigint, hashedRT: string | null) {
    return await this.prisma.user.update({
      where: {
        id: this.toBigInt(userId),
      },
      data: {
        hashedRefreshToken: hashedRT,
      },
    });
  }

  // --- NEW UPDATE PROFILE METHOD ---
  // async updateProfile(userId: string | number | bigint, updateData: UpdateProfileDto) {
  //   const id = this.toBigInt(userId);

  //   // If the user is updating their username, ensure it doesn't already exist
  //   if (updateData.username) {
  //     const existingUser = await this.prisma.user.findUnique({
  //       where: { username: updateData.username },
  //     });

  //     if (existingUser && existingUser.id !== id) {
  //       throw new ConflictException('Username is already taken');
  //     }
  //   }

  //   try {
  //     const updatedUser = await this.prisma.user.update({
  //       where: { id },
  //       data: {
  //         ...updateData,
  //         // If media IDs are passed as numbers/strings, ensure they are cast to BigInt for Prisma
  //         ...(updateData.avatarMediaId && { avatarMediaId: this.toBigInt(updateData.avatarMediaId) }),
  //         ...(updateData.coverMediaId && { coverMediaId: this.toBigInt(updateData.coverMediaId) }),
  //       },
  //     });

  //     // 4. Fixed the 'delete' error by destructuring the object to remove sensitive data
  //     const { password, hashedRefreshToken, ...safeUser } = updatedUser;

  //     return safeUser;
  //   } catch (error) {
  //     // 5. Fixed the 'unknown' error type by checking if it's a Prisma Request Error
  //     if (error instanceof Prisma.PrismaClientKnownRequestError) {
  //       if (error.code === 'P2025') {
  //         throw new NotFoundException('User not found');
  //       }
  //     }
  //     throw error;
  //   }
  // }

  async getProfile(userId: bigint | number | string, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        phone: true,
        dateOfBirth: true,
        location: true,
        city: true,
        country: true,
        gender: true,
        role: true,
        avatarMedia: true,
        coverMedia: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      avatarMedia: serializeMedia(user.avatarMedia, req),
      coverMedia: serializeMedia(user.coverMedia, req),
    };
  }

  async updateProfile(userId: bigint | number | string, dto: UpdateProfileDto, req?: Request) {
    const { avatarMediaId, coverMediaId, ...rest } = dto;

    const user = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        ...rest,
        ...(avatarMediaId !== undefined && { avatarMediaId: BigInt(avatarMediaId) }),
        ...(coverMediaId !== undefined && { coverMediaId: BigInt(coverMediaId) }),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        phone: true,
        dateOfBirth: true,
        location: true,
        city: true,
        country: true,
        gender: true,
        role: true,
        avatarMedia: true,
        coverMedia: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      avatarMedia: serializeMedia(user.avatarMedia, req),
      coverMedia: serializeMedia(user.coverMedia, req),
    };
  }
}
