import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
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
}
