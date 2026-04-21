-- AlterTable
ALTER TABLE `posts` ADD COLUMN `shared_post_id` BIGINT UNSIGNED NULL;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_shared_post_id_fkey` FOREIGN KEY (`shared_post_id`) REFERENCES `posts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
