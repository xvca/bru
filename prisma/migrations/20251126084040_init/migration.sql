-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "beans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "roaster" TEXT,
    "origin" TEXT,
    "roast_level" TEXT,
    "roast_date" DATETIME NOT NULL,
    "freeze_date" DATETIME,
    "initial_weight" REAL NOT NULL,
    "remaining_weight" REAL,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "beans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "grinders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "burr_type" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    CONSTRAINT "grinders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    CONSTRAINT "equipment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "brew_methods" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "brew_bars" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "brew_bar_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bar_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT,
    CONSTRAINT "brew_bar_members_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brew_bar_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "brew_bar_equipment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bar_id" INTEGER NOT NULL,
    "equipment_id" INTEGER,
    "grinder_id" INTEGER,
    CONSTRAINT "brew_bar_equipment_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brew_bar_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "brew_bar_equipment_grinder_id_fkey" FOREIGN KEY ("grinder_id") REFERENCES "grinders" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "brews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "bean_id" INTEGER NOT NULL,
    "method_id" INTEGER NOT NULL,
    "grinder_id" INTEGER,
    "equipment_id" INTEGER,
    "bar_id" INTEGER,
    "brew_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dose_weight" REAL NOT NULL,
    "yield_weight" REAL,
    "brew_time" INTEGER,
    "grind_size" TEXT,
    "water_temperature" REAL,
    "bloom_time" INTEGER,
    "pour_pattern" TEXT,
    "rating" INTEGER DEFAULT 0,
    "tasting_notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brews_bean_id_fkey" FOREIGN KEY ("bean_id") REFERENCES "beans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brews_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "brew_methods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "brews_grinder_id_fkey" FOREIGN KEY ("grinder_id") REFERENCES "grinders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "brews_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "brews_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "brew_bar_members_bar_id_user_id_key" ON "brew_bar_members"("bar_id", "user_id");
