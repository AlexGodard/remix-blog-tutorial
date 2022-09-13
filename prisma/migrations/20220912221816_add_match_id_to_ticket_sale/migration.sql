-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TicketSale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seat" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "matchId" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TicketSale" ("createdAt", "id", "seat", "section", "updatedAt") SELECT "createdAt", "id", "seat", "section", "updatedAt" FROM "TicketSale";
DROP TABLE "TicketSale";
ALTER TABLE "new_TicketSale" RENAME TO "TicketSale";
CREATE UNIQUE INDEX "TicketSale_seat_key" ON "TicketSale"("seat");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
