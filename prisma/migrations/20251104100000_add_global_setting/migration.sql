-- Create a simple key/value store for global settings (e.g., session versioning).
CREATE TABLE "GlobalSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalSetting_pkey" PRIMARY KEY ("key")
);
