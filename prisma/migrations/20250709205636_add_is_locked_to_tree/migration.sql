/*
  Warnings:

  - You are about to drop the column `sourceHandle` on the `Relationship` table. All the data in the column will be lost.
  - You are about to drop the column `targetHandle` on the `Relationship` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Relationship" DROP COLUMN "sourceHandle",
DROP COLUMN "targetHandle";

-- AlterTable
ALTER TABLE "Tree" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;
