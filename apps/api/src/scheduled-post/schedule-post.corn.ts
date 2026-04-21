import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SchedulePostCronService {
	private readonly logger = new Logger(SchedulePostCronService.name);

	constructor(private readonly prisma: PrismaService) {}

	@Cron(CronExpression.EVERY_MINUTE)
	async publishScheduledPosts() {
		this.logger.log('Running scheduled post publishing job...');

		const dueCount = await this.prisma.scheduledPost.count({
			where: {
				status: 'PENDING',
				scheduledFor: {
					lte: new Date(),
				},
			},
		});

		this.logger.log(`Due scheduled posts: ${dueCount}`);
	}
}