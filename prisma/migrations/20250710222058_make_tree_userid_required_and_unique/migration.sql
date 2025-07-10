/*
  Warnings:

  - A unique constraint covering the columns `[id,userId]` on the table `Tree` will be added. If there are existing duplicate values, this will fail.
  - Made the column `userId` on table `Tree` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Tree" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tree_id_userId_key" ON "Tree"("id", "userId");
