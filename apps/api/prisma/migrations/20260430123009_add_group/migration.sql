-- AlterTable
ALTER TABLE `posts` ADD COLUMN `group_id` BIGINT UNSIGNED NULL,
    MODIFY `status` ENUM('DIRECT', 'pending', 'published', 'cancelled') NULL DEFAULT 'DIRECT';

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

-- CreateIndex
CREATE INDEX `posts_group_id_idx` ON `posts`(`group_id`);

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
