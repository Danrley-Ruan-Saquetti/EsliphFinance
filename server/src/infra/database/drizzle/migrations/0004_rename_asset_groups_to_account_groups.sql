ALTER TYPE "public"."asset_group_type" RENAME TO "account_group_type";--> statement-breakpoint
ALTER TABLE "asset_groups" RENAME TO "account_groups";--> statement-breakpoint
ALTER TABLE "account_groups" RENAME CONSTRAINT "asset_groups_owner_id_users_id_fk" TO "account_groups_owner_id_users_id_fk";--> statement-breakpoint
ALTER INDEX "asset_groups_pkey" RENAME TO "account_groups_pkey";--> statement-breakpoint
ALTER INDEX "asset_groups_owner_id_index" RENAME TO "account_groups_owner_id_index";
