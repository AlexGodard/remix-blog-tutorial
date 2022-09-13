-- CreateTable
CREATE TABLE "MatchStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "ticketsLeft" INTEGER NOT NULL,
    "ticketsLeftIn132" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
