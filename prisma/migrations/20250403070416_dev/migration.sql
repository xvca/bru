-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "roaster" TEXT,
    "origin" TEXT,
    "roast_level" TEXT,
    "roast_date" TIMESTAMP(3) NOT NULL,
    "freeze_date" TIMESTAMP(3),
    "initial_weight" DOUBLE PRECISION NOT NULL,
    "remaining_weight" DOUBLE PRECISION,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grinders" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "burr_type" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "grinders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brew_methods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "brew_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brew_bars" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brew_bars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brew_bar_members" (
    "id" SERIAL NOT NULL,
    "bar_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT,

    CONSTRAINT "brew_bar_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brew_bar_equipment" (
    "id" SERIAL NOT NULL,
    "bar_id" INTEGER NOT NULL,
    "equipment_id" INTEGER,
    "grinder_id" INTEGER,

    CONSTRAINT "brew_bar_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "bean_id" INTEGER NOT NULL,
    "method_id" INTEGER NOT NULL,
    "grinder_id" INTEGER,
    "equipment_id" INTEGER,
    "bar_id" INTEGER,
    "brew_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dose_weight" DOUBLE PRECISION NOT NULL,
    "yield_weight" DOUBLE PRECISION,
    "brew_time" INTEGER,
    "grind_size" TEXT,
    "water_temperature" DOUBLE PRECISION,
    "bloom_time" INTEGER,
    "pour_pattern" TEXT,
    "rating" SMALLINT DEFAULT 0,
    "tasting_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "brew_bar_members_bar_id_user_id_key" ON "brew_bar_members"("bar_id", "user_id");

-- AddForeignKey
ALTER TABLE "beans" ADD CONSTRAINT "beans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grinders" ADD CONSTRAINT "grinders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brew_bar_members" ADD CONSTRAINT "brew_bar_members_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brew_bar_members" ADD CONSTRAINT "brew_bar_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brew_bar_equipment" ADD CONSTRAINT "brew_bar_equipment_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brew_bar_equipment" ADD CONSTRAINT "brew_bar_equipment_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brew_bar_equipment" ADD CONSTRAINT "brew_bar_equipment_grinder_id_fkey" FOREIGN KEY ("grinder_id") REFERENCES "grinders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brews" ADD CONSTRAINT "brews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brews" ADD CONSTRAINT "brews_bean_id_fkey" FOREIGN KEY ("bean_id") REFERENCES "beans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brews" ADD CONSTRAINT "brews_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "brew_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brews" ADD CONSTRAINT "brews_grinder_id_fkey" FOREIGN KEY ("grinder_id") REFERENCES "grinders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brews" ADD CONSTRAINT "brews_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brews" ADD CONSTRAINT "brews_bar_id_fkey" FOREIGN KEY ("bar_id") REFERENCES "brew_bars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
