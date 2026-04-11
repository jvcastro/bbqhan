-- AlterTable
ALTER TABLE "Order" ADD COLUMN "stockBusinessDate" DATE;

UPDATE "Order"
SET "stockBusinessDate" = (timezone('Asia/Manila', "createdAt"))::date;

ALTER TABLE "Order" ALTER COLUMN "stockBusinessDate" SET NOT NULL;
