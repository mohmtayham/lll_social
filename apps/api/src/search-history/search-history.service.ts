import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SearchType } from '@prisma/client'; // تأكد من استيراد الـ Enum الصحيح
export type SearchCategory = 'all' | 'users' | 'posts' | 'groups';

type SearchResult<T> = { data: T[]; total: number };

@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}
    private readonly safeUserSelect = {
    id: true,
    username: true,
    name: true,
    bio: true,
    avatarMediaId: true,
    isVerified: true,
    status: true,
  };
  
  // ─────────────────────────────────────────────────────────────
  // Posts — searches content text AND hashtags
  // ─────────────────────────────────────────────────────────────
  private async searchPosts(
    query: string,
    skip: number,
    take: number,
  ): Promise<SearchResult<any>> {
    // Split query into individual words to match against hashtags too
    // e.g. "javascript react" matches posts tagged #javascript OR #react
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);

    const hashtagConditions = words.map((word) => ({
      hashtags: {
        some: {
          hashtag: { nameLower: { contains: word } },
        },
      },
    }));

    const where = {
      deletedAt: null,
      status: { in: ['DIRECT', 'PUBLISHED'] as any[] },
      // Only show publicly visible posts in search
      visibility: 'PUBLIC' as const,
      OR: [
        { content: { contains: query } },
        ...hashtagConditions,
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          content: true,
          createdAt: true,
          viewsCount: true,
          visibility: true,
          user: { select: this.safeUserSelect },
          hashtags: {
            select: {
              hashtag: { select: { nameLower: true } },
            },
          },
          media: {
            take: 1,
            select: { mediaId: true },
          },
          _count: {
            select: { comments: true, reactions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where }),
    ]);

    return { data, total };
  }

  // ─────────────────────────────────────────────────────────────
  // Groups — searches name and description
  // ─────────────────────────────────────────────────────────────
  private async searchGroups(
    query: string,
    skip: number,
    take: number,
  ): Promise<SearchResult<any>> {
    const where = {
      deletedAt: null,
      // Don't surface HIDDEN groups in search
      privacy: { not: 'HIDDEN' as const },
      OR: [
        { name: { contains: query } },
        { description: { contains: query } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          description: true,
          privacy: true,
          avatarMediaId: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.group.count({ where }),
    ]);

    return { data, total };
  }
  private async searchUsers(
    query: string,
    skip: number,
    take: number,
  ): Promise<SearchResult<any>> {
    const where = {
      deletedAt: null,
      status: 'ACTIVE' as const,
      OR: [
        { name: { contains: query } },
        { username: { contains: query } },
       
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: this.safeUserSelect,
        orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  private categoryToSearchType(category: SearchCategory): SearchType {
    const map: Record<SearchCategory, SearchType> = {
      all: SearchType.POSTS,
      users: SearchType.USERS,
      posts: SearchType.POSTS,
      groups: SearchType.GROUPS,
    };
    return map[category];
  }
  private toBigInt(value: string | number | bigint): bigint {
    return BigInt(value);
  }
  
  async getHistory(userId: bigint, limit = 10) {
    const safeLimit = Math.min(Math.max(1, limit), 20);
    return this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        query: true,
        searchType: true,
        createdAt: true,
      },
    });
  }
  
  private async saveHistory(
    userId: bigint,
    query: string,
    category: SearchCategory,
  ): Promise<void> {
    const searchType = this.categoryToSearchType(category);
    const safeQuery = query.slice(0, 255);

    // Upsert so the same term doesn't create duplicate rows
    await this.prisma.searchHistory.upsert({
      where: {
        userId_query_searchType: { userId, query: safeQuery, searchType },
      },
      update: {},
      create: { userId, query: safeQuery, searchType },
    });
  }

  // Strip characters that break MySQL LIKE/FULLTEXT queries
  private sanitize(q: string): string {
    return q.trim().replace(/[%_\\]/g, '\\$&').slice(0, 100);
  }

  private normalizePage(page: number): number {
    return Math.max(1, Math.floor(Number(page) || 1));
  }

  private normalizeLimit(limit: number): number {
    return Math.min(Math.max(1, Math.floor(Number(limit) || 20)), 50);
  }

  async search(userId:bigint, rawQuery: string, category: string = 'all', page = 1, limit = 20) {
const query = this.sanitize(rawQuery);

if (!query || query.length < 1) {
  return { query: rawQuery, users: null, posts: null, groups: null };
}
const safePage = this.normalizePage(page);
const safeLimit = this.normalizeLimit(limit);
const skip = (safePage - 1) * safeLimit;
// بناء شروط البحث بناءً على الفئة
let whereClause = {};
const [users, posts, groups] = await Promise.all([
  (category === 'all' || category === 'users')
    ? this.searchUsers(query, skip, safeLimit)
    : Promise.resolve({ data: [], total: 0 }),
  (category === 'all' || category === 'posts')
    ? this.searchPosts(query, skip, safeLimit)
    : Promise.resolve({ data: [], total: 0 }),
  (category === 'all' || category === 'groups')
    ? this.searchGroups(query, skip, safeLimit)
    : Promise.resolve({ data: [], total: 0 }),
]);

// بناء شروط البحث بناءً على الفئة

}
  // 1. حفظ أو تحديث كلمة البحث
  async saveSearch(userId: string, query: string, searchType: SearchType) {
    // نقوم بتنظيف الكلمة من الفراغات الزائدة
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    return this.prisma.searchHistory.upsert({
      where: {
        userId_query_searchType: {
          userId: this.toBigInt(userId),
          query: cleanQuery,
          searchType: searchType,
        },
      },
      // إذا كانت الكلمة موجودة مسبقاً، نحدث التاريخ فقط لتظهر في أعلى القائمة
      update: {
        createdAt: new Date(),
      },
      // إذا كانت كلمة جديدة، ننشئها
      create: {
        userId: this.toBigInt(userId),
        query: cleanQuery,
        searchType: searchType,
      },
    });
  }

  // 2. جلب أحدث عمليات البحث للمستخدم (أحدث 10 مثلاً)
  async getRecentSearches(userId: string, searchType?: SearchType) {
    return this.prisma.searchHistory.findMany({
      where: {
        userId: BigInt(userId),
        // إذا أرسلنا نوع البحث نفلتر بناءً عليه، وإلا نجلب الكل
        ...(searchType && { searchType }), 
      },
      orderBy: {
        createdAt: 'desc', // ترتيب من الأحدث للأقدم
      },
      take: 10, // نجلب آخر 10 عمليات بحث فقط
    });
  }

  // 3. حذف كلمة معينة من السجل (عندما يضغط المستخدم على علامة X)
  async removeSearch(id: string, userId: string) {
    return this.prisma.searchHistory.deleteMany({
      where: {
        id: BigInt(id),
        userId: BigInt(userId), // نضمن أن المستخدم يحذف السجل الخاص به فقط
      },
    });
  }
  async deleteHistoryItem(userId: bigint, id: bigint) {
    return this.prisma.searchHistory.deleteMany({
      where: { id, userId }, // userId guard prevents deleting other users' history
    });
  }
  // 4. مسح السجل بالكامل للمستخدم
  async clearHistory(userId: bigint) {
    return this.prisma.searchHistory.deleteMany({
      where: { userId: BigInt(userId) },
    });
  }

}