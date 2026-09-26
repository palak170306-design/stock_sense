-- AlterTable
ALTER TABLE "StockMove" ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "doneAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StockDocument" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "MoveStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT NOT NULL DEFAULT '',
    "sourceLocationId" TEXT,
    "destLocationId" TEXT,
    "recordedQuantity" INTEGER,
    "countedQuantity" INTEGER,
    "createdById" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSequence" (
    "prefix" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("prefix")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockDocument_reference_key" ON "StockDocument"("reference");

-- CreateIndex
CREATE INDEX "StockDocument_type_status_idx" ON "StockDocument"("type", "status");

-- CreateIndex
CREATE INDEX "StockDocument_createdAt_idx" ON "StockDocument"("createdAt");

-- CreateIndex
CREATE INDEX "StockMove_documentId_idx" ON "StockMove"("documentId");

-- CreateIndex
CREATE INDEX "StockMove_createdAt_idx" ON "StockMove"("createdAt");

-- CreateIndex
CREATE INDEX "StockMove_documentType_status_idx" ON "StockMove"("documentType", "status");

-- AddForeignKey
ALTER TABLE "StockDocument" ADD CONSTRAINT "StockDocument_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocument" ADD CONSTRAINT "StockDocument_destLocationId_fkey" FOREIGN KEY ("destLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocument" ADD CONSTRAINT "StockDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockDocument" ADD CONSTRAINT "StockDocument_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StockDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: moves that were already DONE (seed data) changed stock when they
-- were created, so that is their effective date.
UPDATE "StockMove" SET "doneAt" = "createdAt" WHERE "status" = 'DONE' AND "doneAt" IS NULL;

-- Every DONE move must record when it happened; the ledger dates by this.
ALTER TABLE "StockMove" ADD CONSTRAINT "StockMove_done_has_doneAt" CHECK ("status" <> 'DONE' OR "doneAt" IS NOT NULL);

-- Adjustment snapshots are physical counts / on-hand figures.
ALTER TABLE "StockDocument" ADD CONSTRAINT "StockDocument_counted_nonnegative" CHECK ("countedQuantity" IS NULL OR "countedQuantity" >= 0);
