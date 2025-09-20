/*
  Warnings:

  - Changed the type of `role` on the `Job` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."Job" DROP COLUMN "role",
ADD COLUMN     "role" "public"."JobRole" NOT NULL;
