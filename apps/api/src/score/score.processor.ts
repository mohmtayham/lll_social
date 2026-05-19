import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';

@Processor('score-decay')
export class ScoreProcessor extends WorkerHost {
  private readonly logger = new Logger(ScoreProcessor.name);

  // ── Decay factors (applied weekly) ──────────────────────────────
  private readonly RELATIONSHIP_DECAY = 0.991; // ~9% per month
  private readonly INTEREST_DECAY     = 0.985; // ~15% per month
  private readonly AFFINITY_DECAY     = 0.990; // ~10% per month
  private readonly BATCH_SIZE         = 1000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Score decay job ${job.id} started`);

    try {
      const [relationships, interests, affinities] = await Promise.all([
        this.decayRelationshipScores(),
        this.decayInterestScores(),
        this.decayGroupAffinities(),
      ]);

      this.logger.log(
        `Score decay complete — ` +
        `relationships: ${relationships}, ` +
        `interests: ${interests}, ` +
        `affinities: ${affinities}`,
      );

      return { relationships, interests, affinities };

    } catch (error) {
      this.logger.error(`Score decay job ${job.id} failed:`, error);
      throw error; // ← must rethrow so BullMQ knows to retry
    }
  }

  // ── UserRelationshipScore decay ──────────────────────────────────
  private async decayRelationshipScores(): Promise<number> {
    let totalUpdated = 0;

    while (true) {
      // MySQL LIMIT on UPDATE is the cleanest batch approach
      const result = await this.prisma.$executeRaw`
        UPDATE user_relationship_scores
        SET score = GREATEST(score * ${this.RELATIONSHIP_DECAY}, 0)
        WHERE score > 0
        LIMIT ${this.BATCH_SIZE}
      `;

      totalUpdated += Number(result);

      // If fewer rows than batch size were updated, we're done
      if (Number(result) < this.BATCH_SIZE) break;

      // Small pause between batches to avoid DB overload
      await this.sleep(50);
    }

    // Remove dead relationships (score too low to matter)
    await this.prisma.$executeRaw`
      DELETE FROM user_relationship_scores WHERE score < 0.5
    `;

    return totalUpdated;
  }

  // ── UserInterest decay ───────────────────────────────────────────
  private async decayInterestScores(): Promise<number> {
    let totalUpdated = 0;

    while (true) {
      const result = await this.prisma.$executeRaw`
        UPDATE user_interests
        SET score = GREATEST(score * ${this.INTEREST_DECAY}, 0)
        WHERE score > 0
        LIMIT ${this.BATCH_SIZE}
      `;

      totalUpdated += Number(result);
      if (Number(result) < this.BATCH_SIZE) break;
      await this.sleep(50);
    }

    // Clean up dead interests
    await this.prisma.$executeRaw`
      DELETE FROM user_interests WHERE score < 0.5
    `;

    return totalUpdated;
  }

  // ── UserGroupAffinity decay ──────────────────────────────────────
  private async decayGroupAffinities(): Promise<number> {
    let totalUpdated = 0;

    while (true) {
      const result = await this.prisma.$executeRaw`
        UPDATE user_group_affinities
        SET score = GREATEST(score * ${this.AFFINITY_DECAY}, 0)
        WHERE score > 0
        LIMIT ${this.BATCH_SIZE}
      `;

      totalUpdated += Number(result);
      if (Number(result) < this.BATCH_SIZE) break;
      await this.sleep(50);
    }

    // Clean up dead affinities
    await this.prisma.$executeRaw`
      DELETE FROM user_group_affinities WHERE score < 0.5
    `;

    return totalUpdated;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}