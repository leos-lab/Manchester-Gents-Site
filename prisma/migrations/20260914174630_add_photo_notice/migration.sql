-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photoNoticeAgreedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PhotoNoticeConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoNoticeConfig_pkey" PRIMARY KEY ("id")
);
