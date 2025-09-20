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

-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('INR', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "public"."EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "public"."NoticePeriod" AS ENUM ('IMMEDIATE', 'WITHIN_15_DAYS', 'WITHIN_30_DAYS', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "public"."CompanyType" AS ENUM ('EARLY_STAGE_STARTUP', 'GROWTH_STAGE_STARTUP', 'UNICORN', 'PUBLIC', 'MNC', 'NON_PROFIT');

-- CreateEnum
CREATE TYPE "public"."CTCType" AS ENUM ('RANGE', 'COMPETITIVE', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "public"."ApplicationStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

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
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Applicant" (
    "id" UUID NOT NULL,
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
    "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
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

    CONSTRAINT "Recruiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Education" (
    "id" TEXT NOT NULL,
    "applicantId" UUID NOT NULL,
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
    "applicantId" UUID NOT NULL,
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
    "companyType" "public"."CompanyType",

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."Job" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT[],
    "location" TEXT NOT NULL,
    "ctcType" "public"."CTCType" NOT NULL DEFAULT 'RANGE',
    "minCTC" DOUBLE PRECISION,
    "maxCTC" DOUBLE PRECISION,
    "currency" "public"."Currency" NOT NULL DEFAULT 'INR',
    "minExperience" DOUBLE PRECISION NOT NULL,
    "maxExperience" DOUBLE PRECISION NOT NULL,
    "employmentType" "public"."EmploymentType" NOT NULL,
    "jobType" "public"."JobType" NOT NULL,
    "openings" INTEGER NOT NULL,
    "relocationAssistance" BOOLEAN NOT NULL DEFAULT false,
    "visaSponsorship" BOOLEAN NOT NULL DEFAULT false,
    "noticePeriod" "public"."NoticePeriod",
    "durationInMonths" INTEGER,
    "benefits" TEXT[],
    "applicationDeadline" TIMESTAMP(3),
    "companyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Application" (
    "id" UUID NOT NULL,
    "applicantId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "resume" TEXT,
    "coverLetter" TEXT,
    "portfolioUrl" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eviewedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_userId_key" ON "public"."Applicant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Recruiter_userId_key" ON "public"."Recruiter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterCompany_recruiterId_companyId_key" ON "public"."RecruiterCompany"("recruiterId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_applicantId_jobId_key" ON "public"."Application"("applicantId", "jobId");

-- AddForeignKey
ALTER TABLE "public"."Applicant" ADD CONSTRAINT "Applicant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recruiter" ADD CONSTRAINT "Recruiter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Education" ADD CONSTRAINT "Education_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Experience" ADD CONSTRAINT "Experience_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruiterCompany" ADD CONSTRAINT "RecruiterCompany_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "public"."Recruiter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruiterCompany" ADD CONSTRAINT "RecruiterCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
