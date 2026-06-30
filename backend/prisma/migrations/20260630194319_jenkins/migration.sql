-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "repositoryUrl" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "framework" TEXT NOT NULL DEFAULT 'React',
    "buildCommand" TEXT,
    "startCommand" TEXT,
    "useJenkins" BOOLEAN NOT NULL DEFAULT false,
    "jenkinsUrl" TEXT,
    "jenkinsUser" TEXT,
    "jenkinsToken" TEXT,
    "jenkinsJobName" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Project" ("branch", "buildCommand", "createdAt", "framework", "id", "name", "repositoryUrl", "startCommand", "updatedAt", "userId") SELECT "branch", "buildCommand", "createdAt", "framework", "id", "name", "repositoryUrl", "startCommand", "updatedAt", "userId" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
