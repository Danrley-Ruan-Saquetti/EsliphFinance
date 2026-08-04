CREATE TYPE "public"."category_nature" AS ENUM('INCOME', 'EXPENSE', 'BOTH');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"nature" "category_nature" NOT NULL,
	"icon" varchar(60) NOT NULL,
	"color" char(7) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_owner_id_index" ON "categories" USING btree ("owner_id");