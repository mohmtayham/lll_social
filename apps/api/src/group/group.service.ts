import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GroupMemberRole, GroupMemberStatus, GroupPrivacy, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EngagementScoreService } from '../score/engagement-score.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementScoreService: EngagementScoreService,
    @InjectQueue('graph-sync') private readonly graphQueue: Queue,
  ) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  async create(createGroupDto: CreateGroupDto & Record<string, any>) {
    const creatorId = createGroupDto.creatorId ?? createGroupDto.userId;
    if (creatorId === undefined || creatorId === null) {
      throw new ForbiddenException('creatorId is required to create a group');
    }

    return this.prisma.group.create({
      data: {
        name: String(createGroupDto.name ?? 'Untitled group').trim(),
        description: createGroupDto.description ?? null,
        privacy: (createGroupDto.privacy as GroupPrivacy | undefined) ?? GroupPrivacy.PUBLIC,
        avatarMediaId: createGroupDto.avatarMediaId ? this.toBigInt(createGroupDto.avatarMediaId) : null,
        coverMediaId: createGroupDto.coverMediaId ? this.toBigInt(createGroupDto.coverMediaId) : null,
        creatorId: this.toBigInt(creatorId),
        postsNeedApproval: Boolean(createGroupDto.postsNeedApproval ?? false),
      },
    });
  }

  findAll() {
    return this.prisma.group.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string | number | bigint) {
    return this.prisma.group.findFirst({
      where: { id: this.toBigInt(id), deletedAt: null },
    });
  }

  async update(id: string | number | bigint, updateGroupDto: UpdateGroupDto & Record<string, any>) {
    const group = await this.findOne(id);
    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.group.update({
      where: { id: this.toBigInt(id) },
      data: {
        name: updateGroupDto.name !== undefined ? String(updateGroupDto.name).trim() : undefined,
        description: updateGroupDto.description !== undefined ? updateGroupDto.description : undefined,
        privacy: updateGroupDto.privacy as GroupPrivacy | undefined,
        avatarMediaId:
          updateGroupDto.avatarMediaId !== undefined
            ? updateGroupDto.avatarMediaId
              ? this.toBigInt(updateGroupDto.avatarMediaId)
              : null
            : undefined,
        coverMediaId:
          updateGroupDto.coverMediaId !== undefined
            ? updateGroupDto.coverMediaId
              ? this.toBigInt(updateGroupDto.coverMediaId)
              : null
            : undefined,
        postsNeedApproval:
          updateGroupDto.postsNeedApproval !== undefined ? Boolean(updateGroupDto.postsNeedApproval) : undefined,
      },
    });
  }

  async remove(id: string | number | bigint) {
    const group = await this.findOne(id);
    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.group.update({
      where: { id: this.toBigInt(id) },
      data: { deletedAt: new Date() },
    });
  }

  async joinGroup(userId: string | number | bigint, groupId: string | number | bigint) {
    const user = this.toBigInt(userId);
    const group = this.toBigInt(groupId);
    const groupRow = await this.findOne(group);
    if (!groupRow) throw new NotFoundException('Group not found');

    const existingMember = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group, userId: user } },
    });

    if (existingMember) {
      if (existingMember.status === GroupMemberStatus.BANNED) {
        throw new ForbiddenException('You are banned from this group');
      }

      throw new ConflictException('You are already a member');
    }

    if (groupRow.privacy !== GroupPrivacy.PUBLIC) {
      throw new ForbiddenException('Private groups require an approval flow that is not enabled yet');
    }

    const member = await this.prisma.groupMember.create({
      data: {
        groupId: group,
        userId: user,
        role: GroupMemberRole.MEMBER,
        status: GroupMemberStatus.APPROVED,
      },
    });

    await this.engagementScoreService.trackGroupJoin({ userId: user, groupId: group });

    await this.graphQueue.add(
      'group-join',
      { userId: user.toString(), groupId: group.toString() },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return member;
  }

  async leaveGroup(userId: string | number | bigint, groupId: string | number | bigint) {
    const user = this.toBigInt(userId);
    const group = this.toBigInt(groupId);

    await this.prisma.groupMember.deleteMany({
      where: { groupId: group, userId: user },
    });

    await this.engagementScoreService.trackGroupLeave({ userId: user, groupId: group });

    await this.graphQueue.add(
      'group-leave',
      { userId: user.toString(), groupId: group.toString() },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { message: 'Left group successfully' };
  }

  async setGroupDeletedAt(groupId: string | number | bigint, deletedAt: Date | null) {
    return this.prisma.group.update({
      where: { id: this.toBigInt(groupId) },
      data: { deletedAt },
    });
  }

  async ensureGroupExists(groupId: string | number | bigint) {
    const group = await this.findOne(groupId);
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }
}