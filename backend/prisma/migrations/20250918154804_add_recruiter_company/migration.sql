/*
  Warnings:

  - You are about to drop the column `companyId` on the `Recruiter` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Recruiter" DROP CONSTRAINT "Recruiter_companyId_fkey";

-- AlterTable
ALTER TABLE "public"."Recruiter" DROP COLUMN "companyId";

-- CreateTable
CREATE TABLE "public"."RecruiterCompany" (
    "id" UUID NOT NULL,
    "recruiterId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "RecruiterCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterCompany_recruiterId_companyId_key" ON "public"."RecruiterCompany"("recruiterId", "companyId");

-- AddForeignKey
ALTER TABLE "public"."RecruiterCompany" ADD CONSTRAINT "RecruiterCompany_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "public"."Recruiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruiterCompany" ADD CONSTRAINT "RecruiterCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
