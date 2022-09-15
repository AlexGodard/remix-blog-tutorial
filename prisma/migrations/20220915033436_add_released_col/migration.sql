-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TicketSale" (
    "seat" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "matchId" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "released" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("seat", "matchId")
);
INSERT INTO "new_TicketSale" ("createdAt", "matchId", "seat", "section", "updatedAt") SELECT "createdAt", "matchId", "seat", "section", "updatedAt" FROM "TicketSale";
DROP TABLE "TicketSale";
ALTER TABLE "new_TicketSale" RENAME TO "TicketSale";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
