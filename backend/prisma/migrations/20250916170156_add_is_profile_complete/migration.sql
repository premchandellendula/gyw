-- AlterTable
ALTER TABLE "public"."Applicant" ADD COLUMN     "isProfileComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "lastLogin" DROP NOT NULL;
