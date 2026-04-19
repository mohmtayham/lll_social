/*
  Warnings:

  - You are about to drop the `model_has_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `model_has_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `model_has_permissions` DROP FOREIGN KEY `model_has_permissions_permission_id_fkey`;

-- DropForeignKey
ALTER TABLE `model_has_roles` DROP FOREIGN KEY `model_has_roles_role_id_fkey`;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('user', 'admin', 'editor', 'moderator') NOT NULL DEFAULT 'user';

-- DropTable
DROP TABLE `model_has_permissions`;

-- DropTable
DROP TABLE `model_has_roles`;

-- DropTable
DROP TABLE `permissions`;

-- DropTable
DROP TABLE `roles`;
