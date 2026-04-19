import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFriendshipDto } from './dto/create-friendship.dto';
import { UpdateFriendshipDto } from './dto/update-friendship.dto';

@Injectable()
export class FriendshipService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  async create(createFriendshipDto: CreateFriendshipDto) {
    const userId1 = this.toBigInt(createFriendshipDto.userId1);
    const userId2 = this.toBigInt(createFriendshipDto.userId2);

    if (userId1 === userId2) {
      throw new ForbiddenException('Cannot create friendship with yourself');
    }

    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId1, userId2 },
          { userId1: userId2, userId2: userId1 },
        ],
      },
    });

    if (existingFriendship) {
      return existingFriendship;
    }

    return this.prisma.friendship.create({
      data: {
        userId1,
        userId2,
        status: createFriendshipDto.status ?? 'PENDING',
      },
    });
  }

  findAll() {
    return this.prisma.friendship.findMany();
  }

  findOne(id: string) {
    return this.prisma.friendship.findUnique({
      where: { id: this.toBigInt(id) },
    });
  }

  update(id: string, updateFriendshipDto: UpdateFriendshipDto) {
    return this.prisma.friendship.update({
      where: { id: this.toBigInt(id) },
      data: {
        status: updateFriendshipDto.status,
      },
    });
  }

  remove(id: string) {
    return this.prisma.friendship.delete({
      where: { id: this.toBigInt(id) },
    });
  }

  async addrequest(createFriendshipDto: CreateFriendshipDto, _userId: number) {
    return this.create(createFriendshipDto);
  }

  approverequestORrejectrequest(id: string, updateFriendshipDto: UpdateFriendshipDto) {
    return this.update(id, updateFriendshipDto);
  }

  async allMyFriends(userId: number) {
    const currentUserId = this.toBigInt(userId);
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: currentUserId, status: 'ACCEPTED' },
          { userId2: currentUserId, status: 'ACCEPTED' },
        ],
      },
      include: {
        user1: true,
        user2: true,
      },
    });

    return friendships.map((friendship) => {
      if (friendship.userId1 === currentUserId) {
        return friendship.user2;
      }

      return friendship.user1;
    });
  }

}
