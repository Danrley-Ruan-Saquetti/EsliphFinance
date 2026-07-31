CREATE TYPE "public"."asset_group_type" AS ENUM('DEFAULT', 'CREDIT_CARD');--> statement-breakpoint
CREATE TABLE "asset_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "asset_group_type" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "asset_groups" ADD CONSTRAINT "asset_groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_groups_owner_id_index" ON "asset_groups" USING btree ("owner_id");