import { Injectable ,Logger} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "src/prisma/prisma.service";






@Injectable()
export class ScoreService {
  private readonly logger = new Logger(ScoreService.name);
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)

  async decayFriendshipScores() {

this.logger.log('Running friendship score decay job...');
const decayFactor = 0.993; // Decay factor (e.g., reduce scores by 0.7%)
try {
  const result =await this.prisma.userRelationshipScore.updateMany({
    data: {
      score: {
        multiply:decayFactor,
      }
    }
  });
  this.logger.log(`Friendship score decay completed. Updated ${result.count} records.`);
}

catch (error) {
  this.logger.error('Error during friendship score decay:', error);
}
  }
    
  }