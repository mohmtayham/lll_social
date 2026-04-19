import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
import { UpdateSearchHistoryDto } from './dto/update-search-history.dto';

@Injectable()
export class SearchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  create(createSearchHistoryDto: CreateSearchHistoryDto) {
    return this.prisma.searchHistory.create({
      data: createSearchHistoryDto as any,
    });
  }

  findAll() {
    return this.prisma.searchHistory.findMany();
  }
  findOne(id: string) {
    return this.prisma.searchHistory.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateSearchHistoryDto: UpdateSearchHistoryDto) {
    return this.prisma.searchHistory.update({
      where: { id: BigInt(id) } as any,
      data: updateSearchHistoryDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.searchHistory.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
