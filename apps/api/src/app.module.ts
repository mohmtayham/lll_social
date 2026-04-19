import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth/jwt-auth.guard';
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
import { UserFeedCacheModule } from './user-feed-cache/user-feed-cache.module';
import { UserInteractionModule } from './user-interaction/user-interaction.module';
import { UserInterestModule } from './user-interest/user-interest.module';
import { UserPrivacyModule } from './user-privacy/user-privacy.module';
import { UserRelationshipScoreModule } from './user-relationship-score/user-relationship-score.module';

@Module({
  imports: [
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
    UserFeedCacheModule,
    UserInteractionModule,
    UserInterestModule,
    UserPrivacyModule,
    UserRelationshipScoreModule,
    ConfigModule.forRoot({ isGlobal: true }),
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
