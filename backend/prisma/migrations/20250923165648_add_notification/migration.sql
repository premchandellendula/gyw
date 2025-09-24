-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('APPLICATION_SUBMITTED', 'APPLICATION_REJECTED', 'APPLICATION_VIEWED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_RESCHEDULED', 'INTERVIEW_CANCELLED', 'DOCUMENT_REQUEST', 'PROFILE_INCOMPLETE', 'SYSTEM_UPDATE', 'MESSAGE_RECEIVED', 'FEATURE_ANNOUNCEMENT', 'NEW_APPLICATION', 'APPLICATION_WITHDRAWN', 'INTERVIEW_CONFIRMED');

-- CreateEnum
CREATE TYPE "public"."NotificationCategory" AS ENUM ('APPLICATION', 'INTERVIEW', 'ACCOUNT', 'SYSTEM', 'MESSAGE', 'ENGAGEMENT');

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "profilePicture" SET DEFAULT 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg';

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notificationType" "public"."NotificationType" NOT NULL,
    "notificationCategory" "public"."NotificationCategory" NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
