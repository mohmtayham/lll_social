-- AlterTable
ALTER TABLE `posts` ADD COLUMN `global_score` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `user_interests` ADD COLUMN `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

-- AlterTable
ALTER TABLE `user_relationship_scores` ADD COLUMN `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

-- CreateTable
CREATE TABLE `user_group_affinities` (
    `user_id` BIGINT UNSIGNED NOT NULL,
    `group_id` BIGINT UNSIGNED NOT NULL,
    `score` DOUBLE NOT NULL DEFAULT 0,
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `user_group_affinities_user_id_score_idx`(`user_id`, `score`),
    PRIMARY KEY (`user_id`, `group_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_group_affinities` ADD CONSTRAINT `user_group_affinities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_group_affinities` ADD CONSTRAINT `user_group_affinities_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
