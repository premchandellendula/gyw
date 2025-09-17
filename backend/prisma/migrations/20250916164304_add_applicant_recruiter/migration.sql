-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('RECRUITER', 'APPLICANT');

-- CreateEnum
CREATE TYPE "public"."PreferredRole" AS ENUM ('FULL_TIME', 'PART_TIME', 'INTERN', 'CONTRACT', 'FREELANCE', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."Pronouns" AS ENUM ('HE_HIM', 'SHE_HER', 'THEY_THEM', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "public"."Race" AS ENUM ('ASIAN', 'BLACK_OR_AFRICAN_AMERICAN', 'HISPANIC_OR_LATINO', 'NATIVE_AMERICAN', 'WHITE', 'MIDDLE_EASTERN', 'PACIFIC_ISLANDER', 'MIXED', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "public"."Availability" AS ENUM ('IMMEDIATELY', 'ONE_WEEK', 'TWO_WEEKS', 'ONE_MONTH', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "public"."CompanySize" AS ENUM ('SELF_EMPLOYED', 'SIZE_2_10', 'SIZE_11_50', 'SIZE_51_200', 'SIZE_201_500', 'SIZE_501_1000', 'SIZE_1001_5000', 'SIZE_5001_10000', 'SIZE_10000_PLUS');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'APPLICANT',
    "phoneNumber" TEXT,
    "profilePicture" TEXT NOT NULL DEFAULT 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jp',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Applicant" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "bio" TEXT,
    "resumeUrl" TEXT,
    "location" TEXT,
    "yearsOfExperience" INTEGER,
    "achievements" TEXT,
    "skills" TEXT[],
    "availability" "public"."Availability",
    "preferredRole" "public"."PreferredRole",
    "preferredLocations" TEXT[],
    "isWillingToRelocate" BOOLEAN,
    "gender" "public"."Gender",
    "pronouns" "public"."Pronouns",
    "race" "public"."Race",
    "currentSalary" DECIMAL(10,2),
    "expectedSalary" DECIMAL(10,2),
    "linkedInUrl" TEXT,
    "portfolioUrl" TEXT,
    "githubUrl" TEXT,
    "twitterUrl" TEXT,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Recruiter" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "positionTitle" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "linkdedinUrl" TEXT,
    "department" TEXT,
    "companyId" UUID NOT NULL,

    CONSTRAINT "Recruiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Education" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "fieldOfStudy" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "grade" TEXT,
    "description" TEXT,

    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Experience" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "description" TEXT,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "companySize" "public"."CompanySize",
    "headquarters" TEXT,
    "foundedYear" INTEGER,
    "description" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_userId_key" ON "public"."Applicant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Recruiter_userId_key" ON "public"."Recruiter"("userId");

-- AddForeignKey
ALTER TABLE "public"."Applicant" ADD CONSTRAINT "Applicant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recruiter" ADD CONSTRAINT "Recruiter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recruiter" ADD CONSTRAINT "Recruiter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Education" ADD CONSTRAINT "Education_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Experience" ADD CONSTRAINT "Experience_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
