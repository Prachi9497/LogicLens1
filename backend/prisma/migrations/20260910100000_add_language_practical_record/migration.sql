-- CreateEnum
CREATE TYPE "Language" AS ENUM ('C', 'CPP', 'JAVA', 'PYTHON');

-- AlterTable
ALTER TABLE "Problem"
ADD COLUMN "language" "Language" NOT NULL DEFAULT 'C';

-- CreateTable
CREATE TABLE "PracticalRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "output" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticalRecord_studentId_problemId_key"
ON "PracticalRecord"("studentId", "problemId");

-- CreateIndex
CREATE INDEX "PracticalRecord_studentId_idx"
ON "PracticalRecord"("studentId");

-- CreateIndex
CREATE INDEX "PracticalRecord_roomId_idx"
ON "PracticalRecord"("roomId");

-- AddForeignKey
ALTER TABLE "PracticalRecord"
ADD CONSTRAINT "PracticalRecord_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalRecord"
ADD CONSTRAINT "PracticalRecord_problemId_fkey"
FOREIGN KEY ("problemId") REFERENCES "Problem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticalRecord"
ADD CONSTRAINT "PracticalRecord_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
