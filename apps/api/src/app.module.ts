import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth/jwt-auth.guard';
import { RedisModule } from './redis/redis.module';
import { BlockModule } from './block/block.module';
import { CommentModule } from './comment/comment.module';
import { CommentEditModule } from './comment-edit/comment-edit.module';
import { ConversationModule } from './conversation/conversation.module';
import { ConversationParticipantModule } from './conversation-participant/conversation-participant.module';
import { FriendshipModule } from './friendship/friendship.module';
import { HashtagModule } from './hashtag/hashtag.module';
import { MediaModule } from './media/media.module';
import { MentionModule } from './mention/mention.module';
import { MessageModule } from './message/message.module';
import { MessageAttachmentModule } from './message-attachment/message-attachment.module';
import { MessageEditModule } from './message-edit/message-edit.module';
import { NotificationModule } from './notification/notification.module';
import { PostModule } from './post/post.module';
import { PostAllowedUserModule } from './post-allowed-user/post-allowed-user.module';
import { PostCategoryModule } from './post-category/post-category.module';
import { PostCategoryMapModule } from './post-category-map/post-category-map.module';
import { PostEditModule } from './post-edit/post-edit.module';
import { PostHashtagModule } from './post-hashtag/post-hashtag.module';
import { PostMediaModule } from './post-media/post-media.module';
import { ReactionModule } from './reaction/reaction.module';
import { SavedPostModule } from './saved-post/saved-post.module';
import { ScheduledPostModule } from './scheduled-post/scheduled-post.module';
import { ScheduledPostMediaModule } from './scheduled-post-media/scheduled-post-media.module';
import { SearchHistoryModule } from './search-history/search-history.module';
import { TrendingScoreModule } from './trending-score/trending-score.module';
import { UserInteractionModule } from './user-interaction/user-interaction.module';
import { UserInterestModule } from './user-interest/user-interest.module';
import { UserPrivacyModule } from './user-privacy/user-privacy.module';
import { UserRelationshipScoreModule } from './user-relationship-score/user-relationship-score.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq'; // هذه هي الصحيحة لـ BullMQ
import { ScoreModule } from './score/score.module';
import { GraphSyncModule } from './graph-sync/graph-sync.module';
import { Neo4jModule } from './neo4j/neo4j.module';
import { QueueModule } from './queue/queue.module';
import { createBullMqConnection } from './redis/redis.config';

import { GroupModule } from './group/group.module';
import { SearchModule } from './search/search.module';
@Module({
  imports: [
    ScheduleModule.forRoot(), // Add this line!
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: createBullMqConnection(),
        skipVersionCheck: process.env.BULLMQ_SKIP_VERSION_CHECK !== 'false',
      }),
    }),
   RedisModule,
    AuthModule,
    UserModule,
    BlockModule,
    CommentModule,
    CommentEditModule,
    ConversationModule,
    ConversationParticipantModule,
    FriendshipModule,
    HashtagModule,
    MediaModule,
    MentionModule,
    MessageModule,
    MessageAttachmentModule,
    MessageEditModule,
    NotificationModule,
    PostModule,
    PostAllowedUserModule,
    PostCategoryModule,
    PostCategoryMapModule,
    PostEditModule,
    PostHashtagModule,
    PostMediaModule,
    ReactionModule,
    SavedPostModule,
    ScheduledPostModule,
    ScheduledPostMediaModule,
    SearchHistoryModule,
    TrendingScoreModule,
    UserInteractionModule,
    UserInterestModule,
    UserPrivacyModule,
    UserRelationshipScoreModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ScoreModule,
    GraphSyncModule,
    Neo4jModule,
    QueueModule,
    GroupModule,
    SearchModule,

  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
