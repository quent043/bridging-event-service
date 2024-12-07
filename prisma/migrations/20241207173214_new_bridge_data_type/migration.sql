/*
  Warnings:

  - The values [token,chain] on the enum `BridgeDataType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BridgeDataType_new" AS ENUM ('TOKEN_VOLUME', 'CHAIN_VOLUME', 'BRIDGE_USE_COUNT');
ALTER TABLE "processed_bridge_data" ALTER COLUMN "type" TYPE "BridgeDataType_new" USING ("type"::text::"BridgeDataType_new");
ALTER TYPE "BridgeDataType" RENAME TO "BridgeDataType_old";
ALTER TYPE "BridgeDataType_new" RENAME TO "BridgeDataType";
DROP TYPE "BridgeDataType_old";
COMMIT;
