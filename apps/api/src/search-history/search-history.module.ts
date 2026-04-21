import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SearchType } from '@prisma/client'; // تأكد من استيراد الـ Enum الصحيح

@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. حفظ أو تحديث كلمة البحث
  async saveSearch(userId: string, query: string, searchType: SearchType) {
    // نقوم بتنظيف الكلمة من الفراغات الزائدة
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    return this.prisma.searchHistory.upsert({
      where: {
        userId_query_searchType: {
          userId: BigInt(userId),
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
        userId: BigInt(userId),
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

  // 4. مسح السجل بالكامل للمستخدم
  async clearHistory(userId: string) {
    return this.prisma.searchHistory.deleteMany({
      where: { userId: BigInt(userId) },
    });
  }
}