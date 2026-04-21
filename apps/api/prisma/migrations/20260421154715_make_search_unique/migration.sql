/*
  Warnings:

  - A unique constraint covering the columns `[user_id,query,search_type]` on the table `search_history` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `search_history_user_id_query_search_type_key` ON `search_history`(`user_id`, `query`, `search_type`);
