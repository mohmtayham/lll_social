import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTrendingScoreDto } from './dto/create-trending-score.dto';
import { UpdateTrendingScoreDto } from './dto/update-trending-score.dto';

@Injectable()
export class TrendingScoreService {
  constructor(private readonly prisma: PrismaService) {}

  create(createTrendingScoreDto: CreateTrendingScoreDto) {
    return this.prisma.trendingScore.create({
      data: createTrendingScoreDto as any,
    });
  }

  findAll() {
    return this.prisma.trendingScore.findMany();
  }
  findOne(id: string) {
    return this.prisma.trendingScore.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateTrendingScoreDto: UpdateTrendingScoreDto) {
    return this.prisma.trendingScore.update({
      where: { id: BigInt(id) } as any,
      data: updateTrendingScoreDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.trendingScore.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
