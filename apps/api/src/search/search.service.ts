import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { serializeMedia } from 'src/media/media-storage';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(userId: string | number, query: string, limit = 10, req?: Request) {
    const cleanQuery = query?.trim() ?? '';
    if (!cleanQuery) {
      return { users: [], posts: [], groups: [] };
    }

    const [users, groups, posts] = await Promise.all([
      // 1. Search Users
      this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: cleanQuery } },
            { username: { contains: cleanQuery } },
          ],
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          username: true,
          avatarMedia: true,
        },
        take: limit,
      }),

      // 2. Search Groups
      this.prisma.group.findMany({
        where: {
          OR: [
            { name: { contains: cleanQuery } },
            { description: { contains: cleanQuery } },
          ],
          deletedAt: null,
          privacy: { not: 'HIDDEN' },
        },
        select: {
          id: true,
          name: true,
          description: true,
          avatarMedia: true,
          privacy: true,
        },
        take: limit,
      }),

      // 3. Search Posts
      this.prisma.post.findMany({
        where: {
          content: { contains: cleanQuery },
          status: { in: ['PUBLISHED', 'DIRECT'] },
          visibility: 'PUBLIC',
          deletedAt: null,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarMedia: true,
            },
          },
          media: {
            include: { media: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    // Format ids to string since they are BigInt
    return {
      users: users.map((u) => ({
        ...u,
        id: u.id.toString(),
        avatarMedia: serializeMedia(u.avatarMedia, req),
      })),
      groups: groups.map((g) => ({
        ...g,
        id: g.id.toString(),
        avatarMedia: serializeMedia(g.avatarMedia, req),
      })),
      posts: posts.map((p) => ({
        ...p,
        id: p.id.toString(),
        user: {
          ...p.user,
          id: p.user.id.toString(),
          avatarMedia: serializeMedia(p.user.avatarMedia, req),
        },
        media: p.media.map((m) => serializeMedia(m.media, req)),
      })),
    };
  }
}
