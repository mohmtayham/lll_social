-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` TIMESTAMP(0) NULL,
    `password` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `date_of_birth` DATE NULL,
    `gender` ENUM('male', 'female', 'other', 'prefer_not_to_say') NULL,
    `bio` TEXT NULL,
    `avatar_media_id` BIGINT UNSIGNED NULL,
    `cover_media_id` BIGINT UNSIGNED NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `last_active_at` TIMESTAMP(0) NULL,
    `status` ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
    `fcm_token` VARCHAR(255) NULL,
    `location` VARCHAR(255) NOT NULL DEFAULT '',
    `country` VARCHAR(100) NULL,
    `city` VARCHAR(100) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `role` ENUM('user', 'admin', 'editor', 'moderator') NOT NULL DEFAULT 'user',
    `hashed_refresh_token` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_privacy` (
    `user_id` BIGINT UNSIGNED NOT NULL,
    `who_can_message` ENUM('everyone', 'friends', 'friends_of_friends', 'no_one') NOT NULL DEFAULT 'friends',
    `who_can_see_posts` ENUM('public', 'friends', 'only_me', 'custom') NOT NULL DEFAULT 'friends',
    `who_can_see_story` ENUM('public', 'friends', 'close_friends') NOT NULL DEFAULT 'friends',
    `who_can_add_friend` ENUM('everyone', 'friends_of_friends') NOT NULL DEFAULT 'everyone',
    `who_can_tag` ENUM('everyone', 'friends') NOT NULL DEFAULT 'friends',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `file_name` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size` BIGINT UNSIGNED NOT NULL,
    `hash` VARCHAR(64) NULL,
    `path` VARCHAR(255) NOT NULL,
    `uploaded_by` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `media_uploaded_by_idx`(`uploaded_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `views_count` INTEGER NOT NULL DEFAULT 0,
    `content` TEXT NULL,
    `visibility` ENUM('public', 'friends', 'only_me', 'custom') NOT NULL DEFAULT 'public',
    `feeling` VARCHAR(50) NULL,
    `location` VARCHAR(255) NULL,
    `is_edited` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `status` ENUM('DIRECT', 'pending', 'published', 'cancelled') NULL DEFAULT 'DIRECT',
    `shared_post_id` BIGINT UNSIGNED NULL,
    `global_score` DOUBLE NOT NULL DEFAULT 0,
    `group_id` BIGINT UNSIGNED NULL,

    INDEX `posts_group_id_idx`(`group_id`),
    INDEX `posts_user_id_idx`(`user_id`),
    INDEX `posts_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `posts_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_media` (
    `post_id` BIGINT UNSIGNED NOT NULL,
    `media_id` BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (`post_id`, `media_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_allowed_users` (
    `post_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,

    INDEX `post_allowed_users_user_id_idx`(`user_id`),
    PRIMARY KEY (`post_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_edits` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT UNSIGNED NOT NULL,
    `old_content` TEXT NOT NULL,
    `edited_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `post_edits_post_id_idx`(`post_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `parent_id` BIGINT UNSIGNED NULL,
    `content` TEXT NOT NULL,
    `is_edited` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `comments_post_id_idx`(`post_id`),
    INDEX `comments_parent_id_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comment_edits` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `comment_id` BIGINT UNSIGNED NOT NULL,
    `old_content` TEXT NOT NULL,
    `edited_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `comment_edits_comment_id_idx`(`comment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reactions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `reactable_id` BIGINT UNSIGNED NOT NULL,
    `reactable_type` ENUM('Post', 'Comment') NOT NULL,
    `reaction_type` ENUM('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry') NOT NULL DEFAULT 'like',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `reactions_user_id_idx`(`user_id`),
    INDEX `reactions_reactable_id_reactable_type_idx`(`reactable_id`, `reactable_type`),
    UNIQUE INDEX `reactions_user_id_reactable_id_reactable_type_key`(`user_id`, `reactable_id`, `reactable_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `friendships` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id_1` BIGINT UNSIGNED NOT NULL,
    `user_id_2` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `friendships_user_id_1_idx`(`user_id_1`),
    INDEX `friendships_user_id_2_idx`(`user_id_2`),
    UNIQUE INDEX `friendships_user_id_1_user_id_2_key`(`user_id_1`, `user_id_2`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blocks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `blocker_id` BIGINT UNSIGNED NOT NULL,
    `blocked_id` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `blocks_blocked_id_idx`(`blocked_id`),
    UNIQUE INDEX `blocks_blocker_id_blocked_id_key`(`blocker_id`, `blocked_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `type` ENUM('direct', 'group') NOT NULL DEFAULT 'direct',
    `name` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `avatar_media_id` BIGINT UNSIGNED NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `last_message_id` BIGINT UNSIGNED NULL,
    `last_message_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `conversations_created_by_idx`(`created_by`),
    INDEX `conversations_last_message_at_idx`(`last_message_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversation_participants` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `conversation_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role` ENUM('member', 'admin') NOT NULL DEFAULT 'member',
    `last_read_message_id` BIGINT UNSIGNED NULL,
    `is_muted` BOOLEAN NOT NULL DEFAULT false,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `left_at` TIMESTAMP(0) NULL,
    `joined_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `conversation_participants_user_id_idx`(`user_id`),
    INDEX `conversation_participants_last_read_message_id_idx`(`last_read_message_id`),
    UNIQUE INDEX `conversation_participants_conversation_id_user_id_key`(`conversation_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `conversation_id` BIGINT UNSIGNED NOT NULL,
    `sender_id` BIGINT UNSIGNED NOT NULL,
    `content` TEXT NULL,
    `message_type` ENUM('text', 'image', 'video', 'audio', 'file', 'sticker', 'voice', 'location') NOT NULL DEFAULT 'text',
    `reply_to_id` BIGINT UNSIGNED NULL,
    `client_message_id` VARCHAR(100) NULL,
    `is_edited` BOOLEAN NOT NULL DEFAULT false,
    `is_deleted_for_everyone` BOOLEAN NOT NULL DEFAULT false,
    `edited_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `messages_conversation_id_created_at_idx`(`conversation_id`, `created_at`),
    INDEX `messages_conversation_id_id_idx`(`conversation_id`, `id`),
    INDEX `messages_reply_to_id_idx`(`reply_to_id`),
    UNIQUE INDEX `messages_sender_id_client_message_id_key`(`sender_id`, `client_message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_attachments` (
    `message_id` BIGINT UNSIGNED NOT NULL,
    `media_id` BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (`message_id`, `media_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_edits` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `message_id` BIGINT UNSIGNED NOT NULL,
    `old_content` TEXT NOT NULL,
    `edited_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `message_edits_message_id_idx`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `actor_id` BIGINT UNSIGNED NULL,
    `type` VARCHAR(100) NOT NULL,
    `data` JSON NULL,
    `entity_id` BIGINT UNSIGNED NULL,
    `entity_type` VARCHAR(50) NULL,
    `unique_key` VARCHAR(255) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `notifications_unique_key_key`(`unique_key`),
    INDEX `notifications_user_id_is_read_idx`(`user_id`, `is_read`),
    INDEX `notifications_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_posts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `post_id` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `saved_posts_user_id_post_id_key`(`user_id`, `post_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `search_history` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `query` VARCHAR(255) NOT NULL,
    `search_type` ENUM('users', 'posts', 'groups') NOT NULL DEFAULT 'posts',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `search_history_user_id_idx`(`user_id`),
    UNIQUE INDEX `search_history_user_id_query_search_type_key`(`user_id`, `query`, `search_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mentions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `mentioned_in_type` VARCHAR(50) NOT NULL,
    `mentioned_in_id` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `mentions_user_id_idx`(`user_id`),
    INDEX `mentions_mentioned_in_type_mentioned_in_id_idx`(`mentioned_in_type`, `mentioned_in_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hashtags` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NULL,
    `name_lower` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `hashtags_name_lower_key`(`name_lower`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_hashtags` (
    `post_id` BIGINT UNSIGNED NOT NULL,
    `hashtag_id` BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (`post_id`, `hashtag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hashtag_relations` (
    `source_id` BIGINT UNSIGNED NOT NULL,
    `target_id` BIGINT UNSIGNED NOT NULL,
    `weight` DOUBLE NOT NULL DEFAULT 0,
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `hashtag_relations_source_id_weight_idx`(`source_id`, `weight`),
    INDEX `hashtag_relations_target_id_weight_idx`(`target_id`, `weight`),
    PRIMARY KEY (`source_id`, `target_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_interactions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `post_id` BIGINT UNSIGNED NOT NULL,
    `interaction_type` ENUM('view', 'click', 'like', 'comment', 'share', 'save', 'hide') NOT NULL,
    `watch_time` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `user_interactions_user_id_post_id_idx`(`user_id`, `post_id`),
    INDEX `user_interactions_user_id_interaction_type_idx`(`user_id`, `interaction_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trending_scores` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT UNSIGNED NOT NULL,
    `score` DOUBLE NOT NULL,
    `region` VARCHAR(100) NOT NULL,
    `calculated_at` TIMESTAMP(0) NOT NULL,

    INDEX `trending_scores_region_score_idx`(`region`, `score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_relationship_scores` (
    `user_id` BIGINT UNSIGNED NOT NULL,
    `target_user_id` BIGINT UNSIGNED NOT NULL,
    `score` DOUBLE NOT NULL,
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`user_id`, `target_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_interests` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `interest` VARCHAR(100) NOT NULL,
    `score` DOUBLE NOT NULL,
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `user_interests_user_id_interest_key`(`user_id`, `interest`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_categories` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_category_map` (
    `post_id` BIGINT UNSIGNED NOT NULL,
    `category_id` BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (`post_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `groups` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `privacy` ENUM('public', 'private', 'hidden') NOT NULL DEFAULT 'public',
    `avatar_media_id` BIGINT UNSIGNED NULL,
    `cover_media_id` BIGINT UNSIGNED NULL,
    `creator_id` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `posts_need_approval` BOOLEAN NOT NULL DEFAULT false,

    INDEX `groups_creator_id_idx`(`creator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_members` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `group_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role` ENUM('admin', 'moderator', 'member') NOT NULL DEFAULT 'member',
    `status` ENUM('pending', 'approved', 'banned') NOT NULL DEFAULT 'approved',
    `joined_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `group_members_user_id_idx`(`user_id`),
    INDEX `group_members_group_id_status_idx`(`group_id`, `status`),
    UNIQUE INDEX `group_members_group_id_user_id_key`(`group_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_group_affinities` (
    `user_id` BIGINT UNSIGNED NOT NULL,
    `group_id` BIGINT UNSIGNED NOT NULL,
    `score` DOUBLE NOT NULL DEFAULT 0,
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `user_group_affinities_user_id_score_idx`(`user_id`, `score`),
    PRIMARY KEY (`user_id`, `group_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dlq_jobs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sourceQueue` VARCHAR(100) NOT NULL,
    `jobName` VARCHAR(100) NOT NULL,
    `jobData` JSON NOT NULL,
    `failureReason` TEXT NOT NULL,
    `failureCount` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_retry_at` TIMESTAMP(0) NULL,
    `resolved_at` TIMESTAMP(0) NULL,

    INDEX `dlq_jobs_sourceQueue_resolved_at_idx`(`sourceQueue`, `resolved_at`),
    INDEX `dlq_jobs_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hidden_posts` (
    `user_id` BIGINT UNSIGNED NOT NULL,
    `post_id` BIGINT UNSIGNED NOT NULL,

    INDEX `hidden_posts_post_id_idx`(`post_id`),
    PRIMARY KEY (`user_id`, `post_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_avatar_media_id_fkey` FOREIGN KEY (`avatar_media_id`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_cover_media_id_fkey` FOREIGN KEY (`cover_media_id`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_privacy` ADD CONSTRAINT `user_privacy_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media` ADD CONSTRAINT `media_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_shared_post_id_fkey` FOREIGN KEY (`shared_post_id`) REFERENCES `posts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_media` ADD CONSTRAINT `post_media_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_media` ADD CONSTRAINT `post_media_media_id_fkey` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_allowed_users` ADD CONSTRAINT `post_allowed_users_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_allowed_users` ADD CONSTRAINT `post_allowed_users_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_edits` ADD CONSTRAINT `post_edits_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment_edits` ADD CONSTRAINT `comment_edits_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reactions` ADD CONSTRAINT `reactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_user_id_1_fkey` FOREIGN KEY (`user_id_1`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_user_id_2_fkey` FOREIGN KEY (`user_id_2`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_blocker_id_fkey` FOREIGN KEY (`blocker_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_blocked_id_fkey` FOREIGN KEY (`blocked_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_avatar_media_id_fkey` FOREIGN KEY (`avatar_media_id`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_last_read_message_id_fkey` FOREIGN KEY (`last_read_message_id`) REFERENCES `messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_reply_to_id_fkey` FOREIGN KEY (`reply_to_id`) REFERENCES `messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_media_id_fkey` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_edits` ADD CONSTRAINT `message_edits_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_posts` ADD CONSTRAINT `saved_posts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_posts` ADD CONSTRAINT `saved_posts_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `search_history` ADD CONSTRAINT `search_history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mentions` ADD CONSTRAINT `mentions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_hashtags` ADD CONSTRAINT `post_hashtags_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_hashtags` ADD CONSTRAINT `post_hashtags_hashtag_id_fkey` FOREIGN KEY (`hashtag_id`) REFERENCES `hashtags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hashtag_relations` ADD CONSTRAINT `hashtag_relations_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `hashtags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hashtag_relations` ADD CONSTRAINT `hashtag_relations_target_id_fkey` FOREIGN KEY (`target_id`) REFERENCES `hashtags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_interactions` ADD CONSTRAINT `user_interactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_interactions` ADD CONSTRAINT `user_interactions_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trending_scores` ADD CONSTRAINT `trending_scores_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_relationship_scores` ADD CONSTRAINT `user_relationship_scores_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_relationship_scores` ADD CONSTRAINT `user_relationship_scores_target_user_id_fkey` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_interests` ADD CONSTRAINT `user_interests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_category_map` ADD CONSTRAINT `post_category_map_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_category_map` ADD CONSTRAINT `post_category_map_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `post_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_avatar_media_id_fkey` FOREIGN KEY (`avatar_media_id`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_cover_media_id_fkey` FOREIGN KEY (`cover_media_id`) REFERENCES `media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_group_affinities` ADD CONSTRAINT `user_group_affinities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_group_affinities` ADD CONSTRAINT `user_group_affinities_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hidden_posts` ADD CONSTRAINT `hidden_posts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hidden_posts` ADD CONSTRAINT `hidden_posts_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
