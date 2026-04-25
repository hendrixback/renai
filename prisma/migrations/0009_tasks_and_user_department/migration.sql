-- Migration: 0009_tasks_and_user_department
--
-- WHAT:
--   Adds the Task table + TaskPriority/TaskStatus enums per Spec §18,
--   and a nullable `department` column on User per Spec §17.4.
--
-- WHY:
--   Phase 4c (Team Overview + Tasks). Tasks unlock the Dashboard
--   "Open tasks" widget, the Team Overview per-user task counts, and
--   the cross-module "Related tasks" sections. Overdue is *derived*
--   (status in (OPEN, IN_PROGRESS) && dueDate < now) — not a stored
--   value — to avoid the dual-source-of-truth + sweeper-cron problem.
--
-- SAFETY:
--   Zero-downtime. New table + new optional column with no default
--   change to existing rows. No index rebuild on existing data.
--
-- ROLLBACK:
--   ALTER TABLE "User" DROP COLUMN "department";
--   DROP TABLE "Task";
--   DROP TYPE "TaskStatus";
--   DROP TYPE "TaskPriority";

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "department" TEXT;

-- CreateIndex
CREATE INDEX "User_department_idx" ON "User"("department");

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "assignedById" TEXT,
    "relatedModule" TEXT,
    "relatedRecordId" TEXT,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_companyId_status_idx" ON "Task"("companyId", "status");

-- CreateIndex
CREATE INDEX "Task_companyId_assignedToId_status_idx" ON "Task"("companyId", "assignedToId", "status");

-- CreateIndex
CREATE INDEX "Task_companyId_dueDate_idx" ON "Task"("companyId", "dueDate");

-- CreateIndex
CREATE INDEX "Task_companyId_relatedModule_relatedRecordId_idx" ON "Task"("companyId", "relatedModule", "relatedRecordId");

-- CreateIndex
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
