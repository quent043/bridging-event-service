-- CreateEnum
CREATE TYPE "BridgeDataType" AS ENUM ('token', 'chain');

-- CreateTable
CREATE TABLE "bridge_events" (
    "id" SERIAL NOT NULL,
    "amount" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "toChainId" INTEGER NOT NULL,
    "bridgeName" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "blockNumber" TEXT NOT NULL,
    "transactionhash" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bridge_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_bridge_data" (
    "id" SERIAL NOT NULL,
    "type" "BridgeDataType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "volumeChange" TEXT NOT NULL,
    "totalVolume" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_bridge_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processed_bridge_data_type_referenceId_idx" ON "processed_bridge_data"("type", "referenceId");
