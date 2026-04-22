/*
  Warnings:

  - You are about to drop the `scheduled_post_media` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `scheduled_posts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `scheduled_post_media` DROP FOREIGN KEY `scheduled_post_media_media_id_fkey`;

-- DropForeignKey
ALTER TABLE `scheduled_post_media` DROP FOREIGN KEY `scheduled_post_media_scheduled_post_id_fkey`;

-- DropForeignKey
ALTER TABLE `scheduled_posts` DROP FOREIGN KEY `scheduled_posts_user_id_fkey`;

-- AlterTable
ALTER TABLE `posts` ADD COLUMN `status` ENUM('DIRECT', 'pending', 'published', 'cancelled') NULL,
    ADD COLUMN `views_count` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `scheduled_post_media`;

-- DropTable
DROP TABLE `scheduled_posts`;
