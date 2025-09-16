/*
  Warnings:

  - You are about to drop the column `player1Hits` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `player1Misses` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `player1Score` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `player2Hits` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `player2Misses` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `player2Score` on the `Match` table. All the data in the column will be lost.
  - Added the required column `mode` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team1Score` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team2Score` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `winnerTeam` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationInSeconds" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "player1Id" INTEGER NOT NULL,
    "player3Id" INTEGER,
    "player2Id" INTEGER NOT NULL,
    "player4Id" INTEGER,
    "team1Score" INTEGER NOT NULL,
    "team2Score" INTEGER NOT NULL,
    "winnerTeam" INTEGER NOT NULL,
    "wasForfeit" BOOLEAN NOT NULL DEFAULT false,
    "winnerId" INTEGER NOT NULL,
    "team1Hits" INTEGER NOT NULL DEFAULT 0,
    "team1Misses" INTEGER NOT NULL DEFAULT 0,
    "team2Hits" INTEGER NOT NULL DEFAULT 0,
    "team2Misses" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Match_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_player3Id_fkey" FOREIGN KEY ("player3Id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_player4Id_fkey" FOREIGN KEY ("player4Id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("createdAt", "durationInSeconds", "id", "player1Id", "player2Id", "winnerId") SELECT "createdAt", "durationInSeconds", "id", "player1Id", "player2Id", "winnerId" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
